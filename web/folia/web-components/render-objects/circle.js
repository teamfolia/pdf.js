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
    const rect = fromPdfRect(this.rect, this.viewport.width, this.viewport.height).map(
      (item) => item * window.devicePixelRatio
    );
    const lineWidth = this.lineWidth * this.viewport.scale * window.devicePixelRatio;
    const color = hexColor2RGBA(this.color);
    return CircleObject._render(ctx, rect, lineWidth, color);
  }

  static _render(ctx, rect, lineWidth, color) {
    const x = rect[0] + rect[2] / 2;
    const y = rect[1] + rect[3] / 2;
    const radiusX = (rect[2] - 0.5 * lineWidth) / 2;
    const radiusY = (rect[3] - 0.5 * lineWidth) / 2;

    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.ellipse(x, y, radiusX, radiusY, 0, 0, 180);
    ctx.stroke();
    ctx.closePath();
  }

  getBoundingRect() {
    const rect = fromPdfRect(this.rect, this.viewport.width, this.viewport.height);
    const lineWidth = this.lineWidth * this.viewport.scale;
    return CircleObject._getBoundingRect(rect, lineWidth);
  }

  static _getBoundingRect(rect, lineWidth) {
    const left = rect[0];
    const top = rect[1];
    const right = rect[0] + rect[2];
    const bottom = rect[1] + rect[3];

    return {
      left,
      top,
      right,
      bottom,
      width: right - left,
      height: bottom - top,
      points: [
        { x: left - lineWidth / 2, y: top - lineWidth / 2 },
        { x: right + lineWidth / 2, y: top - lineWidth / 2 },
        { x: right + lineWidth / 2, y: bottom + lineWidth / 2 },
        { x: left - lineWidth / 2, y: bottom + lineWidth / 2 },
      ],
    };
  }
}

export default CircleObject;
