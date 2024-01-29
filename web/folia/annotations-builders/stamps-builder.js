import { FONT_FAMILY, FONT_WEIGHT, STAMPS2ANNO, TEXT_ALIGNMENT } from "../constants";
import {
  fromPdfPath,
  fromPdfPoint,
  fromPdfRect,
  hexColor2RGBA,
  toPdfPath,
  toPdfPoint,
  toPdfRect,
} from "../folia-util";
import BaseBuilder from "./base-builder";
import ArrowObject from "../web-components/render-objects/arrow";
import InkObject from "../web-components/render-objects/ink";
import SquareObject from "../web-components/render-objects/square";
import CircleObject from "../web-components/render-objects/circle";
import ImageObject from "../web-components/render-objects/image";
import TextBoxObject from "../web-components/render-objects/text-box";

class StampsBuilder extends BaseBuilder {
  static STAMP_TO_ANNO_MAP = {};

  constructor(foliaPageLayer, BuildingClass, undoRedoManager) {
    super(foliaPageLayer, BuildingClass, undoRedoManager);
    const {
      __typename,
      pageSize,
      sourcePoint,
      targetPoint,
      rect,
      paths,
      lineWidth,
      color,
      content,
      filename,
      text,
      fontFamily,
      fontSize,
      fontWeight,
      textAlignment,
    } = BuildingClass.initialPreset;

    this.usageConfirmation = false;
    this.stampData = { __typename, lineWidth, color };
    this.zoom = BuildingClass.currentZoom / 100;

    if (sourcePoint && targetPoint) {
      const arrowPoints = [
        fromPdfPoint(sourcePoint, pageSize[0], pageSize[1]),
        fromPdfPoint(targetPoint, pageSize[0], pageSize[1]),
      ];

      arrowPoints[0].x *= this.zoom;
      arrowPoints[0].y *= this.zoom;
      arrowPoints[1].x *= this.zoom;
      arrowPoints[1].y *= this.zoom;

      const { left, top, width, height } = ArrowObject._getBoundingRect(...arrowPoints, lineWidth);
      this.stampData.sourcePoint = { x: arrowPoints[0].x - left, y: arrowPoints[0].y - top };
      this.stampData.targetPoint = { x: arrowPoints[1].x - left, y: arrowPoints[1].y - top };
      this.boundingRect = { width, height };
    }

    if (paths) {
      const viewportPaths = paths.map((path) => fromPdfPath(path, pageSize[0], pageSize[1]));
      const { left, top, width, height } = InkObject._getBoundingRect(viewportPaths, lineWidth);
      this.stampData.paths = viewportPaths.map((path) =>
        path.map((point) => {
          return {
            x: (point.x - left) * this.zoom,
            y: (point.y - top) * this.zoom,
          };
        })
      );
      this.boundingRect = { width: width * this.zoom, height: height * this.zoom };
    }

    if (rect) {
      const viewportRect = fromPdfRect(rect, pageSize[0], pageSize[1]);
      viewportRect[0] = 0;
      viewportRect[1] = 0;
      viewportRect[2] *= this.zoom;
      viewportRect[3] *= this.zoom;
      //
      if (__typename === "SquareDocumentStamp") {
        const { width, height } = SquareObject._getBoundingRect(viewportRect, lineWidth);
        this.boundingRect = { width, height };
        //
      } else if (__typename === "CircleDocumentStamp") {
        const { width, height } = CircleObject._getBoundingRect(viewportRect, lineWidth);
        this.boundingRect = { width, height };
        //
      } else if (__typename === "ImageDocumentStamp") {
        const { width, height } = ImageObject._getBoundingRect(viewportRect);
        this.boundingRect = { width, height };
        this.stampData.content = content;
        this.stampData.filename = filename;
        const image = new Image();
        image.onload = () => (this.image = image);
        image.src = `data:image/png;base64,${content}`;
        //
      } else if (__typename === "TextBoxDocumentStamp") {
        const { width, height } = TextBoxObject._getBoundingRect(viewportRect, lineWidth);
        this.boundingRect = { width, height };
        this.stampData.text = text;
        this.stampData.fontFamily = fontFamily;
        this.stampData.fontSize = fontSize;
        this.stampData.fontWeight = fontWeight;
        this.stampData.textAlignment = textAlignment;
        //
      }
      this.stampData.rect = viewportRect;
    }
  }

  resume() {
    if (!this.canvas) {
      this.canvas = document.createElement("canvas");
      this.canvas.className = "annotation-builder-container stamps-builder";
      this.canvas.width = this.foliaPageLayer.parentNode.clientWidth;
      this.canvas.height = this.foliaPageLayer.parentNode.clientHeight;
      this.canvas.onclick = this.onMouseClick.bind(this);
      this.canvas.onmousemove = (e) => this.onMouseMove(e);
      this.canvas.style.backgroundColor = "rgba(0, 0, 0, 0)";
    }

    this.foliaPageLayer.parentNode.appendChild(this.canvas);
  }

  applyPreset(preset) {}

  makeSelected() {
    return false;
  }

  prepareAnnotations2save() {
    if (this.usageConfirmation === false) return [];
    if (!this.position) return [];
    const {
      stampId,
      __typename,
      pageSize,
      favorite,
      isPredefined,
      name,
      error,
      rect,
      sourcePoint,
      targetPoint,
      paths,
      ...restData
    } = this.stampData;

    const annoData = {
      __typename: STAMPS2ANNO[__typename],
      ...restData,
    };
    if (rect) {
      rect[0] = this.position.x;
      rect[1] = this.position.y;
      annoData.rect = toPdfRect(rect, this.viewport.width, this.viewport.height);
    }
    if (paths) {
      annoData.paths = paths.map((path) => {
        const viewportPath = path.map((point) => {
          return { x: point.x + this.position.x, y: point.y + this.position.y };
        });

        return toPdfPath(viewportPath, this.viewport.width, this.viewport.height);
      });
    }
    if (sourcePoint && targetPoint) {
      annoData.sourcePoint = toPdfPoint(
        { x: sourcePoint.x + this.position.x, y: sourcePoint.y + this.position.y },
        this.viewport.width,
        this.viewport.height
      );
      annoData.targetPoint = toPdfPoint(
        { x: targetPoint.x + this.position.x, y: targetPoint.y + this.position.y },
        this.viewport.width,
        this.viewport.height
      );
    }

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
    const point = this.getRelativePoint(e);
    point.x = Math.min(Math.max(5, point.x), this.viewport.width - this.boundingRect.width - 5);
    point.y = Math.min(Math.max(5, point.y), this.viewport.height - this.boundingRect.height - 5);
    this.position = point;
    requestAnimationFrame(() => this.draw());
  }

  onMouseClick(e) {
    e.preventDefault();
    e.stopPropagation();
    this.usageConfirmation = true;
    this.foliaPageLayer.eventBus.dispatch("stop-drawing");
  }

  draw() {
    this.canvas.width = this.canvas.width;
    if (!this.position) return;
    const ctx = this.canvas.getContext("2d");
    ctx.globalAlpha = 0.75;

    const {
      __typename,
      sourcePoint,
      targetPoint,
      paths,
      rect,
      lineWidth,
      color,
      text,
      fontFamily,
      fontSize,
      fontWeight,
      textAlignment,
    } = this.stampData;

    if (__typename === "ArrowDocumentStamp") {
      ArrowObject._render(
        ctx,
        { x: sourcePoint.x + this.position.x, y: sourcePoint.y + this.position.y },
        { x: targetPoint.x + this.position.x, y: targetPoint.y + this.position.y },
        lineWidth * this.viewport.scale,
        hexColor2RGBA(color)
      );
    } else if (__typename === "InkDocumentStamp") {
      InkObject._render(
        ctx,
        paths.map((path) =>
          path.map((point) => {
            return {
              x: point.x + this.position.x,
              y: point.y + this.position.y,
            };
          })
        ),
        lineWidth * this.viewport.scale,
        hexColor2RGBA(color)
      );
      //
    } else if (__typename === "SquareDocumentStamp") {
      const renderedRect = rect.slice();
      renderedRect[0] = this.position.x;
      renderedRect[1] = this.position.y;
      SquareObject._render(ctx, renderedRect, lineWidth * this.viewport.scale, hexColor2RGBA(color));
      //
    } else if (__typename === "CircleDocumentStamp") {
      const renderedRect = rect.slice();
      renderedRect[0] = this.position.x;
      renderedRect[1] = this.position.y;
      CircleObject._render(ctx, renderedRect, lineWidth * this.viewport.scale, hexColor2RGBA(color));
      //
    } else if (__typename === "ImageDocumentStamp") {
      const renderedRect = rect.slice();
      renderedRect[0] = this.position.x;
      renderedRect[1] = this.position.y;
      ImageObject._render(ctx, renderedRect, this.image);
      //
    } else if (__typename === "TextBoxDocumentStamp") {
      const renderedRect = rect.slice();
      renderedRect[0] = this.position.x;
      renderedRect[1] = this.position.y;

      const weight = FONT_WEIGHT[fontWeight];
      const size = fontSize * this.viewport.scale;
      const family = FONT_FAMILY[fontFamily];
      const alignment = TEXT_ALIGNMENT[textAlignment];

      TextBoxObject._render(ctx, renderedRect, text, hexColor2RGBA(color), weight, size, family, alignment);
      //
    } else {
      // this._draw();
    }
  }

  _draw() {
    this.canvas.width = this.canvas.width;
    if (!this.position || !this.previewImage) return;

    const imageRatio = this.previewImage.naturalWidth / this.previewImage.naturalHeight;
    let imageWidth = this.previewImage.naturalWidth;
    let imageHeight = this.previewImage.naturalHeight;

    if (imageWidth >= imageHeight && imageWidth > this.viewport.width / 3) {
      imageWidth = this.viewport.width / 3;
      imageHeight = imageWidth / imageRatio;
    } else if (imageWidth < imageHeight && imageHeight > this.viewport.height / 3) {
      imageHeight = this.viewport.height / 3;
      imageWidth = imageHeight * imageRatio;
    }

    const left = Math.min(Math.max(10, this.position.x + 3), this.canvas.clientWidth - imageWidth - 10);
    const top = Math.min(Math.max(10, this.position.y + 3), this.canvas.clientHeight - imageHeight - 10);

    const ctx = this.canvas.getContext("2d");
    ctx.globalAlpha = 0.75;
    ctx.drawImage(this.previewImage, left, top, imageWidth, imageHeight);
  }
}

export default StampsBuilder;
