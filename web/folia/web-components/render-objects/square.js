import BaseAnnoObject from "./base";
import { fromPdfRect, hexColor2RGBA } from "../../folia-util";

class SquareObject extends BaseAnnoObject {
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

      this.rect = rect;
      this.lineWidth = lineWidth;
      this.color = color;
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
    const lineWidth = this.lineWidth * this.viewport.scale * window.devicePixelRatio;
    const color = hexColor2RGBA(this.color);
    rect = fromPdfRect(this.rect, this.viewport.width, this.viewport.height).map(
      (item) => item * window.devicePixelRatio
    );
    rect[0] += 0.5 * lineWidth;
    rect[1] += 0.5 * lineWidth;
    rect[2] -= lineWidth;
    rect[3] -= lineWidth;
    return SquareObject._render(ctx, rect, lineWidth, color);
  }

  static _render(ctx, rect, lineWidth, color) {
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineJoin = "miter";
    ctx.strokeRect(...rect);
  }

  getBoundingRect() {
    const rect = fromPdfRect(this.rect, this.viewport.width, this.viewport.height);
    const lineWidth = this.lineWidth * this.viewport.scale;
    return SquareObject._getBoundingRect(rect, lineWidth);
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

export default SquareObject;
