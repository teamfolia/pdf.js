import { fromPdfRect, hexColor2RGBA } from "../folia-util";
import { FOLIA_LAYER_ROLES } from "../folia-page-layer";
import FoliaBaseAnnotation from "./base-annotation";
import { ANNOTATION_TYPES, HighlightKind } from "../constants";
import { doc } from "prettier";

class FoliaHighlightAnnotation extends FoliaBaseAnnotation {
  editablePropertiesList = ["color"];
  permanentPosition = true;

  constructor(...props) {
    super(...props);
    this.image = document.createElement("img");
    this.image.setAttribute("data-id", `${this.id}`);
    this.image.setAttribute("data-role", FOLIA_LAYER_ROLES.ANNOTATION_OBJECT);
    this.annotationDIV.appendChild(this.image);
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
  updateDimensions() {}
  render() {
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

    this.draw(dimension);
  }

  draw(dimension) {
    try {
      if (this.image.src) return;

      const pdfCanvas = this.foliaPageLayer.pageDiv.querySelector("div.canvasWrapper>canvas");
      // const pdfCtx = pdfCanvas.getContext("2d", { willReadFrequently: true });

      const tmpCanvas = document.createElement("canvas");
      tmpCanvas.width = pdfCanvas.width;
      tmpCanvas.height = pdfCanvas.height;
      const tmpCtx = tmpCanvas.getContext("2d");
      tmpCtx.fillStyle = hexColor2RGBA(this.annotationRawData.color);

      this.annotationRawData.rects.forEach((areaPdfRect) => {
        const areaRect = fromPdfRect(areaPdfRect, this.viewport.width, this.viewport.height).map(
          (n) => n * window.devicePixelRatio
        );

        const lineWidth = 4 * this.foliaPageLayer.pdfViewerScale;
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
      console.error("error while draw highliht " + e.message);
    }
  }
}

export default FoliaHighlightAnnotation;
