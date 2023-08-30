import { ANNOTATION_TYPES } from "../constants";
import { fromPdfRect, toPdfRect, hexColor2RGBA } from "../folia-util";
import FoliaBaseAnnotation from "./base-annotation";

class FoliaSquareAnnotation extends FoliaBaseAnnotation {
  editablePropertiesList = ["color", "lineWidth", "rect"];

  constructor(...props) {
    super(...props);
    this.annotationDIV.classList.add(this.annotationRawData.__typename);
    super.buildBaseCorners();
  }

  getRawData() {
    const { id, addedAt, deletedAt, collaboratorEmail, page, rect, color, lineWidth } =
      this.annotationRawData;
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

  updateRects() {
    const viewRect = [
      this.annotationDIV.offsetLeft,
      this.annotationDIV.offsetTop,
      this.annotationDIV.clientWidth,
      this.annotationDIV.clientHeight,
    ];

    this.annotationRawData.rect = toPdfRect(viewRect, this.viewport.width, this.viewport.height);
    this.render();
    super.updateRects();
  }

  render() {
    // console.time("render square");
    const [left, top, width, height] = fromPdfRect(
      this.annotationRawData.rect,
      this.viewport.width,
      this.viewport.height
    );

    this.annotationDIV.style.left = `${left}px`;
    this.annotationDIV.style.top = `${top}px`;
    this.annotationDIV.style.width = `${width}px`;
    this.annotationDIV.style.height = `${height}px`;

    this.annotationDIV.style.backgroundPosition = "center";
    this.annotationDIV.style.backgroundSize = `${width}px ${height}px`;
    this.annotationDIV.style.backgroundRepeat = "no-repeat";
    this.annotationDIV.style.backgroundImage = `url("${this.generateSquareImage()}")`;
    // console.timeEnd("render square");
  }

  generateSquareImage() {
    const lineWidth = this.annotationRawData.lineWidth * this.viewport.scale * window.devicePixelRatio;
    const canvas = document.createElement("canvas");
    canvas.width = this.annotationDIV.clientWidth * window.devicePixelRatio;
    canvas.height = this.annotationDIV.clientHeight * window.devicePixelRatio;
    const ctx = canvas.getContext("2d");
    ctx.strokeStyle = hexColor2RGBA(this.annotationRawData.color);
    ctx.lineWidth = lineWidth;
    ctx.strokeRect(lineWidth / 2, lineWidth / 2, canvas.width - lineWidth, canvas.height - lineWidth);
    return canvas.toDataURL("png");
  }
}

export default FoliaSquareAnnotation;
