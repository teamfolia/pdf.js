import html from "./folia-comment.html";

class FoliaComment extends HTMLElement {
  #template = null;
  #creating = false;
  #opened = false;
  #userName = "-";

  constructor() {
    super();
    const template = document.createElement("template");
    template.innerHTML = html;
    this.#template = template.content;
  }

  static get observedAttributes() {
    return ["creating", "opened", "userName"];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    console.log("attributeChangedCallback", { name, oldValue, newValue });
    switch (name) {
      case "creating": {
        this.#creating = newValue === "true";
        break;
      }
      case "opened": {
        this.#opened = newValue === "true";
        break;
      }
      case "userName": {
        this.#userName = newValue;
        break;
      }
      default:
        break;
    }
  }

  connectedCallback() {
    // console.log("connectedCallback");
    this.className = "folia-comment";
    this.append(this.#template);
    this.onclick = (e) => this.onMouseClick(e);

    const commentContainer = this.querySelector(".folia-comment-container");
    commentContainer.style.display = this.#creating ? "flex" : "none";

    const commentAnnot = this.querySelector(".folia-comment-annotation");
    commentAnnot.style.display = this.#opened ? "flex" : "none";

    if (this.#creating) {
      const textArea = this.querySelector(".folia-comment-editor");
      textArea.oninput = (e) => this.editorOnInput(e);
      textArea.onkeydown = (e) => this.editorOnKeyDown(e);

      const submitBtn = this.querySelector("button.folia-comment-submit");
      submitBtn.onclick = (e) => this.submitComment(e);

      const smileBtn = this.querySelector("button.folia-comment-smile");
      smileBtn.onclick = (e) => this.addSmile(e);
      const mentionBtn = this.querySelector("button.folia-comment-mention");
      mentionBtn.onclick = (e) => this.addMention(e);

      textArea.focus();
    }

    if (this.#opened) {
    }
  }

  disconnectedCallback() {}

  onMouseClick(e) {
    // console.log("onMouseClick", e.target);
    e.stopPropagation();
  }

  editorOnInput(e) {
    // console.log("textAreaOnInput", e.target.innerText);
    const fakeBtn = this.querySelector(".folia-comment-fake-btn");
    const footer = this.querySelector(".folia-comment-footer");

    if (e.target.innerText.length > 0) {
      fakeBtn.style.display = "none";
      footer.style.display = "flex";
    } else {
      fakeBtn.style.display = "block";
      footer.style.display = "none";
    }
    // e.target.style.height = "auto";
    // e.target.style.height = `${e.target.scrollHeight}px`;
  }

  editorOnKeyDown(e) {
    e.stopPropagation();
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      this.submitComment();
    }
  }

  submitComment(e) {
    console.log("submitComment", this);
    if (e) e.stopPropagation();
    const editor = this.querySelector(".folia-comment-editor");
    this.dispatchEvent(
      new CustomEvent("submit", {
        detail: {
          text: editor.innerHTML,
        },
      })
    );
  }

  addSmile(e) {
    console.log("addSmile");
    e.stopPropagation();
  }

  addMention(e) {
    console.log("addMention");
    e.stopPropagation();
  }
}

if ("customElements" in window) {
  customElements.define("folia-comment", FoliaComment);
} else {
  throw new Error("Custom html element <folia-comment> is not supported.");
}

export default FoliaComment;
