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
  async render() {
    const [left, top, width, height] = fromPdfRect(
      this.annotationRawData.rect,
      this.viewport.width,
      this.viewport.height,
      this.annotationRawData.lineWidth * this.foliaPageLayer.pdfViewerScale
    );
    // console.log("square render", [left, top, width, height], hexColor2RGBA(this.annotationRawData.color))
    this.annotationDIV.style.left = `${left}px`;
    this.annotationDIV.style.top = `${top}px`;
    this.annotationDIV.style.width = `${width}px`;
    this.annotationDIV.style.height = `${height}px`;
    this.draw();
  }
  async draw() {
    this.annotationDIV.style.backgroundPosition = "center";
    this.annotationDIV.style.backgroundSize = `${this.annotationDIV.clientWidth}px ${this.annotationDIV.clientHeight}px`;
    this.annotationDIV.style.backgroundRepeat = "no-repeat";
    this.annotationDIV.style.backgroundImage = `url("${this.drawSquare()}")`;
    // this.isDirty
    //   ? this.annotationDIV.classList.add("changed")
    //   : this.annotationDIV.classList.remove("changed");
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
