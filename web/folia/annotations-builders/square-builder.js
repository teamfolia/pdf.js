import { toPdfRect, hexColor2RGBA } from "../folia-util";
import BaseBuilder from "./base-builder";
import { ANNOTATION_TYPES } from "../constants";

class SquareBuilder extends BaseBuilder {
  defaultPreset = { color: "#000000", lineWidth: 5, singleCreating: false };
  mouseIsDown = false;
  mouseIsMove = false;
  minWidth = 20;
  minHeight = 20;
  squares = [];

  static type = "square";

  constructor(...props) {
    super(...props);
  }

  resume() {
    if (!this.canvas) {
      this.canvas = document.createElement("canvas");
      this.canvas.className = "annotation-builder-container";
      this.canvas.width = this.foliaPageLayer.pageDiv.clientWidth;
      this.canvas.height = this.foliaPageLayer.pageDiv.clientHeight;
      this.canvas.onclick = this.onMouseClick.bind(this);
      this.canvas.onmousedown = this.onMouseDown.bind(this);
      this.canvas.onmousemove = this.onMouseMove.bind(this);
      this.canvas.onmouseup = this.onMouseUp.bind(this);
    }
    this.foliaPageLayer.pageDiv.appendChild(this.canvas);
  }

  prepareAnnotations2save() {
    return this.squares.map(({ color, lineWidth, rect }) => {
      const pdfRect = toPdfRect(
        [
          rect[0] - (lineWidth * this.viewport.scale) / 2,
          rect[1] - (lineWidth * this.viewport.scale) / 2,
          rect[2] + lineWidth * this.viewport.scale,
          rect[3] + lineWidth * this.viewport.scale,
        ],
        this.viewport.width,
        this.viewport.height
      );

      return {
        __typename: ANNOTATION_TYPES.SQUARE,
        lineWidth,
        color,
        rect: pdfRect,
      };
    });
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

    const point = this.getRelativePoint(e);
    this.squares.pop();
    const prevState = { page: this.foliaPageLayer.pageNumber, data: this.squares.slice() };
    this.squares.push({
      color: this.preset.color,
      lineWidth: this.preset.lineWidth,
      rect: [
        Math.min(this.startPoint.x, point.x),
        Math.min(this.startPoint.y, point.y),
        Math.max(Math.abs(point.x - this.startPoint.x), this.minWidth),
        Math.max(Math.abs(point.y - this.startPoint.y), this.minHeight),
      ],
    });
    const newState = { page: this.foliaPageLayer.pageNumber, data: this.squares.slice() };
    this.undoRedoManager.addToolStep(prevState, newState);

    window.requestAnimationFrame(() => this.draw());
  }

  applyUndoRedo(squares) {
    this.squares = squares;
    this.draw();
  }

  draw() {
    const ctx = this.canvas.getContext("2d");
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.squares.forEach((square) => {
      const lineWidth = square.lineWidth * this.viewport.scale;
      ctx.save();
      ctx.beginPath();
      ctx.strokeStyle = hexColor2RGBA(square.color);
      ctx.lineWidth = lineWidth * 0.4;
      ctx.strokeRect(...square.rect);
      ctx.closePath();
      ctx.restore();
    });
  }
}

export default SquareBuilder;
