import { foliaDateFormat, setTextAreaDynamicHeight } from "../folia-util";
import reply_html from "./folia-reply.html";

const STATUS = {
  EDITED: "EDITED",
  NOT_EDITED: "NOT_EDITED",
};

class FoliaReply extends HTMLElement {
  #template = null;
  #createdAtRedrawTimer = null;
  #initialText = "";
  #isInitialComment = false;
  #authorEmail;

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
    // console.log("REPLY attributeChangedCallback", { name, oldValue, newValue });
    switch (name) {
      case "author": {
        const userName = this.shadowRoot.querySelector(".folia-reply-title-info-username");
        const userAvatar = this.shadowRoot.querySelector(".folia-reply-title-icon");
        userName.innerHTML = newValue;
        userAvatar.innerText = `${newValue}`.substring(0, 2).toUpperCase();
        break;
      }
      case "created-at": {
        this.drawCreatedAt(newValue);
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

    const optionsOverlay = this.shadowRoot.querySelector(".folia-reply-title-menu-btn-options-overlay");
    const optionEdit = this.shadowRoot.querySelector(".folia-reply-title-menu-btn-option.edit");
    const optionDelete = this.shadowRoot.querySelector(".folia-reply-title-menu-btn-option.delete");

    optionsOverlay.addEventListener("click", this.optionsOverlayClickBinded, true);
    optionEdit.addEventListener("click", this.editReplyBinded, true);
    optionDelete.addEventListener("click", this.deleteReplyBinded, true);

    const editor = this.shadowRoot.querySelector(".folia-reply-text");
    setTimeout(() => setTextAreaDynamicHeight(editor), 0);
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

  drawCreatedAt(createdAt) {
    clearTimeout(this.#createdAtRedrawTimer);
    const commentDate = this.shadowRoot.querySelector(".folia-reply-title-info-timestamp");
    commentDate.innerHTML = foliaDateFormat(createdAt);
    this.#createdAtRedrawTimer = setTimeout(() => this.drawCreatedAt(createdAt), 1000);
  }

  get text() {
    return this.shadowRoot.querySelector(".folia-reply-text").innerHTML;
  }

  set text(text) {
    this.shadowRoot.querySelector(".folia-reply-text").innerHTML = text;
    this.#initialText = text;
  }

  set error(err) {
    this.shadowRoot.querySelector(".folia-reply-error").classList.toggle("shown", Boolean(err));
  }

  get isInitialComment() {
    return this.#isInitialComment;
  }

  set isInitialComment(status) {
    this.#isInitialComment = status;
  }

  set canEdit(canEditStatus) {
    const optionEdit = this.shadowRoot.querySelector(".folia-reply-title-menu-btn-option.edit");
    optionEdit.classList.toggle("disabled", !canEditStatus);
  }

  set canDelete(canDeleteStatus) {
    const optionDelete = this.shadowRoot.querySelector(".folia-reply-title-menu-btn-option.delete");
    optionDelete.classList.toggle("disabled", !canDeleteStatus);
  }

  set addedAt(date) {
    // console.log("reply addedAt is", date);
  }

  set editedStatus(status) {
    // console.log("reply editedStatus is", status);
  }

  get authorEmail() {
    return this.#authorEmail;
  }

  set authorEmail(email) {
    this.#authorEmail = email;
  }

  #toggleMenuVisibility() {
    // console.log("open Menu", this.id);
    const options = this.shadowRoot.querySelector(".folia-reply-title-menu-btn-options");
    const optionsOverlay = this.shadowRoot.querySelector(".folia-reply-title-menu-btn-options-overlay");
    options.classList.toggle("hidden");
    optionsOverlay.classList.toggle("hidden");
  }

  optionsOverlayClick(e) {
    e.stopPropagation();
    e.preventDefault();
    // console.log("Overlay Click", this.id);
    this.#toggleMenuVisibility();
  }

  editReply(e) {
    e.stopPropagation();
    e.preventDefault();
    if (e.target.classList.contains("disabled")) return;

    const editor = this.shadowRoot.querySelector(".folia-reply-text");
    const buttonsBox = this.shadowRoot.querySelector(".folia-reply-message-buttons");
    const doneButton = this.shadowRoot.querySelector(".folia-reply-done");
    const cancelButton = this.shadowRoot.querySelector(".folia-reply-cancel");

    buttonsBox.classList.toggle("hidden", false);

    cancelButton.onclick = (e) => {
      doneButton.toggleAttribute("disabled", true);
      editor.value = this.#initialText;
      window.getSelection().removeAllRanges();
      setTextAreaDynamicHeight(editor);
      editor.toggleAttribute("readonly", true);
      buttonsBox.classList.toggle("hidden", true);
    };

    doneButton.onclick = (e) => {
      doneButton.toggleAttribute("disabled", true);
      buttonsBox.classList.toggle("hidden", true);
      editor.toggleAttribute("readonly", true);

      setTextAreaDynamicHeight(editor);
      const text = editor.value;
      if (this.#initialText === text) return;
      if (typeof this.onChange === "function") this.onChange(this.id, text);
      this.#initialText = text;
    };

    editor.toggleAttribute("readonly", false);
    editor.oninput = (e) => {
      setTextAreaDynamicHeight(editor);
      doneButton.toggleAttribute("disabled", editor.value.length === 0);
    };
    editor.onkeydown = (e) => {
      if (!e.shiftKey && e.key === "Enter") {
        e.preventDefault();
        doneButton.dispatchEvent(new CustomEvent("click"));
      } else if (e.key === "Escape") {
        cancelButton.dispatchEvent(new CustomEvent("click"));
      }
    };

    this.#toggleMenuVisibility();
    setTimeout(() => {
      setTextAreaDynamicHeight(editor);
      editor.focus();
      editor.setSelectionRange(0, editor.value.length);
    }, 100);
  }

  deleteReply(e) {
    e.stopPropagation();
    e.preventDefault();
    if (e.target.classList.contains("disabled")) return;

    this.#toggleMenuVisibility();
    if (typeof this.onRemove === "function") {
      this.onRemove(this.id);
    }
    if (!this.#isInitialComment) this.remove();
  }
}

if ("customElements" in window) {
  customElements.define("folia-reply", FoliaReply);
} else {
  throw new Error("Custom html element <folia-reply> is not supported.");
}

export default FoliaReply;
