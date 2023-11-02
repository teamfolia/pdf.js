import BaseAnnoObject from "./base";
import { fromPdfRect, hexColor2RGBA } from "../../folia-util";
import { HighlightKind } from "../../constants";

class HighlightObject extends BaseAnnoObject {
  lineWidth = 0;
  pdfImageData = new Map();

  kind;
  text;
  color;
  rects;

  constructor(annoData, viewport, eventBus) {
    super(annoData, viewport, eventBus);

    const { text, color, kind, rects } = annoData;
    this.text = text;
    this.color = color;
    this.kind = kind;
    this.rects = rects;
    this.no_corners = true;
    this.staticObject = true;
  }

  update(annoData) {
    if (super.update(annoData)) {
      const { text = this.text, color = this.color, kind = this.kind, rects = this.rects } = annoData;

      this.text = text;
      this.color = color;
      this.kind = kind;
      this.rects = rects;
    }
  }

  toObjectData() {
    return {
      ...super.toObjectData(),
      text: this.text,
      color: this.color,
      kind: this.kind,
      rects: this.rects,
    };
  }

  toFloatingBarData() {
    return {
      ...super.toFloatingBarData(),
      bounds: this.getBoundingRect(),
      color: this.color,
      kind: this.kind,
    };
  }

  render(ctx, pdfCanvas) {
    if (!ctx || !pdfCanvas) return;

    const { devicePixelRatio } = window;
    const { width, height, scale } = this.viewport;
    const clonedPdfCanvas = document.createElement("canvas");
    clonedPdfCanvas.width = width * devicePixelRatio;
    clonedPdfCanvas.height = height * devicePixelRatio;
    const pdfCtx = clonedPdfCanvas.getContext("2d", { willReadFrequently: true });
    pdfCtx.drawImage(
      pdfCanvas,
      0,
      0,
      pdfCanvas.width,
      pdfCanvas.height,
      0,
      0,
      width * devicePixelRatio,
      height * devicePixelRatio
    );

    const lineWidth = 2 * scale * devicePixelRatio;
    this.rects.forEach((pdfRect, index) => {
      const rect = fromPdfRect(pdfRect, width, height).map((item) => item * devicePixelRatio);
      if (rect[2] === 0 && rect[3] === 0) return;

      ctx.fillStyle = hexColor2RGBA(this.color);

      if (this.kind === HighlightKind.CROSSLINE) {
        ctx.fillRect(rect[0], rect[1] + rect[3] / 2 - lineWidth / 2, rect[2], lineWidth);
      } else if (this.kind === HighlightKind.UNDERLINE) {
        ctx.fillRect(rect[0], rect[1] + rect[3] - lineWidth, rect[2], lineWidth);
      } else if (this.kind === HighlightKind.MARKER) {
        ctx.globalCompositeOperation = "darken";
        const imageData = pdfCtx.getImageData(...rect);
        ctx.putImageData(imageData, rect[0], rect[1]);
        ctx.fillRect(...rect);
      }
    });
  }

  getBoundingRect() {
    return this.rects.reduce(
      (acc, pdfRect) => {
        const rect = fromPdfRect(pdfRect, this.viewport.width, this.viewport.height);
        return {
          left: Math.min(acc.left, rect[0]),
          top: Math.min(acc.top, rect[1]),
          right: Math.max(acc.right, rect[0] + rect[2]),
          bottom: Math.max(acc.bottom, rect[1] + rect[3]),
          width: Math.max(acc.right, rect[0] + rect[2]) - Math.min(acc.left, rect[0]),
          height: Math.max(acc.bottom, rect[1] + rect[3]) - Math.min(acc.top, rect[1]),
        };
      },
      { left: Infinity, right: -Infinity, top: Infinity, bottom: -Infinity, width: 0, height: 0 }
    );
  }

  move() {
    if (!this.canManage) return;
    // do nothing due to static object
  }

  resize() {
    if (!this.canManage) return;
    // do nothing due to static object
  }
}

export default HighlightObject;
