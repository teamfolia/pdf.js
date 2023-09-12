import def from "ajv/dist/vocabularies/discriminator";
import { setTextAreaDynamicHeight } from "../folia-util";
import html from "./folia-comment.html";
import reply from "./folia-reply";
import { PERMISSIONS, USER_ROLE } from "../constants";

class FoliaComment extends HTMLElement {
  #initialComment = null;
  #replies = [];
  #userEmail = "";
  #userRole = USER_ROLE.VIEWER;
  #permissions = [];

  constructor() {
    super();
    const template = document.createElement("template");
    template.innerHTML = html;
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
    };

    const closeBtn = this.shadowRoot.querySelector(".folia-comment-header-close-btn");
    closeBtn.onclick = () => this.dispatchEvent(new CustomEvent("close", {}));

    const sendReplyBtn = this.shadowRoot.querySelector(".folia-comment-footer-send-btn");
    sendReplyBtn.onclick = () => this.submitReply();

    const replyEditor = this.shadowRoot.querySelector(".folia-comment-footer-textarea");
    replyEditor.onkeydown = (e) => this.editorOnKeyDown(e);
    replyEditor.oninput = (e) => this.editorOnChange(e);
    replyEditor.focus();

    this.#applyPermissions();
    setTextAreaDynamicHeight(replyEditor);
  }

  disconnectedCallback() {}

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
    initialCommentEl.text = comment.text;
    initialCommentEl.error = comment.error;
    initialCommentEl.isInitialComment = true;
    initialCommentEl.addedAt = comment.addedAt;
    initialCommentEl.editedStatus = comment.status;
    initialCommentEl.authorEmail = comment.collaboratorEmail;

    initialCommentEl.onRemove = (commentId) => {
      this.toggleDeleteDialog();
    };
    initialCommentEl.onChange = (commentId, text) => {
      this.dispatchEvent(new CustomEvent("submit-comment", { detail: { commentId, text } }));
    };
    this.#initialComment = comment;
    this.#applyPermissions();
  }

  set replies(repliesList) {
    if (!Array.isArray(repliesList)) throw new Error("Property <replies> must be an array");

    const sortedRepliesList = repliesList.sort((replyA, replyB) => {
      return new Date(replyA.createdAt).getTime() - new Date(replyB.createdAt).getTime();
    });
    const conversationBox = this.shadowRoot.querySelector(".folia-commnet-conversation");

    for (const reply of sortedRepliesList) {
      let replyEl = this.shadowRoot.getElementById(reply.id);
      if (!replyEl) {
        const el = document.createElement("folia-reply");
        el.setAttribute("id", reply.id);
        replyEl = conversationBox.insertAdjacentElement("beforeend", el);
      }
      replyEl.setAttribute("created-at", reply.createdAt);
      replyEl.setAttribute("author", reply.collaboratorName || reply.collaboratorEmail);
      replyEl.text = reply.text;
      replyEl.error = reply.error;
      replyEl.isInitialComment = false;
      replyEl.addedAt = reply.addedAt;
      replyEl.editedStatus = reply.status;
      replyEl.authorEmail = reply.collaboratorEmail;

      replyEl.onRemove = (replyId) => {
        this.dispatchEvent(
          new CustomEvent("remove", {
            detail: { replyId },
          })
        );
      };
      replyEl.onChange = (id, text) => {
        this.dispatchEvent(new CustomEvent("submit-replay", { detail: { id, text, edited: true } }));
      };
    }

    this.#replies = repliesList.slice();
    this.#applyPermissions();
    setTimeout(() => {
      conversationBox.scrollTo({
        top: conversationBox.scrollHeight,
        behavior: "smooth",
      });
    }, 100);
  }

  setPermissions(permissions = [], userEmail, userRole) {
    // console.log("setPermissions", { permissions, userEmail, userRole });
    this.#permissions = permissions.slice();
    this.#userEmail = userEmail;
    this.#userRole = userRole;
    this.#applyPermissions();
  }

  #applyPermissions() {
    const canDeleteComment = this.#userRole === USER_ROLE.OWNER || this.#userRole === USER_ROLE.EDITOR;
    const canMakeReply = this.#userRole !== USER_ROLE.VIEWER && this.#userRole !== USER_ROLE.PUBLIC_VIEWER;

    this.shadowRoot.querySelectorAll(".folia-comment-header-delete-btn").forEach((el) => {
      el.classList.toggle("hidden", !canDeleteComment);
    });

    this.shadowRoot.querySelectorAll(".folia-comment-footer").forEach((el) => {
      el.classList.toggle("hidden", !canMakeReply);
    });

    this.shadowRoot.querySelectorAll("folia-reply").forEach((replyEl) => {
      const canEditReply = this.#userRole !== USER_ROLE.VIEWER && this.#userEmail === replyEl.authorEmail;
      const canDeleteReply =
        this.#userRole === USER_ROLE.OWNER ||
        this.#userRole === USER_ROLE.EDITOR ||
        (this.#userEmail === replyEl.authorEmail && this.#userRole !== USER_ROLE.VIEWER);

      replyEl.canEdit = canEditReply;
      replyEl.canDelete = replyEl.isInitialComment ? canDeleteComment : canDeleteReply;
    });
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
    this.dispatchEvent(new CustomEvent("submit-replay", { detail: { text } }));

    editor.value = "";
    setTextAreaDynamicHeight(editor);
    conversationBox.scrollTo({
      top: conversationBox.scrollHeight,
      behavior: "smooth",
    });
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
