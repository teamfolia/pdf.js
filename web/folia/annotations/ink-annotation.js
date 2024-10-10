import { ANNOTATION_TYPES } from "../constants";
import { hexColor2RGBA, fromPdfPoint, toPdfPath, fromPdfPath, fromPdfRect } from "../folia-util";
import FoliaBaseAnnotation from "./base-annotation";
import * as turf from "@turf/turf";

class FoliaInkAnnotation extends FoliaBaseAnnotation {
  relativePdfPaths = [];
  fixedAspectRatio = true;
  editablePropertiesList = ["color", "lineWidth", "paths"];

  constructor(...props) {
    super(...props);
    super.createAndAppendCanvas();
    // console.log("INK ANNO CONSTRUCTOR");
  }

  deleteFromCanvas() {
    this.canvas.remove();
    super.deleteFromCanvas();
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
    const offsetLeft = this.annotationDIV.offsetLeft - left;
    const offsetTop = this.annotationDIV.offsetTop - top;

    const paths = this.annotationRawData.paths
      .map((pdfPath) => fromPdfPath(pdfPath, this.viewport.width, this.viewport.height))
      .map((viewPath) => {
        const viewportPath = viewPath.map((point) => {
          return {
            x: Math.round(point.x + offsetLeft),
            y: Math.round(point.y + offsetTop),
          };
        });
        return toPdfPath(viewportPath, this.viewport.width, this.viewport.height);
      });
    this.annotationRawData.paths = paths;

    if (this.updateRectsTimer) cancelAnimationFrame(this.updateRectsTimer);
    this.updateRectsTimer = requestAnimationFrame(() => this.canvasRender());
  }

  simplifyPath(path, index) {
    try {
      if (!path) return [];
      if (path.length < 3) return path;
      const line = turf.lineString(path.map((p) => [p.x, p.y]));
      const simplified = turf.simplify(line, { tolerance: 0.1, highQuality: true });
      const _path = simplified.geometry.coordinates.map((c) => ({ x: c[0], y: c[1] }));
      console.timeEnd("path" + index);
      return _path;
    } catch (e) {
      console.error("turf error:", e.message);
      return path;
    }
  }

  canvasRender() {
    this.canvas.width = this.canvas.width;
    const lineWidth = this.annotationRawData.lineWidth * this.viewport.scale * window.devicePixelRatio;
    const ctx = this.canvas.getContext("2d");
    const paths = this.annotationRawData.paths
      .map((pdfPath) => fromPdfPath(pdfPath, this.viewport.width, this.viewport.height))
      .map((path) =>
        path.map((point) => ({
          x: point.x * window.devicePixelRatio,
          y: point.y * window.devicePixelRatio,
        }))
      );

    ctx.lineJoin = "round";
    ctx.strokeStyle = hexColor2RGBA(this.annotationRawData.color);
    ctx.fillStyle = hexColor2RGBA(this.annotationRawData.color);
    // prettier-ignore
    paths.forEach((viewportPath) => {
      let p1 = viewportPath[0];
      let p2 = viewportPath[1];
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);

      if (viewportPath.length === 1) {
        ctx.lineWidth = 1;
        ctx.arc(p1.x, p1.y, lineWidth / 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.lineWidth = lineWidth;
        for (let i = 1, len = viewportPath.length; i < len; i++) {
          const mp = {
            x: p1.x + (p2.x - p1.x) * 0.5,
            y: p1.y + (p2.y - p1.y) * 0.5
          };
          ctx.quadraticCurveTo(p1.x, p1.y, mp.x, mp.y);
          p1 = viewportPath[i];
          p2 = viewportPath[i + 1];
        }
      }

      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();
      ctx.closePath();
    });

    // ctx.lineWidth = 1;
    // ctx.strokeStyle = "black";
    // // prettier-ignore
    // paths.forEach((viewportPath) => {
    //   let p1 = viewportPath[0];
    //   let p2 = viewportPath[1];
    //   ctx.lineCap = "round";
    //   ctx.beginPath();
    //   ctx.moveTo(p1.x, p1.y);
    //   for (let i = 1, len = viewportPath.length; i < len; i++) {
    //     const mp = {
    //       x: p1.x + (p2.x - p1.x) * 0.5,
    //       y: p1.y + (p2.y - p1.y) * 0.5
    //     };
    //     ctx.quadraticCurveTo(p1.x, p1.y, mp.x, mp.y);
    //     p1 = viewportPath[i];
    //     p2 = viewportPath[i + 1];
    //   }
    //   ctx.lineTo(p1.x, p1.y);
    //   ctx.stroke();
    //   ctx.closePath();
    // });
  }

  render() {
    super.render();
    if (this.updateRectsTimer) cancelAnimationFrame(this.updateRectsTimer);
    this.updateRectsTimer = requestAnimationFrame(() => this.canvasRender());
  }
}

export default FoliaInkAnnotation;
