import { ANNOTATION_TYPES } from "../constants";
import { FOLIA_LAYER_ROLES } from "../folia-page-layer";
import { hexColor2RGBA, fromPdfPoint, toPdfPath, fromPdfPath } from "../folia-util";
import FoliaBaseAnnotation from "./base-annotation";

class FoliaInkAnnotation extends FoliaBaseAnnotation {
  relativePdfPaths = [];
  fixedAspectRatio = true;
  editablePropertiesList = ["color", "lineWidth", "paths"];

  constructor(...props) {
    super(...props);
    this.buildBaseCorners();
  }
  getRawData() {
    const { id, addedAt, deletedAt, collaboratorEmail, page, paths, color, lineWidth } =
      this.annotationRawData;
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

  updateRects() {
    if (!this.relativePaths) return this.render();

    const { offsetLeft, offsetTop } = this.annotationDIV;
    const paths = this.relativePaths.map((path) => {
      const viewportPath = path.map((point) => {
        return {
          x: point.x / window.devicePixelRatio + offsetLeft,
          y: point.y / window.devicePixelRatio + offsetTop,
        };
      });
      return toPdfPath(viewportPath, this.viewport.width, this.viewport.height);
    });

    this.annotationRawData.paths = paths;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.render(), 100);
    super.updateRects();
  }

  render() {
    // calc bounding rect
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

    const lineWidth = this.annotationRawData.lineWidth * this.viewport.scale;
    this.annotationDIV.style.left = `${left - lineWidth / 2}px`;
    this.annotationDIV.style.top = `${top - lineWidth / 2}px`;
    this.annotationDIV.style.width = `${right - left + lineWidth}px`;
    this.annotationDIV.style.height = `${bottom - top + lineWidth}px`;

    const { offsetLeft, offsetTop } = this.annotationDIV;
    this.relativePaths = this.annotationRawData.paths.map((path) => {
      return fromPdfPath(path, this.viewport.width, this.viewport.height).map((point) => {
        return {
          x: (point.x - offsetLeft) * window.devicePixelRatio,
          y: (point.y - offsetTop) * window.devicePixelRatio,
        };
      });
    });

    const canvas = document.createElement("canvas");
    canvas.width = this.annotationDIV.clientWidth * window.devicePixelRatio;
    canvas.height = this.annotationDIV.clientHeight * window.devicePixelRatio;
    const ctx = canvas.getContext("2d");
    ctx.strokeStyle = hexColor2RGBA(this.annotationRawData.color);
    ctx.lineWidth = this.annotationRawData.lineWidth * this.viewport.scale * window.devicePixelRatio;

    this.relativePaths.forEach((viewportPath) => {
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

    this.annotationDIV.style.backgroundImage = `url("${canvas.toDataURL("png")}")`;
  }
}

export default FoliaInkAnnotation;
