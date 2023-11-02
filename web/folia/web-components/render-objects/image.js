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
    if (!ctx || !this.image) return;

    // const ctx = canvas.getContext("2d");
    const { left, top, width, height } = this.getBoundingRect();

    ctx.drawImage(
      this.image,
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

export default ImageObject;
