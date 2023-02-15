import { ANNOTATION_TYPES } from "../constants";
import { fromPdfRect, toPdfRect, hexColor2RGBA } from "../folia-util";
import FoliaBaseAnnotation from "./base-annotation";

class FoliaSquareAnnotation extends FoliaBaseAnnotation {
  editablePropertiesList = ["color", "lineWidth"];

  constructor(...props) {
    super(...props);
    this.annotationDIV.classList.add(this.annotationRawData.__typename);
    super.buildBaseCorners();
  }

  getRawData() {
    const viewRect = [
      this.annotationDIV.offsetLeft,
      this.annotationDIV.offsetTop,
      this.annotationDIV.clientWidth,
      this.annotationDIV.clientHeight,
    ];

    const rect = toPdfRect(viewRect, this.viewport.width, this.viewport.height);
    const { id, addedAt, deletedAt, collaboratorEmail, page, color, lineWidth } = this.annotationRawData;
    return {
      __typename: ANNOTATION_TYPES.SQUARE,
      id,
      addedAt: this.isDirty || addedAt,
      deletedAt,
      collaboratorEmail,
      page,
      color,
      lineWidth,
      rect,
    };
  }
  render() {
    const lineWidth = this.annotationRawData.lineWidth * this.foliaPageLayer.pdfViewerScale;
    const [left, top, width, height] = fromPdfRect(
      this.annotationRawData.rect,
      this.viewport.width,
      this.viewport.height,
      this.annotationRawData.lineWidth * this.foliaPageLayer.pdfViewerScale
    );

    this.annotationDIV.style.left = `${left - lineWidth / 2}px`;
    this.annotationDIV.style.top = `${top - lineWidth / 2}px`;
    this.annotationDIV.style.width = `${width + lineWidth}px`;
    this.annotationDIV.style.height = `${height + lineWidth}px`;
    this.draw();
  }
  draw() {
    this.annotationDIV.style.backgroundPosition = "center";
    this.annotationDIV.style.backgroundSize = `${this.annotationDIV.clientWidth}px ${this.annotationDIV.clientHeight}px`;
    this.annotationDIV.style.backgroundRepeat = "no-repeat";
    this.annotationDIV.style.backgroundImage = `url("${this.drawSquare()}")`;
  }
  drawSquare() {
    const lineWidth = this.annotationRawData.lineWidth * this.foliaPageLayer.pdfViewerScale;
    const canvas = document.createElement("canvas");
    canvas.width = this.annotationDIV.clientWidth;
    canvas.height = this.annotationDIV.clientHeight;
    const ctx = canvas.getContext("2d");
    ctx.strokeStyle = hexColor2RGBA(this.annotationRawData.color);
    ctx.lineWidth = lineWidth;
    ctx.strokeRect(
      lineWidth / 2,
      lineWidth / 2,
      this.annotationDIV.clientWidth - lineWidth,
      this.annotationDIV.clientHeight - lineWidth
    );
    return canvas.toDataURL("png");
  }
}

export default FoliaSquareAnnotation;
