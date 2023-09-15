import { ANNOTATION_TYPES } from "../constants";
import { fromPdfRect, toPdfRect, hexColor2RGBA } from "../folia-util";
import FoliaBaseAnnotation from "./base-annotation";

class FoliaCircleAnnotation extends FoliaBaseAnnotation {
  editablePropertiesList = ["color", "lineWidth", "rect"];

  constructor(...props) {
    super(...props);
    this.annotationDIV.classList.add(this.annotationRawData.__typename);
    super.buildBaseCorners();
  }

  getRawData() {
    return {
      __typename: ANNOTATION_TYPES.CIRCLE,
      id: this.annotationRawData.id,
      addedAt: this.isDirty || this.annotationRawData.addedAt,
      deletedAt: this.annotationRawData.deletedAt,
      collaboratorEmail: this.annotationRawData.collaboratorEmail,
      page: this.annotationRawData.page,
      color: this.annotationRawData.color,
      lineWidth: this.annotationRawData.lineWidth,
      rect: this.annotationRawData.rect,
    };
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

  updateRects() {
    const lineWidth = this.annotationRawData.lineWidth * this.viewport.scale;
    const viewRect = [
      this.annotationDIV.offsetLeft + lineWidth / 2,
      this.annotationDIV.offsetTop + lineWidth / 2,
      this.annotationDIV.clientWidth - lineWidth,
      this.annotationDIV.clientHeight - lineWidth,
    ];
    this.annotationRawData.rect = toPdfRect(viewRect, this.viewport.width, this.viewport.height);
    if (this.updateRectsTimer) cancelAnimationFrame(this.updateRectsTimer);
    this.updateRectsTimer = requestAnimationFrame(() => this.canvasRender());
  }

  canvasRender() {
    // console.log("render circle", [x, y], [radiusX, radiusY]);
    const canvas = document.createElement("canvas");
    canvas.width = this.pdfCanvas.width;
    canvas.height = this.pdfCanvas.height;
    const lineWidth = this.annotationRawData.lineWidth * this.viewport.scale * window.devicePixelRatio;
    const ctx = canvas.getContext("2d");
    const annoBoundingRect = this.getBoundingRect();
    const annoLeft = annoBoundingRect.left * window.devicePixelRatio;
    const annoTop = annoBoundingRect.top * window.devicePixelRatio;
    const annoWidth = annoBoundingRect.width * window.devicePixelRatio;
    const annoHeight = annoBoundingRect.height * window.devicePixelRatio;
    const x = annoLeft + annoWidth / 2;
    const y = annoTop + annoHeight / 2;
    const radiusX = annoWidth / 2;
    const radiusY = annoHeight / 2;

    ctx.beginPath();
    ctx.strokeStyle = hexColor2RGBA(this.annotationRawData.color);
    ctx.lineWidth = lineWidth;
    ctx.ellipse(x, y, radiusX, radiusY, 0, 0, 180);
    ctx.stroke();
    ctx.closePath();

    const annotationCanvas = document.createElement("canvas");
    annotationCanvas.width = annoWidth + lineWidth;
    annotationCanvas.height = annoHeight + lineWidth;
    const annotationCtx = annotationCanvas.getContext("2d");
    annotationCtx.putImageData(
      ctx.getImageData(
        annoLeft - lineWidth / 2,
        annoTop - lineWidth / 2,
        annoWidth + lineWidth,
        annoHeight + lineWidth
      ),
      0,
      0
    );
    this.annotationDIV.style.backgroundImage = `url("${annotationCanvas.toDataURL("png")}")`;
  }

  render() {
    super.render();
    if (this.updateRectsTimer) cancelAnimationFrame(this.updateRectsTimer);
    this.updateRectsTimer = requestAnimationFrame(() => this.canvasRender());
  }
}

export default FoliaCircleAnnotation;
