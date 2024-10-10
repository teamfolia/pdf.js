import { toPdfRect, hexColor2RGBA } from "../folia-util";
import BaseBuilder from "./base-builder";
import { ANNOTATION_TYPES } from "../constants";
import { colord } from "colord";

class CircleBuilder extends BaseBuilder {
  currentCircle = null;
  circles = [];
  minWidth = 20;
  minHeight = 20;

  constructor(...props) {
    super(...props);
  }

  resume() {
    if (!this.canvas) {
      this.canvas = document.createElement("canvas");
      this.canvas.className = "annotation-builder-container circle-builder";
      this.canvas.width = this.foliaPageLayer.parentNode.clientWidth * window.devicePixelRatio;
      this.canvas.height = this.foliaPageLayer.parentNode.clientHeight * window.devicePixelRatio;
      this.canvas.style.width = this.foliaPageLayer.parentNode.clientWidth + "px";
      this.canvas.style.height = this.foliaPageLayer.parentNode.clientHeight + "px";
      this.canvas.onclick = this.onMouseClick.bind(this);
      this.canvas.onmousedown = this.onMouseDown.bind(this);
      this.canvas.onmousemove = this.onMouseMove.bind(this);
      this.canvas.onmouseup = this.onMouseUp.bind(this);
      this.canvas.onmouseout = this.onMouseOut.bind(this);

      // Mobile Browsers
      this.canvas.ontouchstart = this.onMouseDown.bind(this); 
      this.canvas.ontouchmove = this.onMouseMove.bind(this);
      this.canvas.ontouchend = this.onMouseUp.bind(this); 
      this.canvas.touchcancel =  this.onMouseUp.bind(this);
      
    }
    this.foliaPageLayer.parentNode.appendChild(this.canvas);
    this.drawingStarted = false;
    this.mouseHasBeenMoved = false;
  }

  prepareAnnotations2save() {
    return this.circles.map(({ addedAt, color, lineWidth, startPoint, endPoint }) => {
      const rect = toPdfRect(
        [
          Math.min(startPoint.x, endPoint.x) - 0.5 * lineWidth,
          Math.min(startPoint.y, endPoint.y) - 0.5 * lineWidth,
          Math.max(Math.abs(startPoint.x - endPoint.x), lineWidth * 3) + lineWidth,
          Math.max(Math.abs(startPoint.y - endPoint.y), lineWidth * 3) + lineWidth,
        ],
        this.viewport.width,
        this.viewport.height
      );
      return {
        __typename: ANNOTATION_TYPES.CIRCLE,
        addedAt,
        lineWidth,
        color,
        rect,
      };
    });
  }
  applyUndoRedo(circles) {
    this.circles = circles.slice();
    // this.draw();
  }

  startDrawing(point) {
    this.currentCircle = {
      color: this.preset.color,
      lineWidth: this.preset.lineWidth,
      startPoint: point,
      endPoint: point,
    };
    this.drawingStarted = true;
  }

  stopDrawing() {
    const prevState = { page: this.foliaPageLayer.pageNumber, data: this.circles.slice() };
    const { startPoint, endPoint, lineWidth, color } = this.currentCircle;
    this.circles.push({
      color,
      addedAt: new Date().toISOString(),
      lineWidth,
      startPoint,
      endPoint,
    });
    this.currentCircle = null;
    this.drawingStarted = false;
    this.mouseHasBeenMoved = false;

    const newState = { page: this.foliaPageLayer.pageNumber, data: this.circles.slice() };
    this.undoRedoManager?.addToolStep(prevState, newState);
    // window.requestAnimationFrame(() => this.draw());
  }

  onMouseDown(e) {
    e.preventDefault();
    e.stopPropagation();
    const point = this.getRelativePoint(e);
    if (this.drawingStarted === true) {
      this.currentCircle.endPoint = point;
      this.stopDrawing();
    } else {
      this.startDrawing(point);
    }
  }

  onMouseMove(e) {
    e.preventDefault();
    e.stopPropagation();
    if (!this.drawingStarted) return;
    this.mouseHasBeenMoved = true;
    const point = this.getRelativePoint(e);
    this.currentCircle.endPoint = point;
    // window.requestAnimationFrame(() => this.draw());
  }

  onMouseUp(e) {
    e.preventDefault();
    e.stopPropagation();
    if (this.mouseHasBeenMoved) {
      const point = this.getRelativePoint(e);
      this.currentCircle.endPoint = point;
      this.stopDrawing();
    }
  }

  onMouseOut(e) {
    if (this.drawingStarted) this.stopDrawing();
  }

  draw(ctx) {
    // const ctx = this.canvas.getContext("2d");
    // ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.circles.forEach((circle) => this.drawCircle(ctx, circle));
    this.currentCircle && this.drawCircle(ctx, this.currentCircle, true);
  }

  drawCircle(ctx, circleData, isCurrent = false) {
    const { color, lineWidth, startPoint, endPoint } = circleData;
    const rect = [
      Math.min(startPoint.x, endPoint.x) * window.devicePixelRatio,
      Math.min(startPoint.y, endPoint.y) * window.devicePixelRatio,
      Math.abs(startPoint.x - endPoint.x) * window.devicePixelRatio,
      Math.abs(startPoint.y - endPoint.y) * window.devicePixelRatio,
    ];
    ctx.save();
    ctx.beginPath();
    const x = rect[0] + rect[2] / 2;
    const y = rect[1] + rect[3] / 2;
    const radiusX = rect[2] / 2;
    const radiusY = rect[3] / 2;
    if (isCurrent) ctx.globalAlpha = 0.75;
    ctx.strokeStyle = hexColor2RGBA(color);
    ctx.lineWidth = lineWidth * this.viewport.scale * window.devicePixelRatio;
    ctx.ellipse(x, y, radiusX, radiusY, 0, 0, 180);
    ctx.stroke();
    ctx.closePath();
    ctx.restore();
  }
}

export default CircleBuilder;
