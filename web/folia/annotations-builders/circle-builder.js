import * as foliaAsyncRequest from "../folia-async-request";
import { hexColor2pdf, toPdfRect, viewPoint2pdfPoint } from "../folia-util";
import BaseBuilder from "./base-builder";
import { cloneDeep } from "lodash";
import { ANNOTATION_TYPES } from "../constants";

class CircleBuilder extends BaseBuilder {
  defaultPreset = { color: "#000000", lineWidth: 5, singleCreating: false };
  mouseIsDown = false;
  mouseIsMove = false;
  minWidth = 20;
  minHeight = 20;
  circles = [];

  static type = "circle";

  constructor(...props) {
    super(...props);
  }

  resume() {
    if (!this.canvas) {
      this.canvas = document.createElement("canvas");
      this.canvas.className = "annotation-builder-container";
      this.canvas.width = this.foliaPageLayer.pageDiv.clientWidth * window.devicePixelRatio;
      this.canvas.height = this.foliaPageLayer.pageDiv.clientHeight * window.devicePixelRatio;
      this.canvas.style.width = this.foliaPageLayer.pageDiv.clientWidth + "px";
      this.canvas.style.height = this.foliaPageLayer.pageDiv.clientHeight + "px";
      this.canvas.onclick = this.onMouseClick.bind(this);
      this.canvas.onmousedown = this.onMouseDown.bind(this);
      this.canvas.onmousemove = this.onMouseMove.bind(this);
      this.canvas.onmouseup = this.onMouseUp.bind(this);
    }
    this.foliaPageLayer.pageDiv.appendChild(this.canvas);
  }

  prepareAnnotations2save() {
    return this.circles.map(({ addedAt, color, lineWidth, rect }) => {
      const pdfRect = toPdfRect(
        [rect[0], rect[1], rect[2], rect[3]],
        this.viewport.width,
        this.viewport.height
      );
      return {
        __typename: ANNOTATION_TYPES.CIRCLE,
        addedAt,
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
    this.circles.push({
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
    this.circles.pop();
    this.circles.push({
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
    this.circles.pop();
    const prevState = { page: this.foliaPageLayer.pageNumber, data: this.circles.slice() };
    this.circles.push({
      addedAt: new Date().toISOString(),
      color: this.preset.color,
      lineWidth: this.preset.lineWidth,
      rect: [
        Math.min(this.startPoint.x, point.x),
        Math.min(this.startPoint.y, point.y),
        Math.max(Math.abs(point.x - this.startPoint.x), this.minWidth),
        Math.max(Math.abs(point.y - this.startPoint.y), this.minWidth),
      ],
    });

    const newState = { page: this.foliaPageLayer.pageNumber, data: this.circles.slice() };
    this.undoRedoManager.addToolStep(prevState, newState);

    window.requestAnimationFrame(() => this.draw());
  }

  applyUndoRedo(circles) {
    this.circles = circles.slice();
    window.requestAnimationFrame(() => this.draw());
  }

  draw() {
    const ctx = this.canvas.getContext("2d");
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.circles.forEach((circle) => {
      const { color, lineWidth, rect } = circle;
      ctx.save();
      ctx.beginPath();
      const x = rect[0] * window.devicePixelRatio + (rect[2] * window.devicePixelRatio) / 2;
      const y = rect[1] * window.devicePixelRatio + (rect[3] * window.devicePixelRatio) / 2;
      const radiusX = (rect[2] * window.devicePixelRatio) / 2;
      const radiusY = (rect[3] * window.devicePixelRatio) / 2;
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth * this.viewport.scale * window.devicePixelRatio;
      ctx.ellipse(x, y, radiusX, radiusY, 0, 0, 180);
      ctx.stroke();
      ctx.closePath();
      ctx.restore();
    });
  }
}

export default CircleBuilder;
