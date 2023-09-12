import { STAMPS2ANNO } from "../constants";
import { fromPdfPath, fromPdfPoint, fromPdfRect, toPdfPath, toPdfPoint, toPdfRect } from "../folia-util";
import BaseBuilder from "./base-builder";

class StampsBuilder extends BaseBuilder {
  static STAMP_TO_ANNO_MAP = {};

  constructor(foliaPageLayer, BuildingClass, undoRedoManager) {
    super(foliaPageLayer, BuildingClass, undoRedoManager);
    this.stampData = BuildingClass.initialPreset;
    if (BuildingClass.asset) {
      const image = new Image();
      image.src = BuildingClass.asset;
      image.onload = () => (this.previewImage = image);
    }
    this.resume();
  }

  resume() {
    if (!this.canvas) {
      this.canvas = document.createElement("canvas");
      this.canvas.className = "annotation-builder-container stamps-builder";
      this.canvas.width = this.foliaPageLayer.pageDiv.clientWidth;
      this.canvas.height = this.foliaPageLayer.pageDiv.clientHeight;
      this.canvas.onclick = this.onMouseClick.bind(this);
      this.canvas.onmousemove = this.onMouseMove.bind(this);
      this.canvas.onmouseover = (e) => {
        this.position = this.getRelativePoint(e);
      };
      this.canvas.onmouseout = () => {
        this.position = null;
        this.draw();
      };
      this.canvas.style.backgroundColor = "rgba(0, 0, 0, 0)";
    }

    this.foliaPageLayer.pageDiv.appendChild(this.canvas);
  }

  repositionArrowPoints(pdfSourcePoint, pdfTargetPoint, lineWidth = 0) {
    const vpSourcePoint = fromPdfPoint(pdfSourcePoint, this.viewport.width, this.viewport.height);
    const vpTargetPoint = fromPdfPoint(pdfTargetPoint, this.viewport.width, this.viewport.height);
    const leftOffset = Math.min(vpSourcePoint.x, vpTargetPoint.x);
    const topOffset = Math.min(vpSourcePoint.y, vpTargetPoint.y);
    return {
      sourcePoint: toPdfPoint(
        {
          x: vpSourcePoint.x - leftOffset + Math.max(lineWidth / 2, this.position.x),
          y: vpSourcePoint.y - topOffset + Math.max(lineWidth / 2, this.position.y),
        },
        this.viewport.width,
        this.viewport.height
      ),
      targetPoint: toPdfPoint(
        {
          x: vpTargetPoint.x - leftOffset + Math.max(lineWidth / 2, this.position.x),
          y: vpTargetPoint.y - topOffset + Math.max(lineWidth / 2, this.position.y),
        },
        this.viewport.width,
        this.viewport.height
      ),
    };
  }

  repositionRect(pdfRect, lineWidth = 0) {
    const viewportRect = fromPdfRect(pdfRect, this.viewport.width, this.viewport.height);
    viewportRect[0] = Math.max(lineWidth / 2, this.position.x);
    viewportRect[1] = Math.max(lineWidth / 2, this.position.y);
    return toPdfRect(viewportRect, this.viewport.width, this.viewport.height);
  }

  repositionPaths(paths, lineWidth = 0) {
    let leftOffset = Infinity,
      topOffset = Infinity;

    return paths
      .map((path) => {
        return fromPdfPath(path, this.viewport.width, this.viewport.height);
      })
      .map((path) => {
        path.forEach((point) => {
          leftOffset = Math.min(leftOffset, point.x);
          topOffset = Math.min(topOffset, point.y);
        });
        return path;
      })
      .map((path) => {
        const newPath = toPdfPath(
          path.map((point, index) => {
            return {
              x: point.x - leftOffset + lineWidth / 2 + this.position.x,
              y: point.y - topOffset + lineWidth / 2 + this.position.y,
            };
          }),
          this.viewport.width,
          this.viewport.height
        );
        return newPath;
      });
  }

  prepareAnnotations2save() {
    if (!this.position) return [];
    const { stampId, __typename, pageSize, name, ...restData } = this.stampData;
    const annoData = {
      __typename: STAMPS2ANNO[__typename],
      ...restData,
    };
    if (restData.paths) annoData.paths = this.repositionPaths(restData.paths, restData.lineWidth);
    if (restData.rect) annoData.rect = this.repositionRect(restData.rect, restData.lineWidth);
    if (restData.sourcePoint && restData.targetPoint) {
      Object.assign(
        annoData,
        this.repositionArrowPoints(restData.sourcePoint, restData.targetPoint, restData.lineWidth)
      );
    }
    // console.log(annoData);
    return [annoData];
  }

  getRelativePoint(e) {
    let reference;
    const offset = {
      left: e.currentTarget.offsetLeft,
      top: e.currentTarget.offsetTop,
    };
    reference = e.currentTarget.offsetParent;
    do {
      offset.left += reference.offsetLeft - reference.scrollLeft;
      offset.top += reference.offsetTop - reference.scrollTop;
      reference = reference.offsetParent;
    } while (reference);

    return {
      x: e.pageX - offset.left,
      y: e.pageY - offset.top,
    };
  }

  onMouseMove(e) {
    this.position = this.getRelativePoint(e);
    requestAnimationFrame(() => this.draw());
  }

  onMouseClick(e) {
    e.preventDefault();
    e.stopPropagation();
    this.position = this.getRelativePoint(e);
    this.foliaPageLayer.eventBus.dispatch("stop-drawing");
  }

  draw() {
    this.canvas.width = this.canvas.width;
    if (!this.position) return;

    const previewWidth = this.previewImage.naturalWidth / 2;
    const previewHeight = this.previewImage.naturalHeight / 2;
    const left = Math.min(Math.max(10, this.position.x + 3), this.canvas.clientWidth - previewWidth - 10);
    const top = Math.min(Math.max(10, this.position.y + 3), this.canvas.clientHeight - previewHeight - 10);

    const ctx = this.canvas.getContext("2d");
    ctx.globalAlpha = 0.75;
    ctx.drawImage(this.previewImage, left, top, previewWidth, previewHeight);
  }
}

export default StampsBuilder;
