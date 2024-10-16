import { USER_ROLE } from "../constants";
import { foliaDateFormat, getInitials, setTextAreaDynamicHeight } from "../folia-util";
import reply_html from "./folia-reply.html";

const STATUS = {
  EDITED: "EDITED",
  NOT_EDITED: "NOT_EDITED",
};

class FoliaReply extends HTMLElement {
  #template = null;
  #createdAtRedrawTimer = null;
  #initialText = "";
  #isInitial = false;
  #canEdit = false;
  #canDelete = false;
  #isEdited = false;
  #addedAt = "";
  #isRead = false;

  constructor() {
    super();
    const template = document.createElement("template");
    template.innerHTML = reply_html;
    this.#template = template.content;
    this.attachShadow({ mode: "open" });
    this.shadowRoot.appendChild(template.content.cloneNode(true));

    this.optionsOverlayClickBinded = this.optionsOverlayClick.bind(this);
    this.editReplyBinded = this.editReply.bind(this);
    this.deleteReplyBinded = this.deleteReply.bind(this);
  }

  static get observedAttributes() {
    return ["id", "created-at", "author"];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    switch (name) {
      case "author": {
        const userName = this.shadowRoot.querySelector(".folia-reply-title-info-username");
        const userInitials = this.shadowRoot.querySelector(".folia-reply-title-icon-initials");
        userName.innerHTML = newValue;
        userInitials.innerText = getInitials(newValue);
        break;
      }
      case "created-at": {
        this.composeCreatedAtAsLabel(newValue);
        break;
      }
      default:
        break;
    }
  }

  connectedCallback() {
    this.className = "folia-reply";
    this.append(this.#template);

    const replyMenuBtn = this.shadowRoot.querySelector(".folia-reply-title-menu-btn");
    replyMenuBtn.onclick = () => this.#toggleMenuVisibility();

    const iconEl = this.shadowRoot.querySelector(".folia-reply-title-icon");
    const optionsOverlay = this.shadowRoot.querySelector(".folia-reply-title-menu-btn-options-overlay");
    const optionEdit = this.shadowRoot.querySelector(".folia-reply-title-menu-btn-option.edit");
    const optionDelete = this.shadowRoot.querySelector(".folia-reply-title-menu-btn-option.delete");

    iconEl.classList.toggle("unread", !this.#isRead);
    optionsOverlay.addEventListener("click", this.optionsOverlayClickBinded, { passive: false });
    optionEdit.addEventListener("click", this.editReplyBinded, { passive: false });
    optionDelete.addEventListener("click", this.deleteReplyBinded, { passive: false });

    this.composeEditedStatusLabel();
  }

  disconnectedCallback() {
    const optionsOverlay = this.shadowRoot.querySelector(".folia-reply-title-menu-btn-options-overlay");
    const optionEdit = this.shadowRoot.querySelector(".folia-reply-title-menu-btn-option.edit");
    const optionDelete = this.shadowRoot.querySelector(".folia-reply-title-menu-btn-option.delete");

    optionsOverlay.removeEventListener("click", this.optionsOverlayClickBinded, true);
    optionEdit.removeEventListener("click", this.editReplyBinded, true);
    optionDelete.removeEventListener("click", this.deleteReplyBinded, true);
    clearTimeout(this.#createdAtRedrawTimer);
  }

  composeEditedStatusLabel() {
    const editedStatusLabel = this.shadowRoot.querySelector(".folia-reply-edited-label");
    editedStatusLabel.classList.toggle("shown", this.#isEdited);
    // editedStatusLabel.innerHTML = "Edited " + foliaDateFormat(this.#addedAt);
    editedStatusLabel.innerHTML = "(edited)";
  }

  composeCreatedAtAsLabel(createdAt) {
    // clearTimeout(this.#createdAtRedrawTimer);
    const commentDate = this.shadowRoot.querySelector(".folia-reply-title-info-timestamp");
    commentDate.innerHTML = foliaDateFormat(createdAt);
    // this.#createdAtRedrawTimer = setTimeout(() => this.composeCreatedAtAsLabel(createdAt), 1000);
  }

  get text() {
    return this.shadowRoot.querySelector(".folia-reply-editor").innerText;
  }
  set text(text) {
    const editor = this.shadowRoot.querySelector(".folia-reply-editor");
    if (!editor.hasAttribute("contenteditable")) {
      editor.innerText = text;
    }
    this.#initialText = text;
  }

  set error(err) {
    this.shadowRoot.querySelector(".folia-reply-error").classList.toggle("shown", Boolean(err));
  }
  get error() {
    return null;
  }

  set isInitial(value) {
    this.#isInitial = value;
  }
  get isInitial() {
    return this.#isInitial;
  }

  set canEdit(value) {
    this.#canEdit = value;
    const optionEdit = this.shadowRoot.querySelector(".folia-reply-title-menu-btn-option.edit");
    optionEdit.classList.toggle("disabled", !this.#canEdit);
  }
  get canEdit() {
    return this.#canEdit;
  }

  set canDelete(value) {
    this.#canDelete = value;
    const optionDelete = this.shadowRoot.querySelector(".folia-reply-title-menu-btn-option.delete");
    optionDelete.classList.toggle("disabled", !this.#canDelete);
  }
  get canDelete() {
    return this.#canDelete;
  }

  set addedAt(value) {
    this.#addedAt = value;
  }
  get addedAt() {
    return this.#addedAt;
  }

  set editedStatus(value) {
    this.#isEdited = value === "EDITED";
    this.composeEditedStatusLabel();
  }
  get editedStatus() {
    return this.#isEdited;
  }

  set isRead(value) {
    this.#isRead = Boolean(value);
    const iconEl = this.shadowRoot.querySelector(".folia-reply-title-icon");
    iconEl.classList.toggle("unread", !this.#isRead);
  }
  get isRead() {
    return this.#isRead;
  }

  #toggleMenuVisibility() {
    const options = this.shadowRoot.querySelector(".folia-reply-title-menu-btn-options");
    const optionsOverlay = this.shadowRoot.querySelector(".folia-reply-title-menu-btn-options-overlay");
    options.classList.toggle("hidden");
    optionsOverlay.classList.toggle("hidden");
  }

  optionsOverlayClick(e) {
    e.stopPropagation();
    e.preventDefault();
    this.#toggleMenuVisibility();
  }

  editReply(e) {
    e.stopPropagation();
    e.preventDefault();
    if (e.target.classList.contains("disabled")) return;

    const editor = this.shadowRoot.querySelector(".folia-reply-editor");
    const buttonsBox = this.shadowRoot.querySelector(".folia-reply-message-buttons");
    const doneButton = this.shadowRoot.querySelector(".folia-reply-done");
    const cancelButton = this.shadowRoot.querySelector(".folia-reply-cancel");

    buttonsBox.classList.toggle("hidden", false);

    cancelButton.onclick = (e) => {
      doneButton.toggleAttribute("disabled", true);
      editor.innerText = this.#initialText;
      window.getSelection().removeAllRanges();
      editor.toggleAttribute("contenteditable", false);
      buttonsBox.classList.toggle("hidden", true);
    };

    doneButton.onclick = (e) => {
      doneButton.toggleAttribute("disabled", true);
      buttonsBox.classList.toggle("hidden", true);
      editor.toggleAttribute("contenteditable", false);

      const text = editor.innerText;
      if (this.#initialText === text) return;

      this.#initialText = text;
      this.#isEdited = true;
      this.#addedAt = new Date().toISOString();
      this.composeEditedStatusLabel();
      if (typeof this.onChange === "function") this.onChange(this.id, text, this.#addedAt);
    };

    editor.toggleAttribute("contenteditable", true);
    editor.oninput = (e) => {
      // setTextAreaDynamicHeight(editor);
      doneButton.toggleAttribute("disabled", editor.innerText.length === 0);
    };
    editor.onkeydown = (e) => {
      if (!e.shiftKey && e.key === "Enter") {
        e.preventDefault();
        doneButton.dispatchEvent(new CustomEvent("click"));
      } else if (e.key === "Escape") {
        cancelButton.dispatchEvent(new CustomEvent("click"));
      }
    };

    editor.onpaste = (e) => {
      // Stop data actually being pasted into div
      e.preventDefault();
      // Get pasted data via clipboard API
      const pastedText = (e.clipboardData || window.clipboardData).getData("text");
      // Insert the value on cursor position
      window.document.execCommand("insertText", false, pastedText);
    };

    this.#toggleMenuVisibility();
    setTimeout(() => {
      // setTextAreaDynamicHeight(editor);
      editor.focus();

      // editor.setSelectionRange(editor.innerText.length, editor.innerText.length);
      const range = document.createRange();
      range.selectNodeContents(editor);
      range.collapse(false);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }, 100);
  }

  deleteReply(e) {
    e.stopPropagation();
    e.preventDefault();
    if (e.target.classList.contains("disabled")) return;

    this.#toggleMenuVisibility();
    if (typeof this.onRemove === "function") this.onRemove(this.id);
    this.remove();
  }

  markReplyAsRead() {
    this.isRead = true;
    if (typeof this.onChangeReadStatus === "function") this.onChangeReadStatus(this.id, true);
  }

  markReplyAsUnread() {
    this.isRead = false;
    if (typeof this.onChangeReadStatus === "function") this.onChangeReadStatus(this.id, false);
  }
}

if ("customElements" in window) {
  customElements.define("folia-reply", FoliaReply);
} else {
  throw new Error("Custom html element <folia-reply> is not supported.");
}

export default FoliaReply;
