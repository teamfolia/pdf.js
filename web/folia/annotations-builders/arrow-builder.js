import { toPdfPoint, hexColor2RGBA } from "../folia-util";
import BaseBuilder from "./base-builder";
import { ANNOTATION_TYPES } from "../constants";

class ArrowBuilder extends BaseBuilder {
  currentArrow = null;
  arrows = [];

  constructor(...props) {
    super(...props);
  }

  resume() {
    if (!this.canvas) {
      this.canvas = document.createElement("canvas");
      this.canvas.className = "annotation-builder-container arrow-builder";
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
    return this.arrows.map(({ color, lineWidth, sourcePoint, targetPoint, addedAt }) => {
      // increase each line side in a half of arrow width
      const deltaX = targetPoint.x - sourcePoint.x;
      const deltaY = targetPoint.y - sourcePoint.y;
      const hypotenuse = Math.sqrt(Math.pow(deltaX, 2) + Math.pow(deltaY, 2));
      const angleX = Math.asin(deltaX / hypotenuse);
      const angleY = Math.asin(deltaY / hypotenuse);
      const sourceDeltaX = ((lineWidth * this.viewport.scale) / 2) * Math.sin(angleX);
      const sourceDeltaY = ((lineWidth * this.viewport.scale) / 2) * Math.sin(angleY);
      const sp = {
        x: sourcePoint.x /** - sourceDeltaX, */,
        y: sourcePoint.y /** - sourceDeltaY, */,
      };
      const tp = {
        x: targetPoint.x /** + sourceDeltaX, */,
        y: targetPoint.y /** + sourceDeltaY, */,
      };
      return {
        __typename: ANNOTATION_TYPES.ARROW,
        addedAt,
        color,
        lineWidth,
        sourcePoint: toPdfPoint(sp, this.viewport.width, this.viewport.height),
        targetPoint: toPdfPoint(tp, this.viewport.width, this.viewport.height),
      };
    });
  }
  applyUndoRedo(arrows) {
    this.arrows = arrows.slice();
    // this.draw();
  }

  startDrawing(sourcePoint) {
    this.currentArrow = {
      color: this.preset.color,
      lineWidth: this.preset.lineWidth,
      sourcePoint: sourcePoint,
      targetPoint: null,
    };
    this.drawingStarted = true;
  }

  stopDrawing() {
    const prevState = { page: this.foliaPageLayer.pageNumber, data: this.arrows.slice() };
    this.arrows.push({
      color: this.currentArrow.color,
      lineWidth: this.currentArrow.lineWidth,
      sourcePoint: this.currentArrow.sourcePoint,
      targetPoint: this.currentArrow.targetPoint,
      addedAt: new Date().toISOString(),
    });
    this.currentArrow = null;
    this.drawingStarted = false;
    this.mouseHasBeenMoved = false;

    const newState = { page: this.foliaPageLayer.pageNumber, data: this.arrows.slice() };
    this.undoRedoManager?.addToolStep(prevState, newState);
    // window.requestAnimationFrame(() => this.draw());
  }

  onMouseDown(e) {
    e.preventDefault();
    e.stopPropagation();
    const point = this.getRelativePoint(e);
    if (this.drawingStarted === true) {
      this.currentArrow.targetPoint = point;
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
    this.currentArrow.targetPoint = this.getRelativePoint(e);
    // window.requestAnimationFrame(() => this.draw());
  }

  onMouseUp(e) {
    e.preventDefault();
    e.stopPropagation();
    if (this.mouseHasBeenMoved) {
      this.currentArrow.targetPoint = this.getRelativePoint(e);
      this.stopDrawing();
    }
  }

  onMouseOut(e) {
    if (this.drawingStarted) this.stopDrawing();
  }

  draw(ctx) {
    // const ctx = this.canvas.getContext("2d");
    // ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.arrows.forEach((arrow) => this.drawArrow(ctx, arrow));
    this.currentArrow && this.drawArrow(ctx, this.currentArrow, true);
  }

  drawArrow(ctx, arrowData, isCurrent = false) {
    if (!arrowData.sourcePoint || !arrowData.targetPoint) return;

    const lineWidth = arrowData.lineWidth * this.viewport.scale * window.devicePixelRatio;
    const sourceX = arrowData.sourcePoint.x * window.devicePixelRatio;
    const sourceY = arrowData.sourcePoint.y * window.devicePixelRatio;
    const targetX = arrowData.targetPoint.x * window.devicePixelRatio;
    const targetY = arrowData.targetPoint.y * window.devicePixelRatio;
    const annotationWidth = Math.abs(targetX - sourceX);
    const annotationHeight = Math.abs(targetY - sourceY);
    const annotationAgle = Math.atan(annotationHeight / annotationWidth);
    const arrowLength = Math.sqrt(Math.pow(annotationWidth, 2) + Math.pow(annotationHeight, 2));

    const lineFactor = Math.max(lineWidth, 5);
    const arrowHeight = lineFactor * 3.7;
    const arrowLeavesHeight = arrowHeight / 6.5;
    const arrowAngle = (63 * Math.PI) / 180;
    const cornersRadius = lineFactor / 6;

    const outSideLine = arrowHeight / Math.cos(arrowAngle / 2);
    const x1 =
      sourceX <= targetX
        ? targetX - outSideLine * Math.cos(annotationAgle - arrowAngle / 2)
        : targetX + outSideLine * Math.cos(annotationAgle - arrowAngle / 2);

    const y1 =
      sourceY <= targetY
        ? targetY - outSideLine * Math.sin(annotationAgle - arrowAngle / 2)
        : targetY + outSideLine * Math.sin(annotationAgle - arrowAngle / 2);

    const x2 =
      sourceX <= targetX
        ? targetX - outSideLine * Math.cos(annotationAgle + arrowAngle / 2)
        : targetX + outSideLine * Math.cos(annotationAgle + arrowAngle / 2);

    const y2 =
      sourceY <= targetY
        ? targetY - outSideLine * Math.sin(annotationAgle + arrowAngle / 2)
        : targetY + outSideLine * Math.sin(annotationAgle + arrowAngle / 2);

    const x3 =
      sourceX <= targetX
        ? targetX - (arrowHeight - arrowLeavesHeight) * Math.cos(annotationAgle)
        : targetX + (arrowHeight - arrowLeavesHeight) * Math.cos(annotationAgle);

    const y3 =
      sourceY <= targetY
        ? targetY - (arrowHeight - arrowLeavesHeight) * Math.sin(annotationAgle)
        : targetY + (arrowHeight - arrowLeavesHeight) * Math.sin(annotationAgle);

    // ctx.save();
    if (isCurrent) ctx.globalAlpha = 0.75;
    ctx.strokeStyle = hexColor2RGBA(arrowData.color);
    ctx.fillStyle = hexColor2RGBA(arrowData.color);
    ctx.lineWidth = lineWidth;

    ctx.beginPath();
    ctx.moveTo(x3, y3);
    ctx.arcTo(x2, y2, targetX, targetY, cornersRadius);
    ctx.arcTo(targetX, targetY, x1, y1, cornersRadius);
    ctx.arcTo(x1, y1, x3, y3, cornersRadius);
    ctx.closePath();
    ctx.fill();

    if (arrowLength >= arrowHeight - arrowLeavesHeight) {
      // arrow annotation foot calc
      const t1x =
        sourceX <= targetX
          ? sourceX - (lineWidth / 2) * Math.cos(annotationAgle + (90 * Math.PI) / 180)
          : sourceX + (lineWidth / 2) * Math.cos(annotationAgle + (90 * Math.PI) / 180);

      const t1y =
        sourceY <= targetY
          ? sourceY - (lineWidth / 2) * Math.sin(annotationAgle + (90 * Math.PI) / 180)
          : sourceY + (lineWidth / 2) * Math.sin(annotationAgle + (90 * Math.PI) / 180);

      const t2x =
        sourceX <= targetX
          ? sourceX - (lineWidth / 2) * Math.cos(annotationAgle - (90 * Math.PI) / 180)
          : sourceX + (lineWidth / 2) * Math.cos(annotationAgle - (90 * Math.PI) / 180);

      const t2y =
        sourceY <= targetY
          ? sourceY - (lineWidth / 2) * Math.sin(annotationAgle - (90 * Math.PI) / 180)
          : sourceY + (lineWidth / 2) * Math.sin(annotationAgle - (90 * Math.PI) / 180);

      const arrowBaseAngle = Math.asin(
        arrowLeavesHeight / Math.sqrt(Math.pow(Math.abs(x3 - x1), 2) + Math.pow(Math.abs(y3 - y1), 2))
      );

      const theigth = (lineWidth / 2) * Math.tan(arrowBaseAngle);
      const tlen = Math.sqrt(Math.pow(lineWidth / 2, 2) + Math.pow(theigth, 2));
      const t3x =
        sourceX <= targetX
          ? x3 - tlen * Math.cos(annotationAgle - arrowBaseAngle + (90 * Math.PI) / 180)
          : x3 + tlen * Math.cos(annotationAgle - arrowBaseAngle + (90 * Math.PI) / 180);
      const t3y =
        sourceY <= targetY
          ? y3 - tlen * Math.sin(annotationAgle - arrowBaseAngle + (90 * Math.PI) / 180)
          : y3 + tlen * Math.sin(annotationAgle - arrowBaseAngle + (90 * Math.PI) / 180);
      const t4x =
        sourceX <= targetX
          ? x3 - tlen * Math.cos(annotationAgle + arrowBaseAngle - (90 * Math.PI) / 180)
          : x3 + tlen * Math.cos(annotationAgle + arrowBaseAngle - (90 * Math.PI) / 180);
      const t4y =
        sourceY <= targetY
          ? y3 - tlen * Math.sin(annotationAgle + arrowBaseAngle - (90 * Math.PI) / 180)
          : y3 + tlen * Math.sin(annotationAgle + arrowBaseAngle - (90 * Math.PI) / 180);
      ctx.beginPath();
      ctx.moveTo(x3, y3);
      ctx.lineTo(t3x, t3y);
      ctx.lineTo(t1x, t1y);
      ctx.lineTo(t2x, t2y);
      ctx.lineTo(t4x, t4y);
      ctx.closePath();
      ctx.fill();
    }
    // ctx.restore();
  }
}

export default ArrowBuilder;
