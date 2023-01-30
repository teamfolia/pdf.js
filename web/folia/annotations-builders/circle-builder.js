import * as foliaAsyncRequest from "../folia-async-request";
import { hexColor2pdf, toPdfRect, viewPoint2pdfPoint } from "../folia-util";
import BaseBuilder from "./base-builder";
import { cloneDeep } from "lodash";
import { ANNOTATION_TYPES } from "../constants";

class CircleBuilder extends BaseBuilder {
  defaultPreset = { color: "#000000", lineWidth: 5, singleCreating: false };
  mouseIsDown = false;
  mouseIsMove = false;
  minWidth = 30;
  minHeight = 30;
  circles = [];

  static type = "circle";

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
    return this.circles.map(({ color, lineWidth, rect }) => {
      rect[0] -= (lineWidth * this.foliaPageLayer.pdfViewerScale) / 2;
      rect[1] -= (lineWidth * this.foliaPageLayer.pdfViewerScale) / 2;
      rect[2] += lineWidth * this.foliaPageLayer.pdfViewerScale;
      rect[3] += lineWidth * this.foliaPageLayer.pdfViewerScale;
      const pdfRect = toPdfRect(rect, this.viewport.width, this.viewport.height);
      return {
        __typename: ANNOTATION_TYPES.CIRCLE,
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
    if (this.preset.singleCreating) this.stopCallback().catch(console.error);
  }

  draw() {
    const ctx = this.canvas.getContext("2d");
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.circles.forEach((circle) => {
      const { color, lineWidth, rect } = circle;
      ctx.save();
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth * this.foliaPageLayer.pdfViewerScale;
      const x = rect[0] + rect[2] / 2;
      const y = rect[1] + rect[3] / 2;
      const radiusX = rect[2] / 2;
      const radiusY = rect[3] / 2;
      ctx.ellipse(x, y, radiusX, radiusY, 0, 0, 180);
      ctx.stroke();
      ctx.closePath();
      ctx.restore();
    });
  }
}

export default CircleBuilder;
