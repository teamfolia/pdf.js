import { view } from "paper/dist/paper-core";
import { ANNOTATION_TYPES } from "../constants";
import { hexColor2RGBA, fromPdfPoint, toPdfPath, fromPdfPath, fromPdfRect } from "../folia-util";
import FoliaBaseAnnotation from "./base-annotation";

class FoliaInkAnnotation extends FoliaBaseAnnotation {
  relativePdfPaths = [];
  fixedAspectRatio = true;
  editablePropertiesList = ["color", "lineWidth", "paths"];

  constructor(...props) {
    super(...props);
  }

  getBoundingRect() {
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
    return { left, top, width: right - left, height: bottom - top };
  }

  getRawData() {
    return {
      __typename: ANNOTATION_TYPES.INK,
      id: this.annotationRawData.id,
      addedAt: this.isDirty || this.annotationRawData.addedAt,
      deletedAt: this.annotationRawData.deletedAt,
      collaboratorEmail: this.annotationRawData.collaboratorEmail,
      page: this.annotationRawData.page,
      color: this.annotationRawData.color,
      lineWidth: this.annotationRawData.lineWidth,
      paths: this.annotationRawData.paths,
    };
  }

  updateRects() {
    const lineWidth = this.annotationRawData.lineWidth * this.viewport.scale;
    const { left, top } = this.getBoundingRect();
    const offsetLeft = this.annotationDIV.offsetLeft + lineWidth / 2 - left;
    const offsetTop = this.annotationDIV.offsetTop + lineWidth / 2 - top;

    const paths = this.annotationRawData.paths
      .map((pdfPath) => fromPdfPath(pdfPath, this.viewport.width, this.viewport.height))
      .map((viewPath) => {
        const viewportPath = viewPath.map((point) => {
          return {
            x: point.x + offsetLeft,
            y: point.y + offsetTop,
          };
        });
        return toPdfPath(viewportPath, this.viewport.width, this.viewport.height);
      });
    this.annotationRawData.paths = paths;

    if (this.updateRectsTimer) cancelAnimationFrame(this.updateRectsTimer);
    this.updateRectsTimer = requestAnimationFrame(() => this.canvasRender());
  }

  canvasRender() {
    const lineWidth = this.annotationRawData.lineWidth * this.viewport.scale * window.devicePixelRatio;
    const canvas = document.createElement("canvas");
    canvas.width = this.pdfCanvas.width;
    canvas.height = this.pdfCanvas.height;
    const ctx = canvas.getContext("2d");
    const paths = this.annotationRawData.paths
      .map((pdfPath) => fromPdfPath(pdfPath, this.viewport.width, this.viewport.height))
      .map((path) =>
        path.map((point) => ({
          x: point.x * window.devicePixelRatio,
          y: point.y * window.devicePixelRatio,
        }))
      );

    ctx.strokeStyle = hexColor2RGBA(this.annotationRawData.color);
    ctx.lineWidth = lineWidth;
    paths.forEach((viewportPath) => {
      ctx.save();
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

    const annoBoundingRect = this.getBoundingRect();
    const annoLeft = annoBoundingRect.left * window.devicePixelRatio;
    const annoTop = annoBoundingRect.top * window.devicePixelRatio;
    const annoWidth = annoBoundingRect.width * window.devicePixelRatio;
    const annoHeight = annoBoundingRect.height * window.devicePixelRatio;

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

export default FoliaInkAnnotation;
