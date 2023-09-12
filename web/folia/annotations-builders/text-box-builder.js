import { toPdfRect } from "../folia-util";
import BaseBuilder from "./base-builder";
import { ANNOTATION_TYPES, FONT_FAMILY, FONT_WEIGHT, TEXT_ALIGNMENT } from "../constants";
import { FOLIA_LAYER_ROLES } from "../folia-page-layer";

class TextBoxBuilder extends BaseBuilder {
  defaultPreset = { color: "#000000", lineWidth: 5, singleCreating: false };
  mouseIsDown = false;
  mouseIsMove = false;
  text = "";
  rect = [];
  rectIsCustom = false;

  static placeholderText = "Type something";

  constructor(...props) {
    super(...props);
  }

  resume() {
    if (!this.builderContainer) {
      this.builderContainer = document.createElement("div");
      this.builderContainer.className = "annotation-builder-container";
      this.builderContainer.setAttribute("data-role", FOLIA_LAYER_ROLES.FOLIA_BUILDER);
      this.builderContainer.style.position = "absolute";
      this.builderContainer.style.left = "0px";
      this.builderContainer.style.top = "0px";
      this.builderContainer.style.right = "0px";
      this.builderContainer.style.bottom = "0px";
      this.builderContainer.onmousedown = this.onMouseDown.bind(this);
      this.builderContainer.onmousemove = this.onMouseMove.bind(this);
      this.builderContainer.onmouseup = this.onMouseUp.bind(this);
      // console.log();
    }
    this.foliaPageLayer.pageDiv.appendChild(this.builderContainer);
    this.calculateMinTextHeight(TextBoxBuilder.placeholderText);
  }

  prepareAnnotations2save() {
    if (!this.text) return [];
    this.rect[0] -= 1;
    this.rect[1] -= 1;
    this.rect[2] = this.editor.clientWidth;
    this.rect[3] = this.editor.clientHeight;
    return [
      {
        __typename: ANNOTATION_TYPES.TEXT_BOX,
        text: this.editor.innerText,
        color: this.preset.color,
        fontFamily: this.preset.fontFamily || FONT_FAMILY.MONOSPACE,
        fontSize: this.preset.fontSize,
        fontWeight: this.preset.fontWeight || FONT_WEIGHT.W400,
        textAlignment: this.preset.textAlignment || TEXT_ALIGNMENT.START,
        rect: toPdfRect(this.rect, this.viewport.width, this.viewport.height),
      },
    ];
  }

  stop() {
    if (this.editor) this.text = this.editor.innerText;
    super.stop();
  }

  applyPreset(preset = {}) {
    const availableProps = ["color", "fontFamily", "fontSize", "fontWeight", "textAlignment"];
    for (const propName of availableProps) {
      if (!preset.hasOwnProperty(propName)) continue;
      this.preset[propName] = preset[propName];
    }

    if (!this.editor) return;
    const fontSize = this.preset.fontSize * this.viewport.scale;
    this.editor.style.color = this.preset.color;
    this.editor.style.fontFamily = FONT_FAMILY[this.preset.fontFamily];
    this.editor.style.fontSize = `${fontSize}px`;
    this.editor.style.fontWeight = FONT_WEIGHT[this.preset.fontWeight];
    this.editor.style.textAlign = TEXT_ALIGNMENT[this.preset.textAlignment];
    // this.editor.style.setProperty("--annotation-color", this.preset.color);
    this.calculateMinTextHeight(TextBoxBuilder.placeholderText);
    if (!this.editor.innerText) {
      const width = Math.min(this.minWidth, this.builderContainer.clientWidth - this.rect[0] - 10);
      this.editor.style.width = width + "px";
    }
    this.adjustHeight();
  }

  calculateMinTextHeight(text) {
    const fontSize = this.preset.fontSize * this.viewport.scale;
    const fontFamily = FONT_FAMILY[this.preset.fontFamily];
    const fontWeight = FONT_WEIGHT[this.preset.fontWeight];

    const canvas = document.createElement("canvas");
    canvas.width = this.builderContainer.clientWidth;
    canvas.height = this.builderContainer.clientHeight;
    const ctx = canvas.getContext("2d");
    ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
    const textRect = ctx.measureText(text);
    this.minWidth = textRect.width * 1.5;
    this.minHeight = textRect.fontBoundingBoxAscent + textRect.fontBoundingBoxDescent;
    // console.log("textRect", this.preset.fontSize, this.minWidth, textRect);
  }

  adjustHeight() {
    if (!this.editor) return;
    if (this.heightIsCustom) return;
    this.editor.style.height = "auto";
    const height = Math.max(this.editor.scrollHeight, this.minHeight);
    this.editor.style.height = height + "px";
    this.rect[3] = height;
    // console.log("adjustHeight", height + "px");
  }

  createEditor() {
    if (this.editor) return;
    const width = Math.max(Math.abs(this.stopPoint.x - this.startPoint.x), this.minWidth);
    const height = Math.max(Math.abs(this.stopPoint.y - this.startPoint.y), this.minHeight);
    const left = Math.min(this.startPoint.x, this.stopPoint.x);
    const right = Math.min(this.startPoint.y, this.stopPoint.y);
    const leftCorrection = Math.max(0, left + width - (this.builderContainer.clientWidth - 10));
    this.rect = [left - leftCorrection, right, width, height];

    this.editor = document.createElement("div");
    this.editor.setAttribute("contenteditable", "");
    this.editor.setAttribute("data-role", FOLIA_LAYER_ROLES.ANNOTATION_EDITOR);
    this.editor.className = "text-box-editor";
    this.editor.setAttribute("text-box-placeholder", TextBoxBuilder.placeholderText);
    // if (this.text) this.editor.innerText = this.text;
    this.editor.oninput = () => this.adjustHeight();
    this.editor.onpaste = (e) => {
      e.preventDefault();
      e.target.innerText = e.clipboardData.getData("text/plain");
    };

    this.editor.style.left = this.rect[0] + "px";
    this.editor.style.top = this.rect[1] + "px";
    this.editor.style.width = this.rect[2] + "px";
    // this.editor.style.height = this.rect[3] + "px";

    this.applyPreset();
    this.builderContainer.appendChild(this.editor);
    setTimeout(() => {
      this.adjustHeight();
      this.editor.focus();
    }, 10);
  }

  onMouseDown(e) {
    e.stopPropagation();
    if (this.editor || e.target.dataset["role"] === FOLIA_LAYER_ROLES.ANNOTATION_EDITOR) {
      return;
    }
    this.mouseIsDown = true;
    this.startPoint = this.getRelativePoint(e);
  }

  onMouseMove(e) {
    e.stopPropagation();
    if (this.editor || e.target.dataset["role"] === FOLIA_LAYER_ROLES.ANNOTATION_EDITOR) {
      return;
    }
    if (!this.mouseIsDown) return;
    this.rectIsCustom = true;
    this.stopPoint = this.getRelativePoint(e);
    requestAnimationFrame(() => this.draw());
  }

  onMouseUp(e) {
    e.stopPropagation();
    if (this.editor && e.target.dataset["role"] === FOLIA_LAYER_ROLES.FOLIA_BUILDER) {
      return this.foliaPageLayer.eventBus.dispatch("stop-drawing");
    }

    this.mouseIsDown = false;
    this.stopPoint = this.getRelativePoint(e);
    this.createEditor();
    requestAnimationFrame(() => (this.builderContainer.style.backgroundImage = ""));
  }

  draw() {
    this.rect = [
      Math.min(this.startPoint.x, this.stopPoint.x),
      Math.min(this.startPoint.y, this.stopPoint.y),
      Math.abs(this.stopPoint.x - this.startPoint.x),
      Math.abs(this.stopPoint.y - this.startPoint.y),
    ];

    const canvas = document.createElement("canvas");
    canvas.width = this.builderContainer.clientWidth;
    canvas.height = this.builderContainer.clientHeight;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.beginPath();
    ctx.strokeStyle = "silver";
    ctx.lineWidth = 1 * this.viewport.scale;
    ctx.setLineDash([2, 2]);
    ctx.strokeRect(...this.rect);
    ctx.closePath();
    ctx.restore();
    this.builderContainer.style.backgroundImage = `url("${canvas.toDataURL()}")`;
  }
}

export default TextBoxBuilder;
