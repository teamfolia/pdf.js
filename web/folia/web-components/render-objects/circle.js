import BaseAnnoObject from "./base";
import { fromPdfRect, hexColor2RGBA } from "../../folia-util";

class CircleObject extends BaseAnnoObject {
  color;
  lineWidth;
  rect;

  constructor(annoData, viewport, eventBus) {
    super(annoData, viewport, eventBus);

    const { color, lineWidth, rect } = annoData;
    this.color = color;
    this.lineWidth = lineWidth;
    this.rect = rect;
    this.no_corners = false;
  }

  update(annoData) {
    if (super.update(annoData)) {
      const { color = this.color, lineWidth = this.lineWidth, rect = this.rect } = annoData;

      this.color = color;
      this.lineWidth = lineWidth;
      this.rect = rect;
    }
  }

  toObjectData() {
    return {
      ...super.toObjectData(),
      rect: this.rect,
      lineWidth: this.lineWidth,
      color: this.color,
    };
  }

  toFloatingBarData() {
    return {
      ...super.toFloatingBarData(),
      bounds: this.getBoundingRect(),
      lineWidth: this.lineWidth,
      color: this.color,
    };
  }

  render(ctx) {
    if (!ctx) return;

    const annoBoundingRect = this.getBoundingRect();
    // const ctx = canvas.getContext("2d");
    const annoLeft = annoBoundingRect.left * window.devicePixelRatio;
    const annoTop = annoBoundingRect.top * window.devicePixelRatio;
    const annoWidth = annoBoundingRect.width * window.devicePixelRatio;
    const annoHeight = annoBoundingRect.height * window.devicePixelRatio;
    const x = annoLeft + annoWidth / 2;
    const y = annoTop + annoHeight / 2;
    const radiusX = annoWidth / 2;
    const radiusY = annoHeight / 2;

    ctx.beginPath();
    ctx.strokeStyle = hexColor2RGBA(this.color);
    ctx.lineWidth = this.lineWidth * this.viewport.scale * window.devicePixelRatio;
    ctx.ellipse(x, y, radiusX, radiusY, 0, 0, 180);
    ctx.stroke();
    ctx.closePath();
  }

  getBoundingRect() {
    const rect = fromPdfRect(this.rect, this.viewport.width, this.viewport.height);
    const left = rect[0];
    const top = rect[1];
    const right = rect[0] + rect[2];
    const bottom = rect[1] + rect[3];
    const halfOfWidth = (this.lineWidth / 2) * this.viewport.scale;

    return {
      left,
      top,
      right,
      bottom,
      width: right - left,
      height: bottom - top,
      points: [
        { x: left - halfOfWidth, y: top - halfOfWidth },
        { x: right + halfOfWidth, y: top - halfOfWidth },
        { x: right + halfOfWidth, y: bottom + halfOfWidth },
        { x: left - halfOfWidth, y: bottom + halfOfWidth },
      ],
    };
  }
}

export default CircleObject;
