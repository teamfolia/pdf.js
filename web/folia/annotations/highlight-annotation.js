import { fromPdfRect, hexColor2RGBA } from "../folia-util";
import { FOLIA_LAYER_ROLES } from "../folia-page-layer";
import FoliaBaseAnnotation from "./base-annotation";
import { ANNOTATION_TYPES } from "../constants";

const HighlightKind = {
  MARKER: "MARKER",
  UNDERLINE: "UNDERLINE",
  CROSSLINE: "CROSSLINE",
};

class FoliaHighlightAnnotation extends FoliaBaseAnnotation {
  editablePropertiesList = ["color"];
  permanentPosition = true;

  constructor(...props) {
    super(...props);
  }

  getRawData() {
    const {
      id,
      addedAt,
      collaboratorEmail,
      page,
      color,
      rects,
      kind,
      text,
      deleted = false,
    } = this.annotationRawData;
    return {
      __typename: ANNOTATION_TYPES.HIGHLIGHT,
      id,
      addedAt: this.isDirty || addedAt,
      collaboratorEmail,
      page,
      kind,
      text,
      color,
      rects,
      deleted,
    };
  }

  async render() {
    // await super.render()
    this.updateDimensions();
    await this.draw();
  }
  updateDimensions() {
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
    // this.annotationDIV.style.color = pdfColor2rgba(this.annotationRawData.color)
  }
  async draw() {
    this.isDirty
      ? this.annotationDIV.classList.add("changed")
      : this.annotationDIV.classList.remove("changed");

    try {
      const pdfCanvas = this.foliaLayer.parentNode.querySelector("div.canvasWrapper>canvas");
      const pdfCtx = pdfCanvas.getContext("2d");
      this.annotationRawData.rects.forEach((pdfAreaRect, areaIndex) => {
        // pay attention here ⬇︎
        if (pdfAreaRect[0] === pdfAreaRect[2] || pdfAreaRect[1] === pdfAreaRect[3]) return;

        const areaRect = fromPdfRect(pdfAreaRect, this.viewport.width, this.viewport.height);
        const pdfAreaImageData = pdfCtx.getImageData(...areaRect.map((i) => i * window.devicePixelRatio));

        const selector = `[data-area-index="${areaIndex.toString()}"]`;
        let areaCanvas = this.annotationDIV.querySelector(selector);
        if (!areaCanvas) {
          areaCanvas = document.createElement("canvas");
          areaCanvas.setAttribute("data-id", `${this.annotationRawData.id}`);
          areaCanvas.setAttribute("data-role", FOLIA_LAYER_ROLES.ANNOTATION_OBJECT);
          areaCanvas.setAttribute("data-area-index", areaIndex.toString());
          this.annotationDIV.prepend(areaCanvas);
        }

        areaCanvas.style.position = "absolute";
        areaCanvas.style.left = areaRect[0] - this.annotationDIV.offsetLeft + "px";
        areaCanvas.style.top = areaRect[1] - this.annotationDIV.offsetTop + "px";
        areaCanvas.width = pdfAreaImageData.width;
        areaCanvas.height = pdfAreaImageData.height;
        areaCanvas.style.width = areaRect[2] + "px";
        areaCanvas.style.height = areaRect[3] + "px";
        const areaCtx = areaCanvas.getContext("2d");
        areaCtx.fillStyle = hexColor2RGBA(this.annotationRawData.color);

        const lineWidth = 4 * this.foliaPageLayer.pdfViewerScale;
        if (this.annotationRawData.kind === HighlightKind.CROSSLINE) {
          areaCtx.fillRect(0, pdfAreaImageData.height / 2, pdfAreaImageData.width, lineWidth);
        } else if (this.annotationRawData.kind === HighlightKind.UNDERLINE) {
          areaCtx.fillRect(0, pdfAreaImageData.height - lineWidth, pdfAreaImageData.width, lineWidth);
        } else if (this.annotationRawData.kind === HighlightKind.MARKER) {
          areaCtx.globalCompositeOperation = "darken";
          areaCtx.putImageData(pdfAreaImageData, 0, 0);
          areaCtx.fillRect(0, 0, pdfAreaImageData.width, pdfAreaImageData.height);
        }
      });
    } catch (e) {
      console.error(e.message);
    }
  }
}

export default FoliaHighlightAnnotation;
