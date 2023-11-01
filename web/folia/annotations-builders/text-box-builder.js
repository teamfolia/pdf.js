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

  static placeholderText = "Type something";

  constructor(...props) {
    super(...props);
  }

  resume() {
    if (!this.builderContainer) {
      this.builderContainer = document.createElement("div");
      this.builderContainer.className = "annotation-builder-container text-box";
      this.builderContainer.setAttribute("data-role", FOLIA_LAYER_ROLES.FOLIA_BUILDER);
      this.builderContainer.style.position = "absolute";
      this.builderContainer.style.left = "0px";
      this.builderContainer.style.top = "0px";
      this.builderContainer.style.right = "0px";
      this.builderContainer.style.bottom = "0px";
      this.builderContainer.onmousedown = this.onMouseDown.bind(this);
      this.builderContainer.onmousemove = this.onMouseMove.bind(this);
      this.builderContainer.onmouseup = this.onMouseUp.bind(this);
    }
    this.foliaPageLayer.parentNode.appendChild(this.builderContainer);
    this.calculateMinTextHeight(TextBoxBuilder.placeholderText);
  }

  prepareAnnotations2save() {
    // console.log("prepareAnnotations2save", this.endPoint, this.beginPoint);
    if (!this.endPoint || !this.beginPoint) return [];
    const rect = [
      this.beginPoint.x,
      this.beginPoint.y,
      Math.min(
        this.rectIsCustom
          ? Math.max(this.endPoint.x - this.beginPoint.x, this.defaultWidth)
          : this.defaultWidth,
        this.viewport.width - this.beginPoint.x - 15
      ),
      this.minHeight,
    ];

    return [
      {
        __typename: ANNOTATION_TYPES.TEXT_BOX,
        text: "",
        color: this.preset.color,
        fontFamily: this.preset.fontFamily || FONT_FAMILY.MONOSPACE,
        fontSize: this.preset.fontSize,
        fontWeight: this.preset.fontWeight || FONT_WEIGHT.W400,
        textAlignment: this.preset.textAlignment || TEXT_ALIGNMENT.START,
        rect: toPdfRect(rect, this.viewport.width, this.viewport.height),
        doNotCommit: true,
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
    this.calculateMinTextHeight(TextBoxBuilder.placeholderText);
  }

  calculateMinTextHeight(text) {
    const fontSize = this.preset.fontSize * this.viewport.scale;
    const fontFamily = FONT_FAMILY[this.preset.fontFamily];
    const fontWeight = FONT_WEIGHT[this.preset.fontWeight];

    const canvas = document.createElement("canvas");
    canvas.width = this.viewport.width;
    canvas.height = this.viewport.height;
    const ctx = canvas.getContext("2d");
    ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
    const textRect = ctx.measureText(text);
    this.defaultWidth = textRect.width * 1.5;
    this.minHeight = textRect.fontBoundingBoxAscent + textRect.fontBoundingBoxDescent;
  }

  onMouseDown(e) {
    e.stopPropagation();
    this.rectIsCustom = false;
    this.mouseIsDown = true;
    this.beginPoint = this.getRelativePoint(e);
    this.endPoint = this.getRelativePoint(e);
  }

  onMouseMove(e) {
    if (!this.mouseIsDown) return;
    e.stopPropagation();
    this.rectIsCustom = true;
    this.endPoint = this.getRelativePoint(e);
    // requestAnimationFrame(() => this.draw());
  }

  onMouseUp(e) {
    e.stopPropagation();
    this.mouseIsDown = false;
    this.endPoint = this.getRelativePoint(e);
    this.foliaPageLayer.eventBus.dispatch("stop-drawing");
    // this.createEditor();
    // requestAnimationFrame(() => (this.builderContainer.style.backgroundImage = ""));
  }

  draw(ctx) {
    if (!this.beginPoint || !this.endPoint) return;
    this.rect = [
      Math.min(this.beginPoint.x, this.endPoint.x) * window.devicePixelRatio,
      Math.min(this.beginPoint.y, this.endPoint.y) * window.devicePixelRatio,
      Math.abs(this.endPoint.x - this.beginPoint.x) * window.devicePixelRatio,
      Math.abs(this.endPoint.y - this.beginPoint.y) * window.devicePixelRatio,
    ];

    // const canvas = document.createElement("canvas");
    // canvas.width = this.viewport.width;
    // canvas.height = this.viewport.height;
    // const ctx = canvas.getContext("2d");
    // ctx.clearRect(0, 0, canvas.width, canvas.height);
    // ctx.save();
    // ctx.beginPath();
    ctx.strokeStyle = "silver";
    ctx.lineWidth = 2 * window.devicePixelRatio;
    ctx.setLineDash([2, 2]);
    ctx.strokeRect(...this.rect);
    // ctx.closePath();
    // ctx.restore();
    // this.builderContainer.style.backgroundImage = `url("${canvas.toDataURL()}")`;
  }
}

export default TextBoxBuilder;
