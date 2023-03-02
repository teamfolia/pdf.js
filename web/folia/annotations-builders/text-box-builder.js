import { toPdfRect } from "../folia-util";
import BaseBuilder from "./base-builder";
import { ANNOTATION_TYPES, FONT_FAMILY, FONT_WEIGHT, TEXT_ALIGNMENT } from "../constants";
import { doc } from "prettier";

class TextBoxBuilder extends BaseBuilder {
  defaultPreset = { color: "#000000", lineWidth: 5, singleCreating: false };
  mouseIsDown = false;
  mouseIsMove = false;
  text = "";
  rect = [];

  static MIN_WIDTH = 250;
  static MIN_HEIGHT = 150;

  constructor(...props) {
    super(...props);
  }

  resume() {
    if (!this.builderContainer) {
      this.builderContainer = document.createElement("div");
      this.builderContainer.className = "annotation-builder-container";
      this.builderContainer.style.position = "absolute";
      this.builderContainer.style.left = "0px";
      this.builderContainer.style.top = "0px";
      this.builderContainer.style.right = "0px";
      this.builderContainer.style.bottom = "0px";
      this.builderContainer.onmousedown = this.onMouseDown.bind(this);
      this.builderContainer.onmousemove = this.onMouseMove.bind(this);
      this.builderContainer.onmouseup = this.onMouseUp.bind(this);
    }
    this.foliaPageLayer.pageDiv.appendChild(this.builderContainer);
  }

  prepareAnnotations2save() {
    if (!this.text) return [];
    this.rect[2] = this.textArea.clientWidth;
    this.rect[3] = this.textArea.clientHeight;
    return [
      {
        __typename: ANNOTATION_TYPES.TEXT_BOX,
        text: this.textArea.value,
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
    if (this.textArea) {
      this.text = this.textArea.value;
    }
    super.stop();
  }

  applyPreset(preset = {}) {
    const availableProps = ["color", "fontFamily", "fontSize", "fontWeight", "textAlignment"];
    for (const propName of availableProps) {
      if (!preset.hasOwnProperty(propName)) continue;
      this.preset[propName] = preset[propName];
    }

    if (!this.textArea) return;
    this.textArea.style.color = this.preset.color;
    this.textArea.style.fontFamily = FONT_FAMILY[this.preset.fontFamily];
    const fontSize = this.preset.fontSize * this.viewport.scale;
    this.textArea.style.fontSize = `${fontSize * 0.55}px`;
    this.textArea.style.fontWeight = FONT_WEIGHT[this.preset.fontWeight];
    this.textArea.style.textAlign = TEXT_ALIGNMENT[this.preset.textAlignment];

    this.calculateMinTextHeight();
  }

  calculateMinTextHeight() {
    const fontSize = this.preset.fontSize * this.viewport.scale;
    const textArea = document.createElement("textarea");
    textArea.rows = 1;
    textArea.style.border = " dashed 5px silver";
    textArea.style.overflow = "hidden";
    textArea.rows = 1;
    textArea.style.outline = "none";
    textArea.style.visibility = "hidden";
    textArea.style.fontFamily = FONT_FAMILY[this.preset.fontFamily];
    textArea.style.fontSize = `${fontSize * 0.55}px`;
    textArea.style.fontWeight = FONT_WEIGHT[this.preset.fontWeight];
    textArea.style.height = "1em";
    this.builderContainer.appendChild(textArea);
    TextBoxBuilder.MIN_HEIGHT = textArea.getBoundingClientRect().height;
  }

  adjustHeight() {
    if (!this.textArea) return;
    if (this.heightIsCustom) return;
    this.textArea.style.height = "auto";
    const height = Math.max(this.textArea.scrollHeight, TextBoxBuilder.MIN_HEIGHT);
    this.textArea.style.height = height + "px";
  }

  addTextArea() {
    this.textArea = document.createElement("textarea");
    this.textArea.placeholder = "Type something";
    if (this.text) this.textArea.value = this.text;
    this.textArea.style.border = "dashed 2px silver";
    this.textArea.style.overflow = "hidden";
    this.textArea.rows = 1;
    this.textArea.style.outline = "none";
    this.textArea.style.background = "transparent";
    this.textArea.style.resize = "none";
    this.textArea.oninput = () => this.adjustHeight();
    this.textArea.style.position = "absolute";

    const width = Math.abs(this.stopPoint.x - this.startPoint.x);
    const height = Math.abs(this.stopPoint.y - this.startPoint.y);
    this.rect = [
      Math.min(this.startPoint.x, this.stopPoint.x),
      Math.min(this.startPoint.y, this.stopPoint.y),
      Math.max(width, TextBoxBuilder.MIN_WIDTH),
      Math.max(height, TextBoxBuilder.MIN_HEIGHT),
    ];

    this.textArea.style.left = this.rect[0] + "px";
    this.textArea.style.top = this.rect[1] + "px";
    this.textArea.style.width = Math.max(TextBoxBuilder.MIN_WIDTH, this.rect[2]) + "px";
    if (height <= TextBoxBuilder.MIN_HEIGHT) {
      this.heightIsCustom = false;
      this.textArea.style.height = "auto";
    } else {
      this.heightIsCustom = true;
      this.textArea.style.height = `${height}px`;
    }

    this.applyPreset();
    this.builderContainer.appendChild(this.textArea);
    setTimeout(() => this.textArea.focus(), 10);
  }

  onMouseDown(e) {
    if (this.textArea) return;
    e.preventDefault();
    e.stopPropagation();
    this.mouseIsDown = true;
    this.startPoint = this.getRelativePoint(e);
  }

  onMouseMove(e) {
    if (!this.mouseIsDown) return;
    e.preventDefault();
    e.stopPropagation();
    this.mouseIsMove = true;
    this.stopPoint = this.getRelativePoint(e);
    requestAnimationFrame(() => this.draw());
  }

  onMouseUp(e) {
    if (this.textArea && e.target.tagName === "TEXTAREA") return;
    if (this.textArea) {
      this.text = this.textArea.value;
      this.foliaPageLayer.eventBus.dispatch("stop-drawing");
      return;
    }

    e.preventDefault();
    e.stopPropagation();
    this.mouseIsDown = false;
    this.mouseIsMove = false;

    this.stopPoint = this.getRelativePoint(e);
    this.addTextArea();
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
    ctx.strokeStyle = "#999999";
    ctx.lineWidth = 1 * this.viewport.scale;
    ctx.setLineDash([2, 2]);
    ctx.strokeRect(...this.rect);
    ctx.closePath();
    ctx.restore();
    this.builderContainer.style.backgroundImage = `url("${canvas.toDataURL()}")`;
  }
}

export default TextBoxBuilder;
