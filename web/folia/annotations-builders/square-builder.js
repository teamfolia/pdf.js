import { toPdfRect, hexColor2RGBA } from "../folia-util";
import BaseBuilder from "./base-builder";
import { ANNOTATION_TYPES } from "../constants";

class SquareBuilder extends BaseBuilder {
  currentSquare = null;
  squares = [];
  minWidth = 20;
  minHeight = 20;

  constructor(...props) {
    super(...props);
  }

  resume() {
    if (!this.canvas) {
      this.canvas = document.createElement("canvas");
      this.canvas.className = "annotation-builder-container square-builder";
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
    return this.squares.map(({ addedAt, color, lineWidth, startPoint, endPoint }) => {
      const rect = toPdfRect(
        [
          Math.min(startPoint.x, endPoint.x),
          Math.min(startPoint.y, endPoint.y),
          Math.max(Math.abs(startPoint.x - endPoint.x), lineWidth * 3),
          Math.max(Math.abs(startPoint.y - endPoint.y), lineWidth * 3),
        ],
        this.viewport.width,
        this.viewport.height
      );
      return {
        __typename: ANNOTATION_TYPES.SQUARE,
        addedAt,
        lineWidth,
        color,
        rect,
      };
    });
  }
  applyUndoRedo(squares) {
    this.squares = squares.slice();
    // this.draw();
  }

  startDrawing(point) {
    this.currentSquare = {
      color: this.preset.color,
      lineWidth: this.preset.lineWidth,
      startPoint: point,
      endPoint: point,
    };
    this.drawingStarted = true;
  }

  stopDrawing() {
    const prevState = { page: this.foliaPageLayer.pageNumber, data: this.squares.slice() };
    const { startPoint, endPoint, lineWidth, color } = this.currentSquare;
    this.squares.push({
      color,
      addedAt: new Date().toISOString(),
      lineWidth,
      startPoint,
      endPoint,
    });
    this.currentSquare = null;
    this.drawingStarted = false;
    this.mouseHasBeenMoved = false;

    const newState = { page: this.foliaPageLayer.pageNumber, data: this.squares.slice() };
    this.undoRedoManager?.addToolStep(prevState, newState);
    // window.requestAnimationFrame(() => this.draw());
  }

  onMouseDown(e) {
    e.preventDefault();
    e.stopPropagation();
    const point = this.getRelativePoint(e);
    if (this.drawingStarted === true) {
      this.currentSquare.endPoint = point;
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
    this.currentSquare.endPoint = point;
    // window.requestAnimationFrame(() => this.draw());
  }

  onMouseUp(e) {
    e.preventDefault();
    e.stopPropagation();
    if (this.mouseHasBeenMoved) {
      const point = this.getRelativePoint(e);
      this.currentSquare.endPoint = point;
      this.stopDrawing();
    }
  }

  onMouseOut(e) {
    if (this.drawingStarted) this.stopDrawing();
  }

  draw(ctx) {
    // const ctx = this.canvas.getContext("2d");
    // ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.squares.forEach((circle) => this.drawSquare(ctx, circle));
    this.currentSquare && this.drawSquare(ctx, this.currentSquare, true);
  }

  drawSquare(ctx, squareData, isCurrent = false) {
    const { color, lineWidth, startPoint, endPoint } = squareData;
    const rect = [
      Math.min(startPoint.x, endPoint.x) * window.devicePixelRatio,
      Math.min(startPoint.y, endPoint.y) * window.devicePixelRatio,
      Math.abs(startPoint.x - endPoint.x) * window.devicePixelRatio,
      Math.abs(startPoint.y - endPoint.y) * window.devicePixelRatio,
    ];
    ctx.save();
    ctx.beginPath();
    if (isCurrent) ctx.globalAlpha = 0.75;
    ctx.strokeStyle = hexColor2RGBA(color);
    ctx.lineWidth = lineWidth * this.viewport.scale * window.devicePixelRatio;
    ctx.strokeRect(...rect);
    ctx.stroke();
    ctx.closePath();
    ctx.restore();
  }
}

export default SquareBuilder;
