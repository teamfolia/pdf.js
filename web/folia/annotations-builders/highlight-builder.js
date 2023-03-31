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
    // console.log("resume", this.foliaPageLayer.pageNumber);
    this.textBlocks = [];
    this.selectedBlocks = [];
    this.groups = [];

    setTimeout(() => {
      if (!this.canvas) {
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
      this.calcTextBlocks();
    }, 0);
  }

  prepareAnnotations2save() {
    return this.groups.map((anno) => {
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

  _prepareAnnotations2save() {
    let annotations = [];

    for (const group of this.groups) {
      for (const block of group.blocks)
        annotations.push({
          color: group.color,
          blocks: [block],
          text: block.letter,
        });
    }

    return annotations
      .sort((a, b) => {
        return b.blocks[0].top - a.blocks[0].top;
      })
      .map((anno) => {
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

  onMouseDown(e) {
    e.preventDefault();
    e.stopPropagation();
    this.mouseIsDown = true;
    this.startPoint = this.getRelativePoint(e);
    this.selectedBlocks = [];
    this.draw();
  }

  onMouseMove(e) {
    e.preventDefault();
    e.stopPropagation();
    if (!this.mouseIsDown) return;
    this.mouseIsMove = true;
    const endPoint = this.getRelativePoint(e);

    const selectedRect = {
      left: Math.min(this.startPoint.x, endPoint.x),
      top: Math.min(this.startPoint.y, endPoint.y),
      right: Math.max(this.startPoint.x, endPoint.x),
      bottom: Math.max(this.startPoint.y, endPoint.y),
    };

    this.selectedBlocks = this.textBlocks.filter((symbolArea) => {
      const { left, top, right, bottom, width, height } = symbolArea;
      return (
        ((right > selectedRect.left && bottom > selectedRect.top) || top > selectedRect.top) &&
        ((top < selectedRect.bottom && left < selectedRect.right) || bottom < selectedRect.bottom)
      );
    });

    this.draw();
  }

  onMouseUp(e) {
    e.preventDefault();
    e.stopPropagation();
    this.mouseIsDown = false;
    this.mouseIsMove = false;
    if (this.selectedBlocks.length > 0) {
      const prevState = {
        page: this.foliaPageLayer.pageNumber,
        data: this.groups.slice(),
      };
      this.groups.push({
        color: this.preset.color,
        blocks: this.selectedBlocks
          .sort((b1, b2) => {
            return b1.left - b2.left;
          })
          .reduce((acc, block) => {
            const theSameLineBlockIndex = acc.findIndex(
              (b) => b.top === block.top && b.bottom === block.bottom
            );
            if (theSameLineBlockIndex === -1) {
              return [...acc, block];
            } else {
              const theSameLineBlock = acc[theSameLineBlockIndex];
              theSameLineBlock.left = Math.min(theSameLineBlock.left, block.left);
              theSameLineBlock.right = Math.max(theSameLineBlock.right, block.right);
              theSameLineBlock.width = theSameLineBlock.right - theSameLineBlock.left;
              theSameLineBlock.letter += block.letter;
              return acc;
            }
          }, []),
      });
      this.selectedBlocks = [];
      const newState = {
        page: this.foliaPageLayer.pageNumber,
        data: this.groups.slice(),
      };
      this.undoRedoManager.addToolStep(prevState, newState);
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

  applyUndoRedo(groups) {
    this.groups = groups;
    this.draw();
    this.path = [];
  }
}

export default HighlightBuilder;
