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

    // const ctx = canvas.getContext("2d");
    const { left, top, width, height } = this.getBoundingRect();

    ctx.strokeStyle = hexColor2RGBA(this.color);
    ctx.lineWidth = this.lineWidth * this.viewport.scale * window.devicePixelRatio;
    ctx.lineJoin = "miter";
    ctx.strokeRect(
      left * window.devicePixelRatio,
      top * window.devicePixelRatio,
      width * window.devicePixelRatio,
      height * window.devicePixelRatio
    );
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

export default SquareObject;
