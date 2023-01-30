import { cloneDeep } from "lodash";
import * as foliaAsyncRequest from "../folia-async-request";
import { viewRect2pdfRect } from "../folia-util";
import BaseBuilder from "./base-builder";
import conversationTemplate from "!!raw-loader!./conversation-builder-template.html";

class ConversationBuilder extends BaseBuilder {
  defaultPreset = { singleCreating: false };
  template;
  rect = [];
  initialComment = "";

  static type = "conversation";

  constructor(...props) {
    super(...props);
    this.resume();
  }

  resume() {
    if (!this.canvas) {
      this.canvas = document.createElement("div");
      this.canvas.className = "annotation-builder-container annotation-builder-conversation";
      this.canvas.style.width = this.pageDiv.clientWidth + "px";
      this.canvas.style.height = this.pageDiv.clientHeight + "px";
      this.canvas.onclick = this.onMouseClick.bind(this);

      const template = document.createElement("template");
      template.innerHTML = conversationTemplate;
      this.template = template.content;
    }
    this.pageDiv.appendChild(this.canvas);
  }

  prepareAnnotations2save() {
    return [
      {
        rect: viewRect2pdfRect(this.rect, this.viewport),
        initialComment: this.initialComment,
      },
    ];
  }

  onMouseClick(e) {
    if (!e.target.classList.contains("annotation-builder-container")) return;
    e.preventDefault();
    e.stopPropagation();
    this.canvas.querySelectorAll(".comment-body").forEach((el) => el.remove());
    const point = this.getRelativePoint(e);
    this.canvas.appendChild(this.template.cloneNode(true));
    const conversation = this.canvas.querySelector(".comment-body");
    const scrollXOffset = this.canvas.parentNode.parentNode.parentNode.scrollLeft;
    const scrollYOffset = this.canvas.parentNode.parentNode.parentNode.scrollTop;
    let left = point.x + scrollXOffset - 10;
    let top = point.y + scrollYOffset - 20;

    if (left + conversation.clientWidth > this.canvas.clientWidth)
      left -= left + conversation.clientWidth - this.canvas.clientWidth;
    if (left < 5) left = 5;
    if (top + conversation.clientHeight > this.canvas.clientHeight)
      top -= top + conversation.clientHeight - this.canvas.clientHeight;
    if (top < 5) top = 5;

    conversation.style.left = left + "px";
    conversation.style.top = top + "px";

    const avatar = conversation.querySelector(".comment-avatar");
    foliaAsyncRequest
      .getActiveUser()
      .then((user) => (avatar.style.backgroundImage = `url("${user.avatarUrl}")`))
      .catch(console.error);

    const fakeBtn = conversation.querySelector(".fake-btn");
    const saveBtn = conversation.querySelector(".save-btn");
    const cancelBtn = conversation.querySelector(".cancel-btn");
    const commentBottom = conversation.querySelector(".comment-bottom");
    const textArea = conversation.querySelector("textarea");
    textArea.oninput = (e) => {
      textArea.style.height = "auto";
      textArea.style.height = textArea.scrollHeight + "px";
      if (textArea.value.length > 0) {
        fakeBtn.style.display = "none";
        commentBottom.style.display = "flex";
      } else {
        fakeBtn.style.display = "flex";
        commentBottom.style.display = "none";
      }
    };
    cancelBtn.onclick = saveBtn.onclick = (e) => {
      e.stopPropagation();
      if (e.target.classList.contains("save-btn")) {
        this.initialComment = textArea.value;
        this.rect = [
          conversation.offsetLeft,
          conversation.offsetTop,
          conversation.clientWidth,
          conversation.clientHeight,
        ];
        if (this.preset.singleCreating)
          this.foliaPageLayer.foliaDataStorage.stopCreatingAnnotation().catch(console.error);
      }

      textArea.value = "";
      textArea.style.height = "auto";
      textArea.style.height = textArea.scrollHeight + "px";
      fakeBtn.style.display = "flex";
      commentBottom.style.display = "none";
    };
    textArea.focus();
  }
}

export default ConversationBuilder;
