import { FOLIA_LAYER_ROLES } from "../folia-page-layer";
import FoliaBaseAnnotation from "./base-annotation";
import { ANNOTATION_TYPES } from "../constants";
import { toPdfRect, fromPdfRect } from "../folia-util";

class FoliaImageAnnotation extends FoliaBaseAnnotation {
  editablePropertiesList = ["rect"];
  image;
  imageSrc;
  fixedAspectRatio = true;

  constructor(...props) {
    super(...props);
    super.createAndAppendCanvas();
    super.buildBaseCorners();
    this.image = new Image();
    this.image.src = `data:image/png;base64,${this.annotationRawData.content}`;
  }

  deleteFromCanvas() {
    this.canvas.remove();
    super.deleteFromCanvas();
  }

  getRawData() {
    const { id, addedAt, deletedAt, collaboratorEmail, rect, page, filename, content } =
      this.annotationRawData;
    return {
      __typename: ANNOTATION_TYPES.IMAGE,
      id,
      addedAt: this.isDirty || addedAt,
      deletedAt,
      collaboratorEmail,
      page,
      rect,
      filename,
      content,
    };
  }

  updateRects() {
    const viewRect = [
      this.annotationDIV.offsetLeft,
      this.annotationDIV.offsetTop,
      this.annotationDIV.clientWidth,
      this.annotationDIV.clientHeight,
    ];

    this.annotationRawData.rect = toPdfRect(viewRect, this.viewport.width, this.viewport.height);
    super.updateRects();
    this.render();
  }

  getBoundingRect() {
    const rect = fromPdfRect(this.annotationRawData.rect, this.viewport.width, this.viewport.height);
    return {
      left: rect[0],
      top: rect[1],
      width: rect[2],
      height: rect[3],
    };
  }

  render() {
    const { width: viewportWidth, height: viewportHeight } = this.viewport;
    const [left, top, width, height] = fromPdfRect(
      this.annotationRawData.rect,
      viewportWidth,
      viewportHeight
    );
    this.annotationDIV.style.left = `${left}px`;
    this.annotationDIV.style.top = `${top}px`;
    this.annotationDIV.style.width = `${width}px`;
    this.annotationDIV.style.height = `${height}px`;

    if (this.updateRectsTimer) cancelAnimationFrame(this.updateRectsTimer);
    this.updateRectsTimer = requestAnimationFrame(() => this.canvasRender());
  }

  canvasRender() {
    this.canvas.width = this.canvas.width;
    const ctx = this.canvas.getContext("2d");
    const annoBoundingRect = this.getBoundingRect();
    const annoLeft = annoBoundingRect.left * window.devicePixelRatio;
    const annoTop = annoBoundingRect.top * window.devicePixelRatio;
    const annoWidth = annoBoundingRect.width * window.devicePixelRatio;
    const annoHeight = annoBoundingRect.height * window.devicePixelRatio;

    ctx.drawImage(this.image, annoLeft, annoTop, annoWidth, annoHeight);
  }
}

export default FoliaImageAnnotation;
