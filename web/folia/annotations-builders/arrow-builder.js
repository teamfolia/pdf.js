import { toPdfPoint } from "../folia-util";
import BaseBuilder from "./base-builder";
import { ANNOTATION_TYPES } from "../constants";

class ArrowBuilder extends BaseBuilder {
  mouseIsDown = false;
  mouseIsMove = false;
  sourcePoint;
  targetPoint;
  arrows = [];

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
    return this.arrows.map(({ color, lineWidth, sourcePoint, targetPoint }) => {
      // increase each line side in a half of arrow width
      const deltaX = targetPoint.x - sourcePoint.x;
      const deltaY = targetPoint.y - sourcePoint.y;
      const hypotenuse = Math.sqrt(Math.pow(deltaX, 2) + Math.pow(deltaY, 2));
      const angleX = Math.asin(deltaX / hypotenuse);
      const angleY = Math.asin(deltaY / hypotenuse);
      const sourceDeltaX = ((lineWidth * this.viewport.scale) / 2) * Math.sin(angleX);
      const sourceDeltaY = ((lineWidth * this.viewport.scale) / 2) * Math.sin(angleY);
      const sp = {
        x: sourcePoint.x - sourceDeltaX,
        y: sourcePoint.y - sourceDeltaY,
      };
      const tp = {
        x: targetPoint.x + sourceDeltaX,
        y: targetPoint.y + sourceDeltaY,
      };
      return {
        __typename: ANNOTATION_TYPES.ARROW,
        color,
        lineWidth,
        sourcePoint: toPdfPoint(sp, this.viewport.width, this.viewport.height),
        targetPoint: toPdfPoint(tp, this.viewport.width, this.viewport.height),
      };
    });
  }
  checkMinLength(sourcePoint, targetPoint) {
    const LENGTH_FACTOR = 5;
    const minArrowLength = Math.max(this.preset.lineWidth * LENGTH_FACTOR, 20);
    const cat1 = Math.abs(sourcePoint.x - targetPoint.x) || 10;
    const cat2 = Math.abs(sourcePoint.y - targetPoint.y) || 10;
    const arrowLength = Math.sqrt(Math.pow(cat1, 2) + Math.pow(cat2, 2));

    if (arrowLength < minArrowLength) {
      const angle1 = Math.asin(cat1 / arrowLength);
      const angle2 = Math.asin(cat2 / arrowLength);
      const cat1new = minArrowLength * Math.sin(angle1) * (sourcePoint.x >= targetPoint.x ? -1 : 1);
      const cat2new = minArrowLength * Math.sin(angle2) * (sourcePoint.y >= targetPoint.y ? -1 : 1);
      const _targetPoint = { x: sourcePoint.x + cat1new, y: sourcePoint.y + cat2new };
      return { sourcePoint, targetPoint: _targetPoint };
    } else {
      return { sourcePoint, targetPoint };
    }
  }
  onMouseDown(e) {
    e.preventDefault();
    e.stopPropagation();
    this.mouseIsDown = true;
    this.sourcePoint = this.targetPoint = this.getRelativePoint(e);
    this.arrows.push({
      color: this.preset.color,
      lineWidth: this.preset.lineWidth,
      sourcePoint: this.sourcePoint,
      targetPoint: this.targetPoint,
    });
  }
  onMouseMove(e) {
    e.preventDefault();
    e.stopPropagation();
    if (!this.mouseIsDown) return;
    this.mouseIsMove = true;
    this.targetPoint = this.getRelativePoint(e);
    this.arrows[this.arrows.length - 1] = {
      color: this.preset.color,
      lineWidth: this.preset.lineWidth,
      sourcePoint: this.sourcePoint,
      targetPoint: this.targetPoint,
    };
    window.requestAnimationFrame(() => this.draw());
  }
  onMouseUp(e) {
    e.preventDefault();
    e.stopPropagation();
    this.mouseIsDown = false;
    this.mouseIsMove = false;

    this.arrows.pop();
    const prevState = { page: this.foliaPageLayer.pageNumber, data: this.arrows.slice() };
    const { sourcePoint, targetPoint } = this.checkMinLength(this.sourcePoint, this.targetPoint);

    this.arrows.push({
      color: this.preset.color,
      lineWidth: this.preset.lineWidth,
      sourcePoint,
      targetPoint,
    });

    const newState = { page: this.foliaPageLayer.pageNumber, data: this.arrows.slice() };
    this.undoRedoManager.addToolStep(prevState, newState);

    window.requestAnimationFrame(() => this.draw());

    this.sourcePoint = this.targetPoint = null;
  }

  applyUndoRedo(arrows) {
    this.arrows = arrows.slice();
    this.draw();
  }

  draw() {
    const ctx = this.canvas.getContext("2d");
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.arrows.forEach((arrow) => {
      const { color, lineWidth, sourcePoint, targetPoint } = arrow;
      const _lineWidth = lineWidth * this.viewport.scale;
      ctx.save();
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = color;
      const arrowheadFactor = 1.3;
      let dx = targetPoint.x - sourcePoint.x;
      let dy = targetPoint.y - sourcePoint.y;
      const dlen = Math.sqrt(dx * dx + dy * dy);
      dx = dx / dlen;
      dy = dy / dlen;
      const headLen = arrowheadFactor * _lineWidth;
      const hpx0 = targetPoint.x + headLen * dy - headLen * dx;
      const hpy0 = targetPoint.y - headLen * dx - headLen * dy;
      const hpx1 = targetPoint.x - headLen * dy - headLen * dx;
      const hpy1 = targetPoint.y + headLen * dx - headLen * dy;

      ctx.beginPath();
      ctx.lineWidth = _lineWidth * 0.4;
      ctx.moveTo(sourcePoint.x, sourcePoint.y);
      ctx.lineTo(targetPoint.x, targetPoint.y);
      ctx.moveTo(hpx0, hpy0);
      ctx.lineTo(targetPoint.x, targetPoint.y);
      ctx.lineTo(hpx1, hpy1);
      ctx.stroke();
      ctx.restore();
      ctx.closePath();
    });
  }
}

export default ArrowBuilder;
