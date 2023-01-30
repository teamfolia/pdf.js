import * as foliaAsyncRequest from "../folia-async-request";
import { hexColor2pdf, viewRect2pdfRect } from "../folia-util";
import BaseBuilder from "./base-builder";
import { cloneDeep } from "lodash";
import { colord } from "colord";

const FONT_WEIGHT_MAPPING = {
  100: "thin",
  200: "extralight",
  300: "light",
  400: "normal",
  500: "medium",
  600: "semibold",
  700: "bold",
  800: "extrabold",
  900: "black",
};

class TypewriterBuilder extends BaseBuilder {
  mouseIsDown = false;
  initialWidth = 150;
  textArea;

  static type = "typewriter";

  constructor(...props) {
    super(...props);
    this.resume();
  }

  resume() {
    if (!this.canvas) {
      this.canvas = document.createElement("div");
      this.canvas.className = "annotation-builder-container typewriter-builder";
      this.canvas.width = this.pageDiv.clientWidth;
      this.canvas.height = this.pageDiv.clientHeight;
      this.canvas.onclick = this.onMouseClick.bind(this);
    }
    this.pageDiv.appendChild(this.canvas);
  }

  prepareAnnotations2save() {
    // const color = hexColor2pdf(square.color)
    const viewRect = [
      this.textArea.offsetLeft,
      this.textArea.offsetTop,
      this.textArea.clientWidth,
      this.textArea.clientHeight,
    ];
    const rect = viewRect2pdfRect(viewRect, this.viewport);
    const css = window.getComputedStyle(this.textArea);

    return [
      {
        annoType: TypewriterBuilder.type,
        page: this.pageNumber,
        rect,
        contents: this.textArea.value,
        fontFamily: css.getPropertyValue("font-family"),
        fontSize: parseInt(css.getPropertyValue("font-size"), 10),
        fontWeight: FONT_WEIGHT_MAPPING[css.getPropertyValue("font-weight")],
        textAlign: css.getPropertyValue("text-align"),
        color: colord(css.getPropertyValue("color")).toHex(),
      },
    ];
  }

  onMouseClick(e) {}

  _onMouseClick(e) {
    if (this.textArea) {
      return;
    }
    const textArea = document.createElement("textarea");
    textArea.style.fontFamily = this.preset.fontFamily;
    textArea.style.fontSize = this.preset.fontSize + "pt";
    textArea.style.fontWeight = this.preset.fontWeight;
    textArea.style.textAlign = this.preset.textAlign;
    textArea.oninput = this.textAreaOnInput.bind(this);
    textArea.onclick = (e) => e.stopPropagation();
    textArea.rows = 3;
    textArea.style.height = "auto";
    textArea.style.left = e.offsetX + "px";
    textArea.style.top = e.offsetY + "px";
    this.canvas.appendChild(textArea);
    this.textArea = textArea;
    setTimeout(() => textArea.focus(), 0);
  }

  textAreaOnInput(e) {
    const textArea = e.target;
    textArea.style.height = "auto";
    textArea.style.height = textArea.scrollHeight + "px";
  }

  onMouseDown(e) {
    e.preventDefault();
    e.stopPropagation();
    this.mouseIsDown = true;
    this.startPoint = this.getRelativePoint(e);
    this.squares.push({
      color: this.preset.color,
      lineWidth: this.preset.lineWidth,
      rect: [this.startPoint.x, this.startPoint.y, this.minWidth, this.minHeight],
    });
  }
  onMouseMove(e) {
    e.preventDefault();
    e.stopPropagation();
    if (!this.mouseIsDown) return;
    this.mouseIsMove = true;
    const point = this.getRelativePoint(e);
    this.squares.pop();
    this.squares.push({
      color: this.preset.color,
      lineWidth: this.preset.lineWidth,
      rect: [
        Math.min(this.startPoint.x, point.x),
        Math.min(this.startPoint.y, point.y),
        Math.abs(point.x - this.startPoint.x),
        Math.abs(point.y - this.startPoint.y),
      ],
    });
    window.requestAnimationFrame(() => this.draw());
  }
  onMouseUp(e) {
    e.preventDefault();
    e.stopPropagation();
    this.mouseIsDown = false;
    this.mouseIsMove = false;
    if (this.preset.singleCreating) this.stop();
  }

  draw() {
    const ctx = this.canvas.getContext("2d");
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.squares.forEach((square) => {
      const { color, lineWidth, rect } = square;
      ctx.save();
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth * this.viewport.scale;
      ctx.strokeRect(...rect);
      ctx.closePath();
      ctx.restore();
    });
  }
}

export default TypewriterBuilder;
