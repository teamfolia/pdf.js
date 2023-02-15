import { toPdfRect, hexColor2RGBA } from "../folia-util";
import BaseBuilder from "./base-builder";
import { ANNOTATION_TYPES, HighlightKind } from "../constants";

class HighlightBuilder extends BaseBuilder {
  mouseIsDown = false;
  mouseIsMove = false;
  kind = null;

  constructor(...props) {
    super(...props);
    const [, BuildingClass] = props;
    this.kind = BuildingClass.kind;
  }

  resume() {
    if (!this.canvas) {
      console.log("resume");
      this.pdfCanvas = this.foliaPageLayer.pageDiv.querySelector("div.canvasWrapper>canvas");
      this.canvas = this.pdfCanvas.cloneNode();
      this.canvas.style.cursor = "text";
      this.canvas.className = "annotation-builder-container";
      this.canvas.onclick = this.onMouseClick.bind(this);
      this.canvas.onmousedown = this.onMouseDown.bind(this);
      this.canvas.onmousemove = this.onMouseMove.bind(this);
      this.canvas.onmouseup = this.onMouseUp.bind(this);
      this.canvas.onmouseout = this.onMouseUp.bind(this);
    }
    this.foliaPageLayer.pageDiv.appendChild(this.canvas);
    this.textBlocks = [];
    this.selectedBlocks = [];
    this.groups = [];
    this.calcTextBlocks();
  }

  prepareAnnotations2save() {
    let annotations = [];
    for (const group of this.groups) {
      if (annotations[0]?.color === group.color) {
        annotations[0].blocks.push(...group.blocks);
        annotations[0].text += group.blocks.reduce((acc, block) => (acc += block.letter), "");
      } else {
        annotations.unshift({
          color: group.color,
          blocks: [...group.blocks],
          text: group.blocks.reduce((acc, block) => (acc += block.letter), ""),
        });
      }
    }

    return annotations.map((anno) => {
      return {
        __typename: ANNOTATION_TYPES.HIGHLIGHT,
        kind: this.kind,
        color: anno.color,
        rects: anno.blocks.map((block) => {
          const { left, top, width, height } = block;
          return toPdfRect([left, top, width, height], this.viewport.width, this.viewport.height);
        }),
        text: anno.text,
      };
    });
  }

  calcTextBlocks() {
    const textLayer = this.foliaPageLayer.pageDiv.querySelector(".textLayer");
    const layerRect = textLayer.getBoundingClientRect();
    const textElements = this.foliaPageLayer.pageDiv.querySelectorAll(".textLayer span");
    for (const el of textElements) {
      const symbolsAreas = [];
      el.textContent.split("").forEach((letter, index) => {
        try {
          const range = document.createRange();
          range.setStart(el.firstChild, index);
          range.setEnd(el.firstChild, index + 1);
          const rect = range.getBoundingClientRect();

          const data = {
            index,
            letter,
            left: rect.left - layerRect.left,
            top: rect.top - layerRect.top,
            right: rect.right - layerRect.left,
            bottom: rect.bottom - layerRect.top,
            width: rect.width,
            height: rect.height,
          };
          symbolsAreas.push(data);
        } catch (e) {}
      });
      if (symbolsAreas.length > 0) this.textBlocks.push(...symbolsAreas);
    }
    // console.log(`found ${this.textBlocks.length} areas`);
  }
  findMouseOverSymbols(point) {
    const selectedRect = {
      left: Math.min(this.startPoint.x, point.x),
      top: Math.min(this.startPoint.y, point.y),
      right: Math.max(this.startPoint.x, point.x),
      bottom: Math.max(this.startPoint.y, point.y),
    };

    this.selectedBlocks = this.textBlocks.filter((symbolArea) => {
      const { left, top, right, bottom, width, height } = symbolArea;
      return (
        ((right > selectedRect.left && bottom > selectedRect.top) || top > selectedRect.top) &&
        ((top < selectedRect.bottom && left < selectedRect.right) || bottom < selectedRect.bottom)
      );
    });
  }
  onMouseDown(e) {
    e.preventDefault();
    e.stopPropagation();
    this.mouseIsDown = true;
    this.startPoint = this.endPoint = this.getRelativePoint(e);
    this.selectedBlocks = [];
    this.draw();
  }
  onMouseMove(e) {
    e.preventDefault();
    e.stopPropagation();
    if (!this.mouseIsDown) return;
    this.mouseIsMove = true;
    this.endPoint = this.getRelativePoint(e);
    this.findMouseOverSymbols(this.endPoint);
    if (this.selectedBlocksLength === this.selectedBlocks.length) return;
    window.requestAnimationFrame(() => {
      this.selectedBlocksLength = this.selectedBlocks.length;
      this.draw();
    });
  }
  onMouseUp(e) {
    e.preventDefault();
    e.stopPropagation();
    this.mouseIsDown = false;
    this.mouseIsMove = false;
    if (this.selectedBlocks.length > 0) {
      this.groups.push({ color: this.preset.color, blocks: this.selectedBlocks.slice() });
      this.selectedBlocks = [];
    }
    this.draw();
  }

  draw() {
    const pixelRatio = window.devicePixelRatio;
    const ctx = this.canvas.getContext("2d");
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    const selected = { color: this.preset.color, blocks: this.selectedBlocks };
    for (const group of [...this.groups, selected]) {
      const { color, blocks } = group;
      blocks.forEach((symbolArea) => {
        const { left, top, width, height, image } = symbolArea;

        ctx.fillStyle = hexColor2RGBA(color);
        ctx.globalCompositeOperation = "darken";

        const lineWidth = 2 * this.foliaPageLayer.pdfViewerScale;
        switch (this.kind) {
          case HighlightKind.CROSSLINE: {
            ctx.fillRect(
              left * pixelRatio,
              (top + height / 2) * pixelRatio,
              width * pixelRatio,
              lineWidth * pixelRatio
            );
            break;
          }
          case HighlightKind.UNDERLINE: {
            ctx.fillRect(
              left * pixelRatio,
              (top + (height - lineWidth)) * pixelRatio,
              width * pixelRatio,
              lineWidth * pixelRatio
            );
            break;
          }
          case HighlightKind.MARKER: {
            ctx.drawImage(
              this.pdfCanvas,
              left * pixelRatio,
              top * pixelRatio,
              width * pixelRatio,
              height * pixelRatio,
              left * pixelRatio,
              top * pixelRatio,
              width * pixelRatio,
              height * pixelRatio
            );
            ctx.fillRect(left * pixelRatio, top * pixelRatio, width * pixelRatio, height * pixelRatio);
            break;
          }
          default:
            break;
        }
      });
    }
  }
}

export default HighlightBuilder;
