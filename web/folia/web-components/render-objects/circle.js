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
    return {
      left: rect[0],
      top: rect[1],
      width: rect[2],
      height: rect[3],
      right: rect[0] + rect[2],
      bottom: rect[1] + rect[3],
    };
  }
}

export default CircleObject;
