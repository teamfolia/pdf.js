import { FOLIA_LAYER_ROLES } from "../folia-page-layer";
import FoliaBaseAnnotation from "./base-annotation";
import conversationPanelTemplate from "raw-loader!../css/comments/conversation-panel-template.html";
import conversationBuilderTemplate from "raw-loader!../css/comments/conversation-builder-template.html";
import moment from "moment";
import * as uuid from "uuid";
import { ANNOTATION_TYPES } from "../constants";

class FoliaConversationAnnotation extends FoliaBaseAnnotation {
  editablePropertiesList = [];
  hasNoToolbar = true;
  editable = true;
  showMore = false;
  newbie = false;

  constructor(...props) {
    super(...props);
    this.annotationDIV.classList.add("conversation");
  }

  getRawData() {
    // const { initial_comment, edited } = this.annotationRawData;
    // if (!initial_comment) return;
    // const viewRect = [
    //   this.annotationDIV.offsetLeft,
    //   this.annotationDIV.offsetTop,
    //   this.annotationDIV.clientWidth,
    //   this.annotationDIV.clientHeight,
    // ];
    // const pdfRect = viewRect2pdfRect(viewRect, this.viewport);
    // return {
    //   type: ANNOTATION_TYPES.COMMENT,
    //   ...super.getRawData(),
    //   rect: pdfRect,
    //   initial_comment,
    //   edited,
    // };
  }
  async render() {
    const {
      rect,
      author,
      newbie,
      unRead,
      permissions = {},
      created,
      edited,
      localId,
      initial_comment,
      type,
    } = this.annotationRawData;
    const [left, top] = pdfRect2viewRect(rect, this.viewport);
    this.annotationDIV.style.left = `${left}px`;
    this.annotationDIV.style.top = `${top}px`;
    const user = await this.foliaDataStorage.getUser(author);
    const avatar = document.createElement("div");
    avatar.className = "avatar";
    avatar.setAttribute("data-local-id", `${this.localId}`);
    avatar.setAttribute("data-role", FOLIA_LAYER_ROLES.ANNOTATION_OBJECT);
    this.annotationDIV.appendChild(avatar);
    avatar.style.backgroundImage = `url("${user.avatarUrl}")`;

    if (newbie) {
      const conversationBuilerTemplate = document.createElement("template");
      conversationBuilerTemplate.innerHTML = conversationBuilderTemplate;
      const conversationBuiler = conversationBuilerTemplate.content
        .cloneNode(true)
        .querySelector(".conversation-builder-container");

      this.annotationDIV.appendChild(conversationBuiler);
      console.log("conversationBuiler", conversationBuiler);
      // conversationBuiler.addEventListener('mousedown', e => e.stopPropagation())
      const textArea = conversationBuiler.querySelector(".conversation-builder-textarea");
      textArea.value = this.annotationRawData.initial_comment;
      textArea.oninput = (e) => {
        const convBuilderButtons = conversationBuiler.querySelector(".conversation-builder-buttons");
        const fakeBtn = conversationBuiler.querySelector(".conversation-builder-input-fake-btn");
        textArea.style.height = "auto";
        textArea.style.height = textArea.scrollHeight + "px";
        if (textArea.value.length === 0) {
          convBuilderButtons.classList.add("collapsed");
          fakeBtn.style.display = "block";
        } else {
          convBuilderButtons.classList.remove("collapsed");
          fakeBtn.style.display = "none";
        }
        this.annotationRawData.initial_comment = textArea.value;
        console.log({
          value: textArea.value,
          initial_comment: this.annotationRawData.initial_comment,
        });
      };
      conversationBuiler
        .querySelectorAll('button[data-role="button"],button[data-role="context-menu-button"]')
        .forEach((btn) => (btn.onclick = this.onClick.bind(this)));

      textArea.focus(conversationBuiler);
    } else {
      const conversationBuiler = this.annotationDIV.querySelector(".conversation-builder-container");
      conversationBuiler && conversationBuiler.remove();

      if (unRead) this.annotationDIV.classList.add("unread");
      if (this.withReplies) this.annotationDIV.classList.add("with-replies");

      if (!this.annotationDIV.querySelector(".conversation-container")) {
        this.conversationTemplate = document.createElement("template");
        this.conversationTemplate.innerHTML = conversationPanelTemplate;

        this.conversationPanel = this.conversationTemplate.content
          .cloneNode(true)
          .querySelector(".conversation-container");
        this.annotationDIV.appendChild(this.conversationPanel);
        this.conversationPanel.addEventListener("mousedown", (e) => e.stopPropagation());

        const ctxMenuBtn = this.conversationPanel.querySelector(
          '[data-role-act="conversation-context-menu"]'
        );
        ctxMenuBtn.setAttribute("data-local-id", `${this.localId}`);
      }

      const replyTextArea = this.conversationPanel.querySelector("textarea.conversation-textarea");
      replyTextArea.setAttribute("data-local-id", `${this.localId}`);
      replyTextArea.oninput = (e) => {
        e.target.style.height = "auto";
        e.target.style.height = e.target.scrollHeight + "px";
        const buttonsBlock = e.target.parentNode.querySelector(".footer-buttons");
        e.target.value === ""
          ? buttonsBlock.classList.toggle("collapsed", true)
          : buttonsBlock.classList.toggle("collapsed", false);
        setTimeout(() => this.draw(), 100);
      };
      if (!permissions.canAddReply) {
        replyTextArea.setAttribute("disabled", "");
      }

      this.conversationPanel
        .querySelectorAll('button[data-role="button"],button[data-role="context-menu-button"]')
        .forEach((btn) => (btn.onclick = this.onClick.bind(this)));

      const commentsListEl = this.conversationPanel.querySelector(".conversation-middle");
      await this.renderSingleComment(commentsListEl, {
        author,
        created,
        edited,
        localId,
        type,
        text: initial_comment,
      });

      await this.renderReplies(commentsListEl);
    }
  }
  async renderSingleComment(container, data, collapsed) {
    const { author, created, edited, localId, text, type } = data;
    const user = await this.foliaDataStorage.getUser(author);
    let comment = container.querySelector(`.conversation-reply[data-local-id="${localId}"]`);
    if (!comment) {
      comment = this.conversationPanel
        .querySelector("#comment-item-template")
        .content.cloneNode(true)
        .querySelector(".conversation-reply");
      type === "annotation" ? comment.classList.add("initial", "no-border") : comment.classList.add("reply");
      if (collapsed) comment.classList.add("collapsed");

      comment.setAttribute("data-local-id", `${localId}`);
      comment.querySelectorAll('button[data-role="context-menu-button"]').forEach((btn) => {
        btn.setAttribute(
          "data-role-act",
          type === "annotation" ? "comment-context-menu" : "reply-context-menu"
        );
        btn.setAttribute("data-local-id", `${localId}`);
        btn.onclick = this.onClick.bind(this);
      });
      container.appendChild(comment);
    }

    const header = comment.querySelector(".conversation-reply-header");
    const buttonsBlock = comment.querySelector(".conversation-reply-buttons");
    const textArea = comment.querySelector(".conversation-textarea");
    if (!textArea.hasAttribute("contenteditable")) textArea.innerText = text;
    textArea.oninput = (e) => {
      e.stopPropagation();
      textArea.height = "auto";
      textArea.height = textArea.scrollHeight + "px";
      if (textArea.innerText.length === 0) {
        header.classList.remove("collapsed");
        buttonsBlock.classList.add("collapsed");
      } else {
        header.classList.add("collapsed");
        buttonsBlock.classList.remove("collapsed");
      }
      setTimeout(() => this.draw(), 0);
    };
    header.querySelector(".reply-header-icon").style.backgroundImage = `url("${user.avatarUrl}")`;
    header.querySelector(".reply-header-username").innerText = user.name || user.email;
    header.querySelector(".reply-header-date").innerText = this.formatDate(created);
    buttonsBlock
      .querySelectorAll('button[data-role="button"],button[data-role="context-menu-button"]')
      .forEach((btn) => (btn.onclick = this.onClick.bind(this)));
  }
  renderShowMore(container, collapsed) {
    let showMore = container.querySelector(".conversation-show-more");
    if (!showMore) {
      showMore = this.conversationPanel
        .querySelector("#show-more-template")
        .content.cloneNode(true)
        .querySelector(".conversation-show-more");
      showMore.setAttribute("data-role-act", "show-more");
      if (collapsed) showMore.classList.add("collapsed");
      showMore.onclick = this.onClick.bind(this);
      container.appendChild(showMore);
    }
    showMore.querySelector("span").innerText =
      this.annotationRawData.comments.filter((c) => !c.deleted).length - 2;
  }
  async renderReplies(container) {
    container = container || this.conversationPanel.querySelector(".conversation-middle");
    const comments = (this.annotationRawData.comments || []).filter((comment) => !comment.deleted);
    for (let i = 0; i < comments.length; i++) {
      const comment = comments[i];
      await this.renderSingleComment(container, comment, true);
      if (this.showMoreAvailable) this.renderShowMore(container, true);
    }
    await this.draw();
  }
  async draw() {
    // console.log('draw', this.isSelected, this.showMore)
    if (!this.annotationRawData.newbie) {
      this.isDirty
        ? this.annotationDIV.classList.add("changed")
        : this.annotationDIV.classList.remove("changed");

      this.conversationPanel.style.display = this.isSelected ? "flex" : "none";

      const replyTextArea = this.conversationPanel.querySelector("textarea.conversation-textarea");
      this.annotationRawData.permissions.canAddReply
        ? replyTextArea.removeAttribute("disabled")
        : replyTextArea.setAttribute("disabled", "");

      this.isSelected
        ? this.annotationDIV.classList.add("selected")
        : this.annotationDIV.classList.remove("selected");

      this.withReplies
        ? this.annotationDIV.classList.add("with-replies")
        : this.annotationDIV.classList.remove("with-replies");

      this.annotationRawData.unRead
        ? this.annotationDIV.classList.add("unread")
        : this.annotationDIV.classList.remove("unread");

      const showMoreEls = this.conversationPanel.querySelectorAll(".conversation-show-more");
      showMoreEls.forEach((el) => {
        const collapsed = this.showMoreAvailable ? this.showMore : true;
        el.classList.toggle("collapsed", collapsed);
      });

      const repliesEl = this.conversationPanel.querySelectorAll(".conversation-reply");
      repliesEl.forEach((el, index, arr) => {
        const isInitialComment = el.classList.contains("initial");
        const editedEl = el.querySelector(".conversation-edited");
        if (isInitialComment) {
          editedEl.classList.toggle("collapsed", !this.annotationRawData.edited);
        } else {
          const comment = this.annotationRawData.comments.find((c) => c.localId === el.dataset.localId);
          editedEl.classList.toggle("collapsed", !comment.edited);
        }
        const collapsed =
          index === 0 || index === 1 || index === arr.length - 1 || !this.showMoreAvailable
            ? false
            : !this.showMore;
        el.classList.toggle("collapsed", collapsed);
      });

      // const padding = this.withReplies ? 55 : 45
      // this.conversationPanel.style.left = this.annotationDIV.offsetLeft + padding + 'px'
      // this.conversationPanel.style.top = this.annotationDIV.offsetTop + 'px'
      function checkConversationPanelPosition() {
        const annoLeft =
          this.conversationPanel.parentNode.offsetLeft + this.conversationPanel.parentNode.clientWidth / 2;
        const panelBottom = this.conversationPanel.parentNode.offsetTop + this.conversationPanel.clientHeight;
        const { width: pageWidth, height: pageHeight } = this.viewport;

        annoLeft > pageWidth / 2
          ? this.conversationPanel.classList.replace("right", "left")
          : this.conversationPanel.classList.replace("left", "right");

        const safeZone = 10; // 3%
        const offset = panelBottom + safeZone >= pageHeight ? pageHeight - panelBottom - safeZone : 0;
        this.conversationPanel.style.marginTop = offset + "px";
      }
      checkConversationPanelPosition.call(this);
    }
  }
  formatDate(timestamp) {
    if (!timestamp) return "-";
    const today = moment();
    const yesterday = moment().subtract(1, "day");
    const date = moment.unix(timestamp);
    if (date.isSame(today, "day")) {
      return "Today, " + date.format("h:mm a");
    } else if (date.isSame(yesterday.toDate(), "day")) {
      return "Yesterday, " + date.format("h:mm a");
    }
    return date.format("MMMM D, YYYY");
  }
  canRemoveThread() {
    return true;
  }
  canEditInitialComment() {
    return true;
  }
  canRemoveReply() {
    return true;
  }
  canEditReply() {
    return true;
  }
  openContextMenu(target, roleAct, localId) {
    // console.log('openContextMenu', {roleAct, localId})
    const actionList = {
      "mark-as-unread": "conversation-context-menu" === roleAct,
      "delete-thread": "conversation-context-menu" === roleAct && this.withReplies && this.canRemoveThread(),
      "delete-comment":
        "conversation-context-menu" === roleAct && !this.withReplies && this.canRemoveThread(),

      "edit-comment": "comment-context-menu" === roleAct && this.canEditInitialComment(),

      "delete-reply": "reply-context-menu" === roleAct && this.canRemoveReply(),
      "edit-reply": "reply-context-menu" === roleAct && this.canEditReply(),
    };
    if (!Object.values(actionList).includes(true)) return;

    const middleBlock = this.conversationPanel.querySelector(".conversation-middle");
    const topScrollCorrection = roleAct === "reply-context-menu" ? middleBlock.scrollTop : 0;
    const contextMenu = this.conversationPanel.querySelector(".conversation-context-menu");
    const contextMenuOverlay = this.conversationPanel.querySelector(".conversation-context-menu-overlay");
    if (!contextMenu) return;
    contextMenuOverlay.onclick = this.closeContextMenu.bind(this);
    contextMenuOverlay.style.display = "block";
    contextMenu.style.display = "block";
    contextMenu.style.left = target.offsetLeft - 20 + "px";
    contextMenu.style.top = target.offsetTop + target.clientHeight - topScrollCorrection + "px";
    // console.log('context-menu', roleAct)
    contextMenu.querySelectorAll("button").forEach((el) => {
      el.style.display = actionList[el.dataset.roleAct] ? "block" : "none";
      el.setAttribute("data-local-id", localId);
    });
  }
  closeContextMenu() {
    const contextMenuOverlay = this.conversationPanel.querySelector(".conversation-context-menu-overlay");
    const contextMenu = this.conversationPanel.querySelector(".conversation-context-menu");
    contextMenuOverlay.style.display = "none";
    contextMenu.style.display = "none";
    contextMenu.querySelectorAll("button").forEach((el) => {
      el.style.display = "none";
      el.removeAttribute("data-local-id");
    });
  }
  markAsSelected() {
    super.markAsSelected();
  }
  markAsUnselected() {
    this.showMore = false;
    try {
      this.conversationPanel.querySelectorAll(".conversation-textarea").forEach((el) => {
        if (el.nodeName === "DIV") {
          const { localId } = el.parentNode.dataset;
          el.removeAttribute("contenteditable");
          if (el.parentNode.classList.contains("initial")) {
            el.innerText = this.annotationRawData.initial_comment;
          } else {
            const comment = this.annotationRawData.comments.find((c) => c.localId === localId);
            if (comment) el.innerText = comment.text;
          }
        } else if (el.nodeName === "TEXTAREA") {
          el.value = "";
        }
      });
      this.conversationPanel
        .querySelectorAll(
          'button[data-role-act="cancel-editing-reply"], button[data-role-act="cancel-new-reply"]'
        )
        .forEach((el) => {
          el.click();
        });
    } catch (e) {
      console.error(e.message);
    }
    super.markAsUnselected();
  }
  startEditMode() {}
  deleteComment(type, localId) {
    console.log("deleteComment", type, localId);
  }
  saveEditedComment(type, target, localId) {
    target.removeAttribute("contenteditable");
    if (type === "comment") {
      localId = this.localId;
    }
    console.log("saveEditedComment", type, target, localId);
  }
  onClick(e) {
    e.stopPropagation();
    e.preventDefault();
    const { role, roleAct, localId } = e.currentTarget.dataset;
    console.warn("onClick", role, roleAct, localId);
    switch (roleAct) {
      case "close-conversation-panel": {
        this.annotationDIV.parentNode.click();
        break;
      }
      case "cancel-new-conversation": {
        this.annotationRawData.initial_comment = "";
        this.foliaPageLayer.annotationObjects.delete(this.localId);
        break;
      }
      case "submit-new-conversation": {
        const textArea = this.annotationDIV.querySelector(".conversation-builder-textarea");
        if (textArea.value.length === 0) return;

        const created = moment().unix();
        this.annotationRawData.newbie = false;
        this.annotationRawData.type = "annotation";
        this.annotationRawData.edited = false;
        this.annotationRawData.initial_comment = textArea.value;
        this.annotationRawData.created = this.annotationRawData.lastModified = created;
        this.foliaPageLayer.commitChanges(this);

        this.render()
          .then(() => {
            this.foliaPageLayer.multipleSelect.addObject(this);
          })
          .catch(console.error);
        // console.log(textArea.value.length, this.annotationRawData.newbie)
        break;
      }

      case "submit-new-reply":
      case "cancel-new-reply": {
        const textArea = this.conversationPanel.querySelector("textarea.conversation-textarea");
        const replyText = textArea.value;
        textArea.value = "";
        textArea.style.height = "auto";
        textArea.style.height = textArea.scrollHeight + "px";

        const buttonsBlock = textArea.parentNode.querySelector(".footer-buttons");
        textArea.value === ""
          ? buttonsBlock.classList.add("collapsed")
          : buttonsBlock.classList.remove("collapsed");

        if (roleAct === "submit-new-reply") {
          const replyData = this.foliaPageLayer.foliaDataStorage
            .getActiveUser()
            .then((user) => ({
              annotationId: this.annotationRawData.localId,
              replyData: {
                localId: uuid.v4(),
                author: user.email,
                text: replyText,
                created: moment().unix(),
                lastModified: moment().unix(),
                edited: false,
              },
            }))
            .then((replyData) => this.foliaPageLayer.foliaDataStorage.createReply(replyData))
            .then((newbieReply) => this.annotationRawData.comments.push(newbieReply))
            // .then(() => this.showMore = true)
            .then(() => this.renderReplies())
            .then(() => {
              setTimeout(() => {
                const repliesContainer = this.conversationPanel.querySelector(".conversation-middle");
                console.log("--->", repliesContainer);
                repliesContainer.scrollTo({
                  top: repliesContainer.scrollHeight,
                  left: 0,
                  behavior: "smooth",
                });
                // repliesContainer.scrollTop = repliesContainer.scrollHeight + 'px'
              }, 10);
            })
            .catch(console.error);
          // console.warn('something additional should happens like saving the text')
        }
        break;
      }

      case "conversation-context-menu":
      case "comment-context-menu":
      case "reply-context-menu": {
        this.openContextMenu(e.currentTarget, roleAct, localId);
        break;
      }

      case "edit-reply":
      case "edit-comment": {
        const comment = this.conversationPanel.querySelector(
          `.conversation-reply[data-local-id="${localId}"]`
        );
        const textArea = comment.querySelector(".conversation-textarea");

        const header = comment.querySelector(".conversation-reply-header");
        const replyButtons = comment.querySelector(".conversation-reply-buttons");
        const editedEl = comment.querySelector(".conversation-edited");
        header.classList.add("collapsed");
        replyButtons.classList.remove("collapsed");
        editedEl.classList.add("collapsed");

        textArea.setAttribute("contenteditable", "true");
        textArea.focus();
        try {
          const range = document.createRange();
          const selection = window.getSelection();
          // TODO: lastChild ????
          range.setStart(textArea.childNodes[0], textArea.innerText.length);
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);
        } catch (e) {
          console.error(e.message);
        }

        this.closeContextMenu();
        setTimeout(() => this.draw(), 10);
        break;
      }
      case "submit-editing-reply":
      case "cancel-editing-reply": {
        const commentEl = e.target.parentNode.parentNode;
        const isInitialComment = commentEl.classList.contains("initial");
        const localId = isInitialComment ? this.annotationRawData.localId : commentEl.dataset.localId;
        const textArea = commentEl.querySelector(".conversation-textarea");

        const header = commentEl.querySelector(".conversation-reply-header");
        const replyButtons = commentEl.querySelector(".conversation-reply-buttons");
        const editedEl = commentEl.querySelector(".conversation-edited");
        header.classList.remove("collapsed");
        replyButtons.classList.add("collapsed");
        editedEl.classList.remove("collapsed");

        textArea.removeAttribute("contenteditable");
        // console.log(role, roleAct, isInitialComment, localId)
        if (isInitialComment) {
          if (roleAct === "submit-editing-reply") {
            this.annotationRawData.edited = this.annotationRawData.initial_comment !== textArea.value;
            this.annotationRawData.initial_comment = textArea.innerText;
          } else if (roleAct === "cancel-editing-reply") {
            textArea.innerText = this.annotationRawData.initial_comment;
          }
        } else {
          const comment = this.annotationRawData.comments.find((c) => c.localId === localId);
          if (roleAct === "submit-editing-reply") {
            comment.edited = comment.text !== textArea.innerText;
            comment.text = textArea.innerText;
          } else if (roleAct === "cancel-editing-reply") {
            textArea.innerText = comment.text;
          }
        }

        setTimeout(() => this.draw(), 10);
        break;
      }
      case "delete-reply": {
        console.warn("delete reply", localId);
        this.closeContextMenu();

        this.foliaPageLayer.foliaDataStorage
          .deleteReply({
            annotationId: this.annotationRawData.localId,
            commentId: localId,
          })
          .then(() => {
            this.showMore = true;
            const comment = this.annotationRawData.comments.find((c) => c.localId === localId);
            if (comment) {
              comment.deleted = true;
              this.renderReplies().catch(console.error);
            }
          })
          .catch(console.error);
        break;
      }
      case "delete-comment":
      case "delete-thread": {
        this.closeContextMenu();
        this.foliaPageLayer.deleteSelectedAnnotations();
        console.warn("delete annotation", localId);
        break;
      }
      case "mark-as-unread": {
        console.warn("mark as unread", localId);
        this.closeContextMenu();
        this.foliaPageLayer.foliaDataStorage
          .markConversationAsUnread(localId)
          .then(() => this.draw())
          .catch(console.error);
        break;
      }
      case "show-more": {
        console.warn("show-more");
        this.showMore = true;
        setTimeout(() => this.draw(), 10);
        break;
      }
      default:
        break;
    }
  }

  get unread() {
    // const annotation = this.activeWorkspace.cards[this.activeCardIndex].annotations[annotationLocalIndex]
    // const conversationIsUnread = annotation.object_id && this.activeWorkspace.unread_comments.includes(annotation.object_id)
    // const hasUnreadComments = this.getComments(annotationLocalIndex).filter(comment => {
    //   return comment.deleted !== 1
    // }).some(comment => {
    //   return this.activeWorkspace.unread_comments.some(unreadId => comment.object_id === unreadId)
    // })
    // // console.log(this.activeWorkspace.unread_comments, {conversationIsUnread, hasUnreadComments})
    // return conversationIsUnread || hasUnreadComments
    return true;
  }
  get withReplies() {
    return this.annotationRawData.comments.length > 0;
  }
  get showMoreAvailable() {
    return this.annotationRawData.comments.filter((c) => !c.deleted).length > 4;
  }
}

export default FoliaConversationAnnotation;
