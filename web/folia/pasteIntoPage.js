// FoliaInkAnnotation
// FoliaArrowAnnotation
// FoliaCircleAnnotation
// FoliaSquareAnnotation
// FoliaTextBoxAnnotation
// FoliaImageAnnotation

import { v4 as uuid } from "uuid";
import { ANNOTATION_TYPES, FONT_FAMILY, FONT_WEIGHT, TEXT_ALIGNMENT } from "./constants";
import { fromPdfPath, fromPdfPoint, fromPdfRect, toPdfPath, toPdfPoint, toPdfRect } from "./folia-util";

class PasteIntoPage {
  constructor(annotationType, annotationData) {
    this.annotationType = annotationType;
    this.annotationData = annotationData;
  }

  // prettier-ignore
  pasteInto(foliaPageLayer) {
    let annotation;
    if (this.annotationType === ANNOTATION_TYPES.INK) {
      annotation = this.#prepareFoliaInkAnnotation(foliaPageLayer.viewport, foliaPageLayer.freeMousePoint);
    } else if (this.annotationType === ANNOTATION_TYPES.ARROW) {
      annotation = this.#prepareFoliaArrowAnnotation(foliaPageLayer.viewport, foliaPageLayer.freeMousePoint);
    } else if (this.annotationType === ANNOTATION_TYPES.CIRCLE) {
      annotation = this.#prepareFoliaCircleAnnotation(foliaPageLayer.viewport, foliaPageLayer.freeMousePoint);
    } else if (this.annotationType === ANNOTATION_TYPES.SQUARE) {
      annotation = this.#prepareFoliaSquareAnnotation(foliaPageLayer.viewport, foliaPageLayer.freeMousePoint);
    } else if (this.annotationType === ANNOTATION_TYPES.TEXT_BOX) {
      annotation = this.#prepareFoliaTextBoxAnnotation(foliaPageLayer.viewport,foliaPageLayer.freeMousePoint);
    } else if (this.annotationType === ANNOTATION_TYPES.IMAGE) {
      annotation = this.#prepareFoliaImageAnnotation(foliaPageLayer.viewport, foliaPageLayer.freeMousePoint);
    } else {
      console.log(`Annotation type ${this.annotationType} is not supported yet`);
    }

    if (!annotation) return;
    // console.log("PasteByClipboard", annotation);

    annotation.id = uuid();
    annotation.addedAt = new Date().toISOString();
    annotation.collaboratorEmail = foliaPageLayer.dataProxy.userEmail;
    annotation.page = foliaPageLayer.pageNumber;
    foliaPageLayer.addAnnotationObject(annotation);
    foliaPageLayer.commitObjectChanges(annotation);
    foliaPageLayer.undoRedoManager.creatingObject(annotation);
  }

  #prepareFoliaInkAnnotation(viewport, position) {
    return {
      __typename: ANNOTATION_TYPES.INK,
      color: this.annotationData.color,
      lineWidth: this.annotationData.lineWidth,
      paths: this.#changePathsPosition(
        this.annotationData.paths,
        viewport,
        position,
        this.annotationData.lineWidth
      ),
    };
  }

  #prepareFoliaArrowAnnotation(viewport, position) {
    const { sourcePoint, targetPoint } = this.#changeArrowPosition(
      this.annotationData.targetPoint,
      this.annotationData.sourcePoint,
      viewport,
      position,
      this.annotationData.lineWidth
    );

    return {
      __typename: ANNOTATION_TYPES.ARROW,
      color: this.annotationData.color,
      lineWidth: this.annotationData.lineWidth,
      sourcePoint,
      targetPoint,
    };
  }

  #prepareFoliaCircleAnnotation(viewport, position) {
    return {
      __typename: ANNOTATION_TYPES.CIRCLE,
      color: this.annotationData.color,
      lineWidth: this.annotationData.lineWidth,
      rect: this.#changeRectPosition(
        this.annotationData.rect,
        viewport,
        position,
        this.annotationData.lineWidth
      ),
    };
  }

  #prepareFoliaSquareAnnotation(viewport, position) {
    return {
      __typename: ANNOTATION_TYPES.SQUARE,
      color: this.annotationData.color,
      lineWidth: this.annotationData.lineWidth,
      rect: this.#changeRectPosition(
        this.annotationData.rect,
        viewport,
        position,
        this.annotationData.lineWidth
      ),
    };
  }

  #prepareFoliaTextBoxAnnotation(viewport, position) {
    const fontFamily = this.annotationData.fontFamily || "SANS_SERIF";
    const fontSize = this.annotationData.fontSize || 12;
    const fontWeight = this.annotationData.fontWeight || "W400";
    const text = this.annotationData.text;
    const rect = this.#changeRectPosition(
      this.annotationData.rect || this.#getRectByText(viewport, text, fontFamily, fontSize, fontWeight),
      viewport,
      position,
      0
    );
    return {
      __typename: ANNOTATION_TYPES.TEXT_BOX,
      rect,
      text,
      color: this.annotationData.color || "#000000FF",
      fontFamily,
      fontSize,
      fontWeight,
      textAlignment: this.annotationData.textAlignment || "START",
    };
  }

  #prepareFoliaImageAnnotation(viewport, position) {
    let rect = this.annotationData.rect,
      content = this.annotationData.content;

    if (this.annotationData.hasOwnProperty("image")) {
      let imageWidth = this.annotationData.imageWidth;
      let imageHeight = this.annotationData.imageHeight;
      const imageRatio = imageWidth / imageHeight;

      if (imageWidth >= imageHeight && imageWidth > viewport.width / 3) {
        imageWidth = viewport.width / 3;
        imageHeight = imageWidth / imageRatio;
      } else if (imageWidth < imageHeight && imageHeight > viewport.height / 3) {
        imageHeight = viewport.height / 3;
        imageWidth = imageHeight * imageRatio;
      }

      content = this.annotationData.image.split(",")[1];
      rect = toPdfRect([0, 0, imageWidth, imageHeight], viewport.width, viewport.height);
    }

    return {
      __typename: ANNOTATION_TYPES.IMAGE,
      filename: this.annotationData.filename,
      newbie: true,
      content,
      rect: this.#changeRectPosition(rect, viewport, position, 0),
    };
  }

  #changeRectPosition(rect, viewport, position, _lineWidth = 0) {
    const lineWidth = _lineWidth * viewport.scale;
    const viewportRect = fromPdfRect(rect, viewport.width, viewport.height);
    return toPdfRect(
      [
        Math.max(
          lineWidth / 2,
          Math.min(position.x - viewportRect[2] / 2, viewport.width - viewportRect[2] - lineWidth / 2)
        ),
        Math.max(
          lineWidth / 2,
          Math.min(position.y - viewportRect[3] / 2, viewport.height - viewportRect[3] - lineWidth / 2)
        ),
        viewportRect[2],
        viewportRect[3],
      ],
      viewport.width,
      viewport.height
    );
  }

  #changePathsPosition(_paths, viewport, position, _lineWidth = 0) {
    const lineWidth = _lineWidth * viewport.scale;
    const { left, top, right, bottom } = _paths.flat().reduce(
      (acc, path, index, arr) => {
        if (index % 2 !== 0) {
          const point = [arr[index - 1], arr[index]];
          const viewportPoint = fromPdfPoint(point, viewport.width, viewport.height);
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

    const posLeft = Math.max(
      lineWidth / 2,
      Math.min(position.x - (right - left) / 2, viewport.width - (right - left) - lineWidth / 2)
    );
    const posTop = Math.max(
      lineWidth / 2,
      Math.min(position.y - (bottom - top) / 2, viewport.height - (bottom - top) - lineWidth / 2)
    );

    const paths = _paths.map((path) => {
      const viewportPath = fromPdfPath(path, viewport.width, viewport.height).map((point) => {
        return {
          x: point.x - left + posLeft,
          y: point.y - top + posTop,
        };
      });
      return toPdfPath(viewportPath, viewport.width, viewport.height);
    });
    return paths;
  }

  #changeArrowPosition(_targetPoint, _sourcePoint, viewport, position, lineWidth) {
    const sourcePoint = fromPdfPoint(_sourcePoint, viewport.width, viewport.height);
    const targetPoint = fromPdfPoint(_targetPoint, viewport.width, viewport.height);

    const arrowRect = [
      Math.min(sourcePoint.x, targetPoint.x),
      Math.min(sourcePoint.y, targetPoint.y),
      Math.max(sourcePoint.x, targetPoint.x) - Math.min(sourcePoint.x, targetPoint.x),
      Math.max(sourcePoint.y, targetPoint.y) - Math.min(sourcePoint.y, targetPoint.y),
    ];
    const directionX = Math.sign(targetPoint.x - sourcePoint.x);
    const directionY = Math.sign(targetPoint.y - sourcePoint.y);

    const deltaX = arrowRect[0] - position.x + arrowRect[2] / 2;
    const deltaY = arrowRect[1] - position.y + arrowRect[3] / 2;

    // prettier-ignore
    const newArrowRect = [
      Math.min(
        Math.max(arrowRect[0] - deltaX, lineWidth / 2),
        viewport.width - arrowRect[2] - lineWidth / 2
      ),
      Math.min(
        Math.max(arrowRect[1] - deltaY, lineWidth / 2),
        viewport.height - arrowRect[3] - lineWidth / 2
      ),
      arrowRect[2],
      arrowRect[3],
    ];

    return {
      targetPoint: toPdfPoint(
        {
          x: directionX === -1 ? newArrowRect[0] : newArrowRect[0] + newArrowRect[2],
          y: directionY === -1 ? newArrowRect[1] : newArrowRect[1] + newArrowRect[3],
        },
        viewport.width,
        viewport.height
      ),
      sourcePoint: toPdfPoint(
        {
          x: directionX === -1 ? newArrowRect[0] + newArrowRect[2] : newArrowRect[0],
          y: directionY === -1 ? newArrowRect[1] + newArrowRect[3] : newArrowRect[1],
        },
        viewport.width,
        viewport.height
      ),
    };
  }

  #getRectByText(viewport, text, _fontFamily, _fontSize, _fontWeight) {
    const fontFamily = FONT_FAMILY[_fontFamily];
    const fontSize = _fontSize * viewport.scale;
    const fontWeight = FONT_WEIGHT[_fontWeight];

    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d");
    ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
    const textRect = ctx.measureText(text);
    return toPdfRect(
      [0, 0, textRect.width * 1.1, textRect.fontBoundingBoxAscent + textRect.fontBoundingBoxDescent],
      viewport.width,
      viewport.height
    );
  }
}

export default PasteIntoPage;
