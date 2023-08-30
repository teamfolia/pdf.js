import { toPdfRect, blob2base64 } from "../folia-util";
import BaseBuilder from "./base-builder";
import { ANNOTATION_TYPES } from "../constants";

class ImageBuilder extends BaseBuilder {
  defaultPreset = {};

  constructor(...props) {
    super(...props);
  }

  resume() {
    if (!this.canvas) {
      this.canvas = document.createElement("div");
      this.canvas.className = "annotation-builder-container";
      this.canvas.width = this.foliaPageLayer.pageDiv.clientWidth;
      this.canvas.height = this.foliaPageLayer.pageDiv.clientHeight;
      this.canvas.onclick = this.onMouseClick.bind(this);
      this.canvas.onmousemove = this.onMouseMove.bind(this);
    }
    this.foliaPageLayer.pageDiv.appendChild(this.canvas);

    const image = new Image();
    image.style.width = "100%";
    image.style.height = "100%";
    image.onload = () => {
      const imageRatio = image.naturalWidth / image.naturalHeight;
      let imageWidth = image.naturalWidth;
      let imageHeight = image.naturalHeight;

      if (imageWidth >= imageHeight && imageWidth > this.viewport.width / 3) {
        imageWidth = this.viewport.width / 3;
        imageHeight = imageWidth / imageRatio;
      } else if (imageWidth < imageHeight && imageHeight > this.viewport.height / 3) {
        imageHeight = this.viewport.height / 3;
        imageWidth = imageHeight * imageRatio;
      }

      this.canvas.onmouseover = this.onMouseOver.bind(this);
      this.canvas.onmouseout = this.onMouseOut.bind(this);
      this.placeholder = document.createElement("div");
      this.placeholder.style.width = imageWidth + "px";
      this.placeholder.style.height = imageHeight + "px";
      this.placeholder.style.position = "absolute";
      this.placeholder.style.opacity = "0.7";
      this.placeholder.style.display = "none";
      this.placeholder.appendChild(image);
      this.canvas.appendChild(this.placeholder);
    };
    image.src = URL.createObjectURL(this.asset);
  }

  prepareAnnotations2save() {
    return this.annotationData ? [this.annotationData] : [];
  }

  onMouseClick(e) {
    e.stopPropagation();
    e.preventDefault();
    if (!this.placeholder) return;

    let { x, y } = this.getRelativePoint(e);
    const width = this.placeholder.clientWidth;
    const height = this.placeholder.clientHeight;
    let left = x - width - 5;
    if (left < 5) left = 5;
    if (left + width + 5 > this.viewport.width) left = this.viewport.width - width - 5;

    let top = y - height - 5;
    if (top < 5) top = 5;
    if (top + height + 5 > this.viewport.height) top = this.viewport.height - height - 5;

    blob2base64(this.asset, (base64content) => {
      this.annotationData = {
        __typename: ANNOTATION_TYPES.IMAGE,
        rect: toPdfRect([left, top, width, height], this.viewport.width, this.viewport.height),
        filename: this.asset.name,
        content: base64content.split(",")[1],
        newbie: true,
      };
      this.foliaPageLayer.eventBus.dispatch("stop-drawing");
    });
  }

  onMouseOver(e) {
    this.placeholder.style.display = "block";
  }

  onMouseOut(e) {
    this.placeholder.style.display = "none";
  }

  onMouseMove(e) {
    e.preventDefault();
    e.stopPropagation();
    if (!this.placeholder) return;
    const point = this.getRelativePoint(e);
    this.placeholder.style.display = "block";
    window.requestAnimationFrame(() => this.draw(point));
  }

  draw(point) {
    let left = point.x - this.placeholder.clientWidth - 5;
    let top = point.y - this.placeholder.clientHeight - 5;

    if (left < 5) left = 5;
    if (top < 5) top = 5;

    this.placeholder.style.left = left + "px";
    this.placeholder.style.top = top + "px";
  }
}

export default ImageBuilder;
