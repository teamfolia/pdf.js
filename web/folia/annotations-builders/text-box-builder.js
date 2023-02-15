import { toPdfRect, hexColor2RGBA } from "../folia-util";
import BaseBuilder from "./base-builder";
import { ANNOTATION_TYPES } from "../constants";

const TEXT_ALIGNMENT = {
  START: "left",
  CENTER: "center",
  END: "right",
};

const FONT_WEIGHT = {
  W400: "normal",
  W600: "bold",
};

class TextBoxBuilder extends BaseBuilder {
  defaultPreset = { color: "#000000", lineWidth: 5, singleCreating: false };
  mouseIsDown = false;
  mouseIsMove = false;
  minWidth = 120;
  minHeight = 40;
  text = "";
  rect = [0, 0, this.minWidth, this.minHeight];

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

      this.canvas = document.createElement("canvas");
      this.canvas.width = this.foliaPageLayer.pageDiv.clientWidth;
      this.canvas.height = this.foliaPageLayer.pageDiv.clientHeight;
      this.canvas.onclick = this.onMouseClick.bind(this);
      this.canvas.onmousedown = this.onMouseDown.bind(this);
      this.canvas.onmousemove = this.onMouseMove.bind(this);
      this.canvas.onmouseup = this.onMouseUp.bind(this);
      this.canvas.style.cursor = "text";
      this.builderContainer.appendChild(this.canvas);
    }
    this.foliaPageLayer.pageDiv.appendChild(this.builderContainer);
  }

  prepareAnnotations2save() {
    if (!this.text) return [];
    return [
      {
        __typename: ANNOTATION_TYPES.TEXT_BOX,
        text: this.textArea.value,
        color: this.preset.color,
        fontFamily: this.preset.fontFamily,
        fontSize: this.preset.fontSize,
        fontWeight: this.preset.fontWeight,
        textAlignment: this.preset.textAlignment,
        rect: toPdfRect(this.rect, this.viewport.width, this.viewport.height),
      },
    ];
  }

  applyPreset(preset) {
    const availableProps = ["color", "fontFamily", "fontSize", "fontWeight", "textAlignment"];
    for (const propName of availableProps) {
      if (!preset.hasOwnProperty(propName)) continue;
      this.preset[propName] = preset[propName];
    }
    this.usePreset();
  }

  usePreset() {
    if (!this.textArea) return;
    this.textArea.style.color = this.preset.color;
    this.textArea.style.fontFamily = this.preset.fontFamily;
    const fontSize = this.preset.fontSize * this.foliaPageLayer.pdfViewerScale;
    this.textArea.style.fontSize = `${fontSize}px`;
    this.textArea.style.fontWeight = FONT_WEIGHT[this.preset.fontWeight];
    this.textArea.style.textAlign = TEXT_ALIGNMENT[this.preset.textAlignment];
    setTimeout(() => this.updateTextareaHeight(), 10);
  }

  updateTextareaHeight() {
    if (!this.textArea) return;
    this.textArea.style.height = "auto";
    const height = Math.max(this.textArea.scrollHeight, this.minHeight, this.rect[3]);
    this.textArea.style.height = height + "px";
  }

  addTextArea() {
    this.textArea = document.createElement("textarea");
    if (this.text) this.textArea.value = this.text;
    this.textArea.style.position = "absolute";
    this.textArea.style.left = this.rect[0] + "px";
    this.textArea.style.top = this.rect[1] + "px";
    this.textArea.style.width = Math.max(this.minWidth, this.rect[2]) + "px";
    this.textArea.style.height = Math.max(this.minHeight, this.rect[3]) + "px";
    this.textArea.style.border = "dashed 1px #999999";
    this.textArea.style.overflow = "hidden";
    this.textArea.style.outline = "none";
    // this.textArea.style.resize = "none";
    this.textArea.style.background = "transparent";
    this.textArea.oninput = () => this.updateTextareaHeight();
    this.usePreset();
    this.builderContainer.appendChild(this.textArea);
    setTimeout(() => this.textArea.focus(), 10);
  }

  onMouseDown(e) {
    // console.log("onMouseDown canvas");
    e.preventDefault();
    e.stopPropagation();

    if (this.textArea) return;

    this.mouseIsDown = true;
    this.startPoint = this.getRelativePoint(e);
    this.rect = [0, 0, this.minWidth, this.minHeight];
  }
  onMouseMove(e) {
    e.preventDefault();
    e.stopPropagation();
    if (!this.mouseIsDown) return;
    this.mouseIsMove = true;
    const point = this.getRelativePoint(e);
    this.rect = [
      Math.min(this.startPoint.x, point.x),
      Math.min(this.startPoint.y, point.y),
      Math.abs(point.x - this.startPoint.x),
      Math.abs(point.y - this.startPoint.y),
    ];
    window.requestAnimationFrame(() => this.draw());
  }
  onMouseUp(e) {
    e.preventDefault();
    e.stopPropagation();

    if (this.textArea) {
      this.text = this.textArea.value;
      this.foliaPageLayer.dataProxy.stopDrawing();
      return;
    }

    const point = this.getRelativePoint(e);
    this.rect[0] = Math.min(this.startPoint.x, point.x);
    this.rect[1] = Math.min(this.startPoint.y, point.y);
    // this.rect = [
    //   Math.min(this.startPoint.x, point.x),
    //   Math.min(this.startPoint.y, point.y),
    //   Math.abs(point.x - this.startPoint.x),
    //   Math.abs(point.y - this.startPoint.y),
    // ];
    this.mouseIsDown = false;
    this.mouseIsMove = false;

    const ctx = this.canvas.getContext("2d");
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.canvas.style.cursor = "text";

    this.addTextArea();
  }

  draw() {
    this.canvas.style.cursor = "default";
    const ctx = this.canvas.getContext("2d");
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.save();
    ctx.beginPath();
    ctx.strokeStyle = "#999999";
    ctx.lineWidth = 1 * this.foliaPageLayer.pdfViewerScale;
    ctx.setLineDash([2, 2]);
    ctx.strokeRect(...this.rect);
    ctx.closePath();
    ctx.restore();
  }
}

export default TextBoxBuilder;
