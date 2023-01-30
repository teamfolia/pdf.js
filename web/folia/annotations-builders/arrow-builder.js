import * as foliaAsyncRequest from "../folia-async-request";
import { hexColor2RGBA, toPdfPoint } from "../folia-util";
import BaseBuilder from "./base-builder";
import { cloneDeep } from "lodash";
import * as turf from "@turf/turf";
import { ANNOTATION_TYPES } from "../constants";

class ArrowBuilder extends BaseBuilder {
  mouseIsDown = false;
  mouseIsMove = false;
  sourcePoint;
  targetPoint;
  arrows = [];

  static type = "arrow";

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
      const sourceDeltaX = (lineWidth / 2) * Math.sin(angleX);
      const sourceDeltaY = (lineWidth / 2) * Math.sin(angleY);
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
    this.sourcePoint = this.targetPoint = null;
  }

  draw() {
    const ctx = this.canvas.getContext("2d");
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.arrows.forEach((arrow) => {
      const { color, lineWidth, sourcePoint, targetPoint } = arrow;
      ctx.save();
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth * this.foliaPageLayer.pdfViewerScale;
      const arrowheadFactor = 1.3;
      let dx = targetPoint.x - sourcePoint.x;
      let dy = targetPoint.y - sourcePoint.y;
      const dlen = Math.sqrt(dx * dx + dy * dy);
      dx = dx / dlen;
      dy = dy / dlen;
      const headLen = arrowheadFactor * ctx.lineWidth;
      const hpx0 = targetPoint.x + headLen * dy - headLen * dx;
      const hpy0 = targetPoint.y - headLen * dx - headLen * dy;
      const hpx1 = targetPoint.x - headLen * dy - headLen * dx;
      const hpy1 = targetPoint.y + headLen * dx - headLen * dy;

      ctx.beginPath();
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
