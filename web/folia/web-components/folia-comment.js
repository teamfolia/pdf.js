import def from "ajv/dist/vocabularies/discriminator";
import { setTextAreaDynamicHeight } from "../folia-util";
import html from "./folia-comment.html";
import reply from "./folia-reply";
import { PERMISSIONS, USER_ROLE } from "../constants";

class FoliaComment extends HTMLElement {
  #initialComment = null;
  #replies = [];
  #permissions = [];
  #currentUserEmail = "";
  #collaboratorEmail = "";

  constructor() {
    super();
    const template = document.createElement("template");
    template.innerHTML = html;
    this.attachShadow({ mode: "open" });
    this.shadowRoot.appendChild(template.content.cloneNode(true));

    this.closeBtnClickBinded = this.closeBtnClick.bind(this);
    this.menuBtnClickBinded = this.menuBtnClick.bind(this);
    this.menuOverlayClickBinded = this.menuOverlayClick.bind(this);
    this.menuOptionUnreadClickBinded = this.menuOptionUnreadClick.bind(this);
    this.menuOptionDeleteClickBinded = this.menuOptionDeleteClick.bind(this);
    this.sendReplyBtnClickBinded = this.sendReplyBtnClick.bind(this);
    this.replyEditorKeydownBinded = this.replyEditorKeydown.bind(this);
    this.replyEditorInputBinded = this.replyEditorInput.bind(this);
  }

  static get observedAttributes() {
    return [];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    switch (name) {
      default:
        break;
    }
  }

  connectedCallback() {
    this.className = "folia-comment";

    const deleteDialogOverlay = this.shadowRoot.querySelector(".folia-comment-dialog-overlay");
    deleteDialogOverlay.onclick = (e) => {
      e.stopPropagation();
      this.toggleDeleteDialog(false);
    };
    const deleteDialog = this.shadowRoot.querySelector(".folia-comment-dialog");
    deleteDialog.onclick = (e) => this.deleteDialogOnClick(e);

    const headerCloseBtn = this.shadowRoot.querySelector(".folia-comment-header-close-btn");
    const headerMenuBtn = this.shadowRoot.querySelector(".folia-comment-header-menu-btn");
    const menuOverlay = this.shadowRoot.querySelector(".folia-comment-header-menu-btn-options-overlay");
    const unreadOption = this.shadowRoot.querySelector(".folia-comment-header-menu-btn-option.unread");
    const deleteOption = this.shadowRoot.querySelector(".folia-comment-header-menu-btn-option.delete");
    const sendReplyBtn = this.shadowRoot.querySelector(".folia-comment-footer-send-btn");
    const replyEditor = this.shadowRoot.querySelector(".folia-comment-footer-textarea");

    headerCloseBtn.addEventListener("click", this.closeBtnClickBinded, { passive: false });
    headerMenuBtn.addEventListener("click", this.menuBtnClickBinded, { passive: false });
    menuOverlay.addEventListener("click", this.menuOverlayClickBinded, { passive: false });
    unreadOption.addEventListener("click", this.menuOptionUnreadClickBinded, { passive: false });
    deleteOption.addEventListener("click", this.menuOptionDeleteClickBinded, { passive: false });
    sendReplyBtn.addEventListener("click", this.sendReplyBtnClickBinded, { passive: false });
    replyEditor.addEventListener("keydown", this.replyEditorKeydownBinded, { passive: false });
    replyEditor.addEventListener("input", this.replyEditorInputBinded, { passive: false });

    replyEditor.focus();
    this.#applyPermissions();
    setTextAreaDynamicHeight(replyEditor);
  }

  disconnectedCallback() {
    const headerCloseBtn = this.shadowRoot.querySelector(".folia-comment-header-close-btn");
    const headerMenuBtn = this.shadowRoot.querySelector(".folia-comment-header-menu-btn");
    const menuOverlay = this.shadowRoot.querySelector(".folia-comment-header-menu-btn-options-overlay");
    const unreadOption = this.shadowRoot.querySelector(".folia-comment-header-menu-btn-option.unread");
    const deleteOption = this.shadowRoot.querySelector(".folia-comment-header-menu-btn-option.delete");
    const sendReplyBtn = this.shadowRoot.querySelector(".folia-comment-footer-send-btn");
    const replyEditor = this.shadowRoot.querySelector(".folia-comment-footer-textarea");

    headerCloseBtn.removeEventListener("click", this.closeBtnClickBinded, { passive: false });
    headerMenuBtn.removeEventListener("click", this.menuBtnClickBinded, { passive: false });
    menuOverlay.removeEventListener("click", this.menuOverlayClickBinded, { passive: false });
    unreadOption.removeEventListener("click", this.menuOptionUnreadClickBinded, { passive: false });
    deleteOption.removeEventListener("click", this.menuOptionDeleteClickBinded, { passive: false });
    sendReplyBtn.removeEventListener("click", this.sendReplyBtnClickBinded, { passive: false });
    replyEditor.removeEventListener("keydown", this.replyEditorKeydownBinded, { passive: false });
    replyEditor.removeEventListener("input", this.replyEditorInputBinded, { passive: false });
  }

  closeBtnClick(e) {
    this.dispatchEvent(new CustomEvent("close", {}));
  }

  setMenuVisibility(visible = false) {
    const menuOverlay = this.shadowRoot.querySelector(".folia-comment-header-menu-btn-options-overlay");
    const optionsBox = this.shadowRoot.querySelector(".folia-comment-header-menu-btn-options");
    menuOverlay.classList.toggle("hidden", !visible);
    optionsBox.classList.toggle("hidden", !visible);
  }

  menuBtnClick(e) {
    e.stopPropagation();
    this.setMenuVisibility(true);
  }
  menuOverlayClick(e) {
    e.stopPropagation();
    this.setMenuVisibility(false);
  }
  menuOptionUnreadClick(e) {
    e.stopPropagation();
    if (e.target.classList.contains("disabled")) return;
    this.setMenuVisibility(false);
    this.dispatchEvent(new CustomEvent("mark-all-as-unread", {}));
  }
  menuOptionDeleteClick(e) {
    e.stopPropagation();
    if (e.target.classList.contains("disabled")) return;
    this.setMenuVisibility(false);
    this.toggleDeleteDialog();
  }

  sendReplyBtnClick(e) {
    if (e) e.stopPropagation();
    const sendReplyBtn = this.shadowRoot.querySelector(".folia-comment-footer-send-btn");
    const conversationBox = this.shadowRoot.querySelector(".folia-comment-conversation");
    const editor = this.shadowRoot.querySelector(".folia-comment-footer-textarea");
    const text = editor.value;
    if (!text) return;
    this.dispatchEvent(new CustomEvent("submit-replay", { detail: { text } }));

    editor.value = "";
    setTextAreaDynamicHeight(editor);
    conversationBox.scrollTo({
      top: conversationBox.scrollHeight,
      behavior: "smooth",
    });
    sendReplyBtn.toggleAttribute("disabled", true);
  }

  replyEditorKeydown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      this.sendReplyBtnClick();
    } else if (e.key === "Backspace") {
      e.stopPropagation();
    }
  }

  replyEditorInput(e) {
    const sendReplyBtn = this.shadowRoot.querySelector(".folia-comment-footer-send-btn");
    sendReplyBtn.toggleAttribute("disabled", e.target.value.length === 0);
    setTextAreaDynamicHeight(e.target);
  }

  set replies(repliesList) {
    if (!Array.isArray(repliesList)) throw new Error("Property <replies> must be an array");

    const sortedRepliesList = repliesList.sort((replyA, replyB) => {
      return new Date(replyA.createdAt).getTime() - new Date(replyB.createdAt).getTime();
    });
    const conversationBox = this.shadowRoot.querySelector(".folia-comment-conversation");
    conversationBox.querySelectorAll("folia-reply").forEach((replyEl) => {
      if (!sortedRepliesList.map((obj) => obj.id).includes(replyEl.id)) {
        replyEl.remove();
      }
    });
    sortedRepliesList.forEach((reply, index) => {
      let replyEl = this.shadowRoot.getElementById(reply.id);
      if (!replyEl) {
        const el = document.createElement("folia-reply");
        el.setAttribute("id", reply.id);
        replyEl = conversationBox.insertAdjacentElement("beforeend", el);
      }
      replyEl.setAttribute("created-at", reply.createdAt);
      replyEl.setAttribute("author", reply.collaboratorName || reply.collaboratorEmail);
      replyEl.isInitial = index === 0;
      replyEl.text = reply.text;
      replyEl.error = reply.error;
      replyEl.addedAt = reply.addedAt;
      replyEl.editedStatus = reply.status;
      replyEl.isRead = reply.isRead;
      replyEl.collaboratorEmail = reply.collaboratorEmail;

      replyEl.onChangeReadStatus = (replyId, isRead) => {
        // console.log("comment::send change-read-status");
        const detail = { replyId, isRead };
        this.dispatchEvent(new CustomEvent("change-read-status", { detail }));
      };

      replyEl.onRemove = (replyId) => {
        const detail = { replyId };
        this.dispatchEvent(new CustomEvent("remove", { detail }));
      };
      replyEl.onChange = (id, text, addedAt) => {
        const detail = { id, text, edited: true, addedAt };
        this.dispatchEvent(new CustomEvent("submit-replay", { detail }));
      };
    });

    this.#replies = repliesList.slice();
    this.#applyPermissions();
    setTimeout(() => {
      conversationBox.scrollTo({
        top: conversationBox.scrollHeight,
        behavior: "smooth",
      });
    }, 100);
  }
  get replies() {
    return this.#replies;
  }

  set permissions(value) {
    this.#permissions = structuredClone(value);
    this.#applyPermissions();
  }
  get permissions() {
    return this.#permissions;
  }

  set currentUserEmail(value) {
    this.#currentUserEmail = value;
    this.#applyPermissions();
  }
  get currentUserEmail() {
    return this.#currentUserEmail;
  }

  set collaboratorEmail(value) {
    this.#collaboratorEmail = value;
    this.#applyPermissions();
  }
  get collaboratorEmail() {
    return this.#collaboratorEmail;
  }

  #applyPermissions() {
    // console.log("perms", this.#permissions);
    const isCommentOwner = this.#currentUserEmail === this.#collaboratorEmail;
    const canDeleteComment =
      (isCommentOwner && this.#permissions.includes(PERMISSIONS.MANAGE_OWN_COMMENT)) ||
      this.#permissions.includes(PERMISSIONS.DELETE_FOREIGN_COMMENT);
    const canMakeReply = this.#permissions.includes(PERMISSIONS.MANAGE_ANNOTATION);

    this.shadowRoot.querySelectorAll(".folia-comment-header-menu-btn-option.unread").forEach((el) => {
      el.classList.toggle("disabled", !canMakeReply);
    });
    this.shadowRoot.querySelectorAll(".folia-comment-header-menu-btn-option.delete").forEach((el) => {
      el.classList.toggle("disabled", !canDeleteComment);
    });

    this.shadowRoot.querySelectorAll(".folia-comment-footer").forEach((el) => {
      el.classList.toggle("hidden", !canMakeReply);
    });

    this.shadowRoot.querySelectorAll("folia-reply").forEach((replyEl) => {
      const isReplyOwner = this.#currentUserEmail === replyEl.collaboratorEmail;
      const canEditReply = isReplyOwner && this.#permissions.includes(PERMISSIONS.MANAGE_ANNOTATION);
      const canDeleteReply = replyEl.isInitial
        ? false
        : this.#permissions.includes(PERMISSIONS.MANAGE_ANNOTATION) ||
          this.#permissions.includes(PERMISSIONS.DELETE_FOREIGN_ANNOTATION);

      replyEl.canEdit = canEditReply;
      replyEl.canDelete = canDeleteReply;
    });
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
        this.dispatchEvent(new CustomEvent("remove", { detail: { commentId: true } }));
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
