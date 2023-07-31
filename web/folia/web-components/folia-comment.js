import def from "ajv/dist/vocabularies/discriminator";
import { setTextAreaDynamicHeight } from "../folia-util";
import html from "./folia-comment.html";
import reply from "./folia-reply";

class FoliaComment extends HTMLElement {
  #template = null;
  #userEmail = "";
  #userName = "";
  #initialComment = null;
  #replies = [];
  #permissions = {
    whoAreYou: "",
    canManageOwn: false,
    canDeleteForeign: false,
  };

  constructor() {
    super();
    const template = document.createElement("template");
    template.innerHTML = html;
    this.#template = template.content;
    this.attachShadow({ mode: "open" });
    this.shadowRoot.appendChild(template.content.cloneNode(true));
  }

  static get observedAttributes() {
    return [];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    // console.log("attributeChangedCallback", { name, oldValue, newValue });
    switch (name) {
      default:
        break;
    }
  }

  connectedCallback() {
    // console.log("connectedCallback");
    this.className = "folia-comment";

    const deleteDialogOverlay = this.shadowRoot.querySelector(".folia-comment-dialog-overlay");
    deleteDialogOverlay.onclick = (e) => {
      e.stopPropagation();
      this.toggleDeleteDialog(false);
    };
    const deleteDialog = this.shadowRoot.querySelector(".folia-comment-dialog");
    deleteDialog.onclick = (e) => this.deleteDialogOnClick(e);

    const deleteBtn = this.shadowRoot.querySelector(".folia-comment-header-delete-btn");
    deleteBtn.onclick = () => {
      this.toggleDeleteDialog();
      // this.dispatchEvent(new CustomEvent("remove", { detail: { commentId: this.#initialComment.id } }));
    };

    const closeBtn = this.shadowRoot.querySelector(".folia-comment-header-close-btn");
    closeBtn.onclick = () => this.dispatchEvent(new CustomEvent("close", {}));

    const sendReplyBtn = this.shadowRoot.querySelector(".folia-comment-footer-send-btn");
    sendReplyBtn.onclick = () => this.submitReply();

    const replyEditor = this.shadowRoot.querySelector(".folia-comment-footer-textarea");
    const footer = this.shadowRoot.querySelector(".folia-comment-footer");
    if (this.#permissions.canManageOwn) {
      replyEditor.onkeydown = (e) => this.editorOnKeyDown(e);
      replyEditor.oninput = (e) => this.editorOnChange(e);
      replyEditor.focus();
    } else {
      footer.classList.toggle("hidden", true);
    }
    setTextAreaDynamicHeight(replyEditor);
  }

  disconnectedCallback() {}

  get initialComment() {
    return Object.assign({}, this.#initialComment);
  }

  set initialComment(comment) {
    // console.log("setup initial comment", this.#permissions);
    let initialCommentEl = this.shadowRoot.getElementById(comment.id);
    if (!initialCommentEl) {
      const conversationBox = this.shadowRoot.querySelector(".folia-commnet-conversation");
      const el = document.createElement("folia-reply");
      el.setAttribute("id", comment.id);
      initialCommentEl = conversationBox.insertAdjacentElement("afterbegin", el);
    }
    initialCommentEl.setAttribute("created-at", comment.createdAt);
    initialCommentEl.setAttribute("author", comment.collaboratorName || comment.collaboratorEmail);
    initialCommentEl.setAttribute("status", comment.status);
    initialCommentEl.setAttribute("updated-at", comment.addedAt);
    initialCommentEl.setAttribute("is-comment", true);
    initialCommentEl.text = comment.text;
    initialCommentEl.onRemove = (commentId) => {
      this.toggleDeleteDialog();
      // this.dispatchEvent(new CustomEvent("remove", { detail: { commentId } }));
    };
    initialCommentEl.onChange = (commentId, text) => {
      this.dispatchEvent(new CustomEvent("submit-comment", { detail: { commentId, text } }));
    };
    initialCommentEl.canEdit =
      comment.collaboratorEmail === this.#permissions.whoAreYou && this.#permissions.canManageOwn;

    initialCommentEl.canDelete =
      comment.collaboratorEmail === this.#permissions.whoAreYou && this.#permissions.canManageOwn;

    const deleteBtn = this.shadowRoot.querySelector(".folia-comment-header-delete-btn");
    deleteBtn.classList.toggle("hidden", !initialCommentEl.canDelete);
    this.#initialComment = comment;
  }

  get replies() {
    return this.#replies.slice();
  }

  set replies(repliesList) {
    if (!Array.isArray(repliesList)) throw new Error("Property <replies> must be an array");

    const sortedRepliesList = repliesList.sort((replyA, replyB) => {
      return new Date(replyA.createdAt).getTime() - new Date(replyB.createdAt).getTime();
    });

    for (const reply of sortedRepliesList) {
      // console.log("setup reply", this.#permissions);
      const conversationBox = this.shadowRoot.querySelector(".folia-commnet-conversation");
      let replyEl = this.shadowRoot.getElementById(reply.id);
      if (!replyEl) {
        const el = document.createElement("folia-reply");
        el.setAttribute("id", reply.id);
        replyEl = conversationBox.insertAdjacentElement("beforeend", el);
      }
      replyEl.setAttribute("created-at", reply.createdAt);
      replyEl.setAttribute("author", reply.collaboratorName || reply.collaboratorEmail);
      replyEl.setAttribute("status", reply.status);
      replyEl.setAttribute("updated-at", reply.addedAt);
      replyEl.text = reply.text;
      replyEl.onRemove = (replyId) => {
        this.dispatchEvent(
          new CustomEvent("remove", {
            detail: { replyId },
          })
        );
      };
      replyEl.onChange = (id, text) => {
        this.dispatchEvent(
          new CustomEvent("submit-replay", {
            detail: { id, text, edited: true },
          })
        );
      };
      replyEl.canEdit =
        reply.collaboratorEmail === this.#permissions.whoAreYou && this.#permissions.canManageOwn;

      replyEl.canDelete =
        (reply.collaboratorEmail !== this.#permissions.whoAreYou && this.#permissions.canDeleteForeign) ||
        (reply.collaboratorEmail === this.#permissions.whoAreYou && this.#permissions.canManageOwn);
    }

    this.#replies = repliesList.slice();
  }

  get permissions() {
    return this.#permissions;
  }

  set permissions(perms) {
    this.#permissions = {
      whoAreYou: perms?.whoAreYou || "",
      canManageOwn: perms?.canManageOwn || false,
      canDeleteForeign: perms?.canDeleteForeign || false,
    };
  }

  editorOnChange(e) {
    const sendReplyBtn = this.shadowRoot.querySelector(".folia-comment-footer-send-btn");
    sendReplyBtn.toggleAttribute("disabled", e.target.value.length === 0);
    setTextAreaDynamicHeight(e.target);
  }

  editorOnKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      this.submitReply();
    } else if (e.key === "Backspace") {
      e.stopPropagation();
    }
  }

  submitReply(e) {
    if (e) e.stopPropagation();
    const sendReplyBtn = this.shadowRoot.querySelector(".folia-comment-footer-send-btn");
    const conversationBox = this.shadowRoot.querySelector(".folia-commnet-conversation");
    const editor = this.shadowRoot.querySelector(".folia-comment-footer-textarea");
    const text = editor.value;
    if (!text) return;
    if (!this.#permissions.canManageOwn) return;
    this.dispatchEvent(new CustomEvent("submit-replay", { detail: { text } }));

    editor.value = "";
    setTextAreaDynamicHeight(editor);
    conversationBox.scrollTop = conversationBox.scrollHeight;
    sendReplyBtn.toggleAttribute("disabled", true);
  }

  toggleDeleteDialog(forcedStatus) {
    const deleteDialogOverlay = this.shadowRoot.querySelector(".folia-comment-dialog-overlay");
    if (typeof forcedStatus === "undefined") {
      deleteDialogOverlay.classList.toggle("shown", !deleteDialogOverlay.classList.contains("shown"));
    } else {
      deleteDialogOverlay.classList.toggle("shown", forcedStatus);
    }
  }

  deleteDialogOnClick(e) {
    e.stopPropagation();
    e.preventDefault();
    // console.log("deleteDialogOnClick", e.target, e.target.dataset["role"]);
    switch (e.target.dataset["role"]) {
      case "close-dialog": {
        this.toggleDeleteDialog(false);
        break;
      }
      case "remove-comment": {
        this.dispatchEvent(new CustomEvent("remove", { detail: { commentId: this.#initialComment.id } }));
        this.toggleDeleteDialog(false);
        break;
      }
      default:
        break;
    }
  }
}

if ("customElements" in window) {
  customElements.define("folia-comment", FoliaComment);
} else {
  throw new Error("Custom html element <folia-comment> is not supported.");
}

export default FoliaComment;
