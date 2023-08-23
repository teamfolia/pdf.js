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
    const viewRect = [
      this.annotationDIV.offsetLeft,
      this.annotationDIV.offsetTop,
      this.annotationDIV.clientWidth,
      this.annotationDIV.clientHeight,
    ];

    const rect = toPdfRect(viewRect, this.viewport.width, this.viewport.height);
    const { id, addedAt, deletedAt, collaboratorEmail, page, color, lineWidth } = this.annotationRawData;
    return {
      __typename: ANNOTATION_TYPES.CIRCLE,
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
    // console.time("render circle");
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
    this.annotationDIV.style.backgroundImage = `url("${this.generateCircleImage()}")`;
    // console.timeEnd("render circle");
  }

  generateCircleImage() {
    const lineWidth = this.annotationRawData.lineWidth * this.viewport.scale * window.devicePixelRatio;
    const width = this.annotationDIV.clientWidth * window.devicePixelRatio;
    const height = this.annotationDIV.clientHeight * window.devicePixelRatio;
    const x = width / 2;
    const y = height / 2;
    const radiusX = x - lineWidth / 2;
    const radiusY = y - lineWidth / 2;

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.strokeStyle = hexColor2RGBA(this.annotationRawData.color);
    ctx.lineWidth = lineWidth;
    ctx.ellipse(x, y, radiusX, radiusY, 0, 0, 180);
    ctx.stroke();
    return canvas.toDataURL("png");
  }
}

export default FoliaCircleAnnotation;
