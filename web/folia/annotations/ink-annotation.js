import { ANNOTATION_TYPES } from "../constants";
import { hexColor2RGBA, fromPdfPoint, toPdfPath, fromPdfPath } from "../folia-util";
import FoliaBaseAnnotation from "./base-annotation";

class FoliaInkAnnotation extends FoliaBaseAnnotation {
  relativePdfPaths = [];
  editablePropertiesList = ["color", "lineWidth"];

  constructor(...props) {
    super(...props);
    this.annotationDIV.classList.add(this.annotationRawData.__typename);
    this.buildBaseCorners();
  }

  getRawData() {
    const annotationViewportOffset = {
      x: this.annotationDIV.offsetLeft,
      y: this.annotationDIV.offsetTop,
    };
    const annotationViewport = {
      width: this.annotationDIV.clientWidth,
      height: this.annotationDIV.clientHeight,
    };
    const paths = this.relativePdfPaths.map((path) => {
      const relativeViewPath = fromPdfPath(
        path,
        this.annotationDIV.clientWidth,
        this.annotationDIV.clientHeight,
        this.annotationDIV.offsetLeft,
        this.annotationDIV.offsetTop
      );

      return toPdfPath(relativeViewPath, this.viewport.width, this.viewport.height);
    });

    const { id, addedAt, deletedAt, collaboratorEmail, page, color, lineWidth } = this.annotationRawData;
    return {
      __typename: ANNOTATION_TYPES.INK,
      id,
      addedAt: this.isDirty || addedAt,
      deletedAt,
      collaboratorEmail,
      page,
      color,
      lineWidth,
      paths,
    };
  }

  async render() {
    // console.log("-----> render ink <-----");
    const { left, top, right, bottom } = [].concat.apply([], this.annotationRawData.paths).reduce(
      (acc, path, index, arr) => {
        if (index % 2 !== 0) {
          const point = [arr[index - 1], arr[index]];
          const viewportPoint = fromPdfPoint(point, this.viewport.width, this.viewport.height);
          return {
            left: Math.min(acc.left, viewportPoint.x),
            top: Math.min(acc.top, viewportPoint.y),
            right: Math.max(acc.right, viewportPoint.x),
            bottom: Math.max(acc.bottom, viewportPoint.y),
          };
        } else {
          return acc;
        }
      },
      { left: Infinity, right: -Infinity, top: Infinity, bottom: -Infinity }
    );

    // set absolute position and dimensions of annotattion div
    const lineWidth = this.annotationRawData.lineWidth * this.foliaPageLayer.pdfViewerScale;
    this.annotationDIV.style.left = `${left - lineWidth}px`;
    this.annotationDIV.style.top = `${top - lineWidth}px`;

    // TODO: need to investigate about 3 "
    this.annotationDIV.style.width = `${right + lineWidth * 3 - left}px`;
    this.annotationDIV.style.height = `${bottom + lineWidth * 3 - top}px`;

    // convert absolute paths to relative for drawing
    this.relativePdfPaths = this.annotationRawData.paths.map((path) => {
      const absoluteViewportPath = fromPdfPath(path, this.viewport.width, this.viewport.height);
      const relativePdfPath = toPdfPath(
        absoluteViewportPath,
        this.annotationDIV.clientWidth,
        this.annotationDIV.clientHeight,
        this.annotationDIV.offsetLeft,
        this.annotationDIV.offsetTop
      );
      return relativePdfPath;
    });

    // draw annotattion paths into div
    await this.draw();
  }

  async draw() {
    // this.isDirty
    //   ? this.annotationDIV.classList.add("changed")
    //   : this.annotationDIV.classList.remove("changed");

    const canvas = document.createElement("canvas");
    canvas.width = this.annotationDIV.clientWidth;
    canvas.height = this.annotationDIV.clientHeight;
    const ctx = canvas.getContext("2d");
    ctx.strokeStyle = hexColor2RGBA(this.annotationRawData.color);
    ctx.lineWidth = this.annotationRawData.lineWidth * this.foliaPageLayer.pdfViewerScale;
    this.relativePdfPaths.forEach((path) => {
      ctx.save();
      const viewportPath = fromPdfPath(path, this.annotationDIV.clientWidth, this.annotationDIV.clientHeight);

      let p1 = viewportPath[0];
      let p2 = viewportPath[1];
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      for (let i = 1, len = viewportPath.length; i < len; i++) {
        const mp = { x: p1.x + (p2.x - p1.x) * 0.5, y: p1.y + (p2.y - p1.y) * 0.5 };
        ctx.quadraticCurveTo(p1.x, p1.y, mp.x, mp.y);
        p1 = viewportPath[i];
        p2 = viewportPath[i + 1];
      }
      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();
    });
    this.annotationDIV.style.backgroundImage = `url("${canvas.toDataURL("png")}")`;
  }
}

export default FoliaInkAnnotation;
