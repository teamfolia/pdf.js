import BaseAnnoObject from "./base";
import { fromPdfRect, hexColor2RGBA } from "../../folia-util";

class ImageObject extends BaseAnnoObject {
  rect;
  image;

  constructor(annoData, viewport, eventBus) {
    super(annoData, viewport, eventBus);

    const { rect, content, filename, newbie } = annoData;
    this.lineWidth = 0;
    this.no_corners = false;
    this.useFixedAspectRatio = true;

    this.rect = rect;
    this.content = content;
    this.filename = filename;
    this.newbie = newbie;

    const image = new Image();
    image.onload = () => {
      this.image = image;
    };
    if (content) image.src = `data:image/png;base64,${content}`;
  }

  update(annoData) {
    if (super.update(annoData)) {
      const { content = this.content, rect = this.rect } = annoData;

      this.rect = rect;
      this.content = content;
    }
  }

  toObjectData() {
    return {
      ...super.toObjectData(),
      rect: this.rect,
      content: this.content,
      filename: this.filename,
      newbie: this.newbie,
    };
  }

  toFloatingBarData() {
    return {
      ...super.toFloatingBarData(),
      bounds: this.getBoundingRect(),
    };
  }

  render(ctx) {
    if (!ctx) return;
    const rect = fromPdfRect(this.rect, this.viewport.width, this.viewport.height).map(
      (item) => item * window.devicePixelRatio
    );
    ImageObject._render(ctx, rect, this.image);
  }

  static _render(ctx, rect, image) {
    if (!image) return;
    ctx.drawImage(image, ...rect);
  }

  getBoundingRect() {
    const rect = fromPdfRect(this.rect, this.viewport.width, this.viewport.height);
    return ImageObject._getBoundingRect(rect);
  }

  static _getBoundingRect(rect) {
    const points = [
      { x: rect[0], y: rect[1] }, // left top
      { x: rect[0] + rect[2], y: rect[1] }, // right top
      { x: rect[0] + rect[2], y: rect[1] + rect[3] }, // right bottom
      { x: rect[0], y: rect[1] + rect[3] }, // left bottom
    ];

    return {
      left: rect[0],
      top: rect[1],
      width: rect[2],
      height: rect[3],
      right: rect[0] + rect[2],
      bottom: rect[1] + rect[3],
      points,
    };
  }
}

export default ImageObject;
