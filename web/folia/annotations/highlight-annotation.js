import { fromPdfRect, hexColor2RGBA } from "../folia-util";
import { FOLIA_LAYER_ROLES } from "../folia-page-layer";
import FoliaBaseAnnotation from "./base-annotation";
import { ANNOTATION_TYPES, HighlightKind } from "../constants";
import { doc } from "prettier";

class FoliaHighlightAnnotation extends FoliaBaseAnnotation {
  editablePropertiesList = ["kind", "text", "color", "rects"];
  permanentPosition = true;

  constructor(...props) {
    super(...props);
    this.parentCanvas = this.foliaLayer.parentNode.querySelector("div.canvasWrapper>canvas");
    this.parentCtx = this.parentCanvas && this.parentCanvas.getContext("2d");
  }

  getRawData() {
    const { id, addedAt, deletedAt, collaboratorEmail, page, color, rects, kind, text } =
      this.annotationRawData;
    return {
      __typename: ANNOTATION_TYPES.HIGHLIGHT,
      id,
      addedAt: this.isDirty || addedAt,
      deletedAt,
      collaboratorEmail,
      page,
      kind,
      text,
      color,
      rects,
    };
  }

  render() {
    const annotationBounds = this.annotationRawData.rects.reduce(
      (acc, pdfRect) => {
        const rect = fromPdfRect(pdfRect, this.viewport.width, this.viewport.height);
        return {
          left: Math.min(acc.left, rect[0]),
          top: Math.min(acc.top, rect[1]),
          right: Math.max(acc.right, rect[0] + rect[2]),
          bottom: Math.max(acc.bottom, rect[1] + rect[3]),
        };
      },
      { left: Infinity, right: -Infinity, top: Infinity, bottom: -Infinity }
    );

    const { left, top, right, bottom } = annotationBounds;
    const width = right - left;
    const height = bottom - top;
    this.annotationDIV.style.left = `${left}px`;
    this.annotationDIV.style.top = `${top}px`;
    this.annotationDIV.style.width = `${width}px`;
    this.annotationDIV.style.height = `${height}px`;

    const annotationCanvas = document.createElement("canvas");
    annotationCanvas.width = this.parentCanvas.width;
    annotationCanvas.height = this.parentCanvas.height;
    annotationCanvas.setAttribute("data-id", `${this.id}`);
    annotationCanvas.setAttribute("data-role", FOLIA_LAYER_ROLES.ANNOTATION_OBJECT);

    annotationCanvas.style.position = "absolute";
    annotationCanvas.style.left = "0px";
    annotationCanvas.style.top = "0px";
    annotationCanvas.style.width = `${this.parentCanvas.clientWidth}px`;
    annotationCanvas.style.height = `${this.parentCanvas.clientHeight}px`;
    const ctx = annotationCanvas.getContext("2d");
    const lineWidth = 2 * this.viewport.scale * window.devicePixelRatio;
    this.annotationRawData.rects.forEach((pdfRect) => {
      const rect = fromPdfRect(pdfRect, this.viewport.width, this.viewport.height).map(
        (item) => item * window.devicePixelRatio
      );
      if (rect[2] === 0 && rect[3] === 0) return;

      ctx.fillStyle = hexColor2RGBA(this.annotationRawData.color);
      if (this.annotationRawData.kind === HighlightKind.CROSSLINE) {
        ctx.fillRect(rect[0], rect[1] + rect[3] / 2 - lineWidth / 2, rect[2], lineWidth);
      } else if (this.annotationRawData.kind === HighlightKind.UNDERLINE) {
        ctx.fillRect(rect[0], rect[1] + rect[3] - lineWidth, rect[2], lineWidth);
      } else if (this.annotationRawData.kind === HighlightKind.MARKER) {
        ctx.globalCompositeOperation = "darken";
        const imageData = this.parentCtx.getImageData(...rect);
        ctx.putImageData(imageData, rect[0], rect[1]);
        ctx.fillRect(...rect);
      }
    });

    const tmpCanvas = document.createElement("canvas");
    tmpCanvas.width = width * window.devicePixelRatio;
    tmpCanvas.height = height * window.devicePixelRatio;
    const tmpCtx = tmpCanvas.getContext("2d");
    const tmpImageData = ctx.getImageData(
      ...[left, top, width, height].map((a) => a * window.devicePixelRatio)
    );
    tmpCtx.putImageData(tmpImageData, 0, 0);
    this.annotationDIV.style.backgroundImage = `url(${tmpCanvas.toDataURL()})`;
  }

  _render() {
    try {
      const dimension = this.annotationRawData.rects.reduce(
        (acc, pdfRect) => {
          const rect = fromPdfRect(pdfRect, this.viewport.width, this.viewport.height);
          return {
            left: Math.min(acc.left, rect[0]),
            top: Math.min(acc.top, rect[1]),
            right: Math.max(acc.right, rect[0] + rect[2]),
            bottom: Math.max(acc.bottom, rect[1] + rect[3]),
          };
        },
        { left: Infinity, right: -Infinity, top: Infinity, bottom: -Infinity }
      );

      this.annotationDIV.style.left = `${dimension.left}px`;
      this.annotationDIV.style.top = `${dimension.top}px`;
      this.annotationDIV.style.width = `${dimension.right - dimension.left}px`;
      this.annotationDIV.style.height = `${dimension.bottom - dimension.top}px`;

      this.image.width = dimension.right - dimension.left;
      this.image.height = dimension.bottom - dimension.top;

      const pdfCanvas = this.foliaPageLayer.pageDiv.querySelector("div.canvasWrapper>canvas");
      const tmpCanvas = document.createElement("canvas");
      tmpCanvas.width = pdfCanvas.width;
      tmpCanvas.height = pdfCanvas.height;
      const tmpCtx = tmpCanvas.getContext("2d");
      tmpCtx.fillStyle = hexColor2RGBA(this.annotationRawData.color);

      this.annotationRawData.rects.forEach((areaPdfRect) => {
        const areaRect = fromPdfRect(areaPdfRect, this.viewport.width, this.viewport.height);
        areaRect[0] = areaRect[0] * window.devicePixelRatio;
        areaRect[1] = areaRect[1] * window.devicePixelRatio;
        areaRect[2] = areaRect[2] * window.devicePixelRatio;
        areaRect[3] = areaRect[3] * window.devicePixelRatio;
        // .map(
        //   (n) => n * window.devicePixelRatio + 1.5
        // );

        const lineWidth = 2 * this.viewport.scale;
        if (this.annotationRawData.kind === HighlightKind.CROSSLINE) {
          tmpCtx.fillRect(areaRect[0], areaRect[1] + areaRect[3] / 2, areaRect[2], lineWidth);
        } else if (this.annotationRawData.kind === HighlightKind.UNDERLINE) {
          tmpCtx.fillRect(areaRect[0], areaRect[1] + areaRect[3] - lineWidth, areaRect[2], lineWidth);
        } else if (this.annotationRawData.kind === HighlightKind.MARKER) {
          tmpCtx.globalCompositeOperation = "darken";
          tmpCtx.drawImage(pdfCanvas, ...areaRect, ...areaRect);
          tmpCtx.fillRect(...areaRect);
        }
      });

      const annoCanvas = document.createElement("canvas");
      annoCanvas.width = (dimension.right - dimension.left) * window.devicePixelRatio;
      annoCanvas.height = (dimension.bottom - dimension.top) * window.devicePixelRatio;
      const annCtx = annoCanvas.getContext("2d");
      annCtx.drawImage(
        tmpCanvas,
        dimension.left * window.devicePixelRatio,
        dimension.top * window.devicePixelRatio,
        (dimension.right - dimension.left) * window.devicePixelRatio,
        (dimension.bottom - dimension.top) * window.devicePixelRatio,
        0,
        0,
        (dimension.right - dimension.left) * window.devicePixelRatio,
        (dimension.bottom - dimension.top) * window.devicePixelRatio
      );

      this.image.src = annoCanvas.toDataURL();
    } catch (e) {
      console.error("error while render highliht " + e.message);
    }
  }
}

export default FoliaHighlightAnnotation;
