import html from "./folia-create-comment.html";

class FoliaCreateComment extends HTMLElement {
  #template = null;
  #submited = false;

  constructor() {
    super();
    const template = document.createElement("template");
    template.innerHTML = html;
    this.#template = template.content;
    this.attachShadow({ mode: "open" });
    this.shadowRoot.appendChild(template.content.cloneNode(true));

    this._onKeyDown = this.editorOnKeyDown.bind(this);
    this._onInput = this.editorOnInput.bind(this);
    this._onMouseClick = this.onMouseClick.bind(this);
  }

  static get observedAttributes() {
    return [];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    // console.log("attributeChangedCallback", { name, oldValue, newValue });
  }

  connectedCallback() {
    this.shadowRoot.onclick = (e) => this.onMouseClick(e);

    const textArea = this.shadowRoot.querySelector(".folia-create-comment-editor");
    textArea.style.height = "auto";
    textArea.style.height = textArea.scrollHeight + "px";
    textArea.onkeydown = (e) => this.editorOnKeyDown(e);
    textArea.oninput = (e) => this.editorOnInput(e.target);

    const submitBtn = this.shadowRoot.querySelector(".folia-create-comment-button.submit");
    submitBtn.onclick = (e) => this.submitComment(e);
    const smileBtn = this.shadowRoot.querySelector(".folia-create-comment-button.smile");
    smileBtn.onclick = (e) => this.addSmile(e);
    const mentionBtn = this.shadowRoot.querySelector(".folia-create-comment-button.mention");
    mentionBtn.onclick = (e) => this.addMention(e);
    const previouslyTypedText = localStorage.getItem("folia-create-comment");
    if (previouslyTypedText) {
      textArea.value = previouslyTypedText;
      this.editorOnInput(textArea);
    }
    textArea.focus();

    const smiles = this.shadowRoot.querySelector(".folia-create-comment-smiles-body");
    for (let code = 0x1f600; code <= 0x1f64f; code++) {
      const smile = document.createElement("div");
      smile.className = "folia-create-comment-smile";
      smile.innerHTML = String.fromCodePoint(code);
      smiles.appendChild(smile);
    }
    // console.log("connectedCallback");
  }

  disconnectedCallback() {
    // console.log("disconnectedCallback");
    if (this.#submited) {
      localStorage.removeItem("folia-create-comment");
    } else {
      const editor = this.shadowRoot.querySelector(".folia-create-comment-editor");
      if (editor.value) localStorage.setItem("folia-create-comment", editor.value);
    }
  }

  onMouseClick(e) {
    e.stopPropagation();
  }

  editorOnInput(editorElem) {
    const fakeBtn = this.shadowRoot.querySelector(".folia-create-comment-fake-btn");
    const footer = this.shadowRoot.querySelector(".folia-create-comment-footer");

    if (editorElem.value.length > 0) {
      fakeBtn.style.display = "none";
      footer.style.display = "flex";
      localStorage.setItem("folia-create-comment", editorElem.value);
    } else {
      fakeBtn.style.display = "block";
      footer.style.display = "none";
      localStorage.removeItem("folia-create-comment");
    }
    editorElem.style.height = "auto";
    editorElem.style.height = `${editorElem.scrollHeight}px`;
  }

  editorOnKeyDown(e) {
    e.stopPropagation();
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      this.submitComment();
    }
  }

  submitComment(e) {
    if (e) e.stopPropagation();
    this.#submited = true;
    const editor = this.shadowRoot.querySelector(".folia-create-comment-editor");
    if (!editor.value) return;

    const text = editor.value;
    editor.value = "";

    editor.style.height = "auto";
    const fakeBtn = this.shadowRoot.querySelector(".folia-create-comment-fake-btn");
    const footer = this.shadowRoot.querySelector(".folia-create-comment-footer");
    fakeBtn.style.display = "block";
    footer.style.display = "none";

    this.dispatchEvent(new CustomEvent("submit-comment", { detail: { text } }));
  }

  addSmile(e) {
    e.stopPropagation();
    const editor = this.shadowRoot.querySelector(".folia-create-comment-editor");
    const smiles = this.shadowRoot.querySelector(".folia-create-comment-smiles");
    const smilesCloseBtn = this.shadowRoot.querySelector(".folia-create-comment-smiles-header-close-btn");
    smiles.classList.toggle("shown", true);

    smilesCloseBtn.onclick = (e) => {
      smiles.classList.toggle("shown", false);
      editor.setSelectionRange(editor.value.length, editor.value.length);
      editor.focus();
    };
    smiles.onclick = (e) => {
      if (!e.target.classList.contains("folia-create-comment-smile")) return;
      editor.value += e.target.innerText;
    };
  }

  addMention(e) {
    console.log("TODO: addMention");
    e.stopPropagation();
  }
}

if ("customElements" in window) {
  customElements.define("folia-create-comment", FoliaCreateComment);
} else {
  throw new Error("Custom html element <folia-comment> is not supported.");
}

export default FoliaCreateComment;
