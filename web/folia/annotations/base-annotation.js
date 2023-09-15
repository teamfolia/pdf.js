import { v4 as uuid } from "uuid";
import { cloneDeep, differenceWith } from "lodash";
import {
  fromPdfRect,
  toPdfRect,
  fromPdfPath,
  toPdfPath,
  fromPdfPoint,
  toPdfPoint,
  shiftRect,
  shiftArrow,
  shiftInk,
} from "../folia-util";
import { RECT_MIN_SIZE, FOLIA_LAYER_ROLES } from "../folia-page-layer";
import { ANNOTATION_TYPES, ANNOTATION_WEIGHT, PERMISSIONS } from "../constants";

class FoliaBaseAnnotation {
  isSelected = false;
  annotationRawData = {};
  safeArea = 10;

  constructor(foliaPageLayer, annotationRawData) {
    this.foliaPageLayer = foliaPageLayer;
    this.foliaLayer = foliaPageLayer.foliaLayer;
    this.dataProxy = foliaPageLayer.dataProxy;
    this.annotationRawData = structuredClone(annotationRawData);
    this.viewport = foliaPageLayer.viewport.clone({ dontFlip: true });
    this.permissions = [];
    this.needToReRender = true;
    this.pdfCanvas = this.foliaLayer.parentNode.querySelector("div.canvasWrapper>canvas");

    const annotationDIV = document.createElement("div");
    annotationDIV.setAttribute("data-id", `${this.id}`);
    annotationDIV.setAttribute("data-role", FOLIA_LAYER_ROLES.ANNOTATION_OBJECT);
    annotationDIV.className = `folia-annotation ${this.annotationRawData.__typename}`;
    annotationDIV.classList.toggle("no-permission", !this.canManage);
    annotationDIV.classList.toggle("error", Boolean(this.annotationRawData.error));
    this.annotationDIV = annotationDIV;

    const annoWeight = ANNOTATION_WEIGHT.indexOf(this.annotationRawData.__typename);
    const children = this.foliaLayer.children;
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      const childWeight = Array.from(child.classList).reduce((acc, className) => {
        return Math.max(acc, ANNOTATION_WEIGHT.indexOf(className));
      }, -1);
      if (childWeight < annoWeight) {
        this.foliaLayer.insertBefore(annotationDIV, child);
        return;
      } else if (childWeight === annoWeight) {
        const childAnno = this.foliaPageLayer.annotationObjects.get(child.dataset?.id);
        const childAddedTime = new Date(childAnno.annotationRawData.addedAt);
        const annoAddedTime = new Date(this.annotationRawData.addedAt);
        if (childAddedTime.getTime() > annoAddedTime.getTime()) {
          this.foliaLayer.insertBefore(annotationDIV, child);
          return;
        }
      }
    }
    this.foliaLayer.appendChild(annotationDIV);
  }

  // appendAnnot2Layer(parent, child) {
  //   ANNOTATION_WEIGHT;
  // }

  render() {
    const lineWidth = (this.annotationRawData.lineWidth || 0) * this.viewport.scale;
    const { left, top, width, height } = this.getBoundingRect();
    this.annotationDIV.style.left = `${left - lineWidth / 2}px`;
    this.annotationDIV.style.top = `${top - lineWidth / 2}px`;
    this.annotationDIV.style.width = `${width + lineWidth}px`;
    this.annotationDIV.style.height = `${height + lineWidth}px`;
    // this.annotationDIV.style.backgroundColor = "rgba(0, 0, 0, 0.05)";
    // console.log("BASE RENDER", { left, top, width, height });
  }

  get editableProperties() {
    const that = this;
    return {
      list: that.editablePropertiesList,
      set: (data) => {
        if (!that.canManage) return;
        const prevState = this.getRawData();

        for (const [key, value] of Object.entries(data)) {
          if (that.editablePropertiesList.includes(key)) {
            this.annotationRawData[key] = value;
            this.markAsChanged();
          }
        }

        const nextState = this.getRawData();
        this.foliaPageLayer.undoRedoManager.updatingObject(prevState, nextState);

        return this.render();
      },
      get: () =>
        that.editablePropertiesList.reduce((acc, propName) => {
          switch (propName) {
            case "color":
              acc[propName] = this.annotationRawData.color;
              break;
            case "lineWidth":
              acc[propName] = that.annotationRawData.lineWidth;
              break;
            case "fontFamily":
              acc[propName] = that.annotationRawData.fontFamily;
              break;
            case "fontSize":
              acc[propName] = that.annotationRawData.fontSize;
              break;
            case "fontWeight":
              acc[propName] = that.annotationRawData.fontWeight;
              break;
            case "textAlignment":
              acc[propName] = that.annotationRawData.textAlignment;
              break;
            default:
              break;
          }
          return acc;
        }, {}),
    };
  }

  update(annotationRawData, viewport, force = false) {
    this.viewport = this.viewport || viewport;
    this.annotationRawData.error = annotationRawData.error;
    this.annotationDIV.classList.toggle("error-status", Boolean(this.annotationRawData.error));

    const newDate = new Date(annotationRawData.addedAt).getTime();
    const currDate = new Date(this.annotationRawData.addedAt).getTime();

    if (newDate === currDate) this.isDirty = null;

    const updateByErrorChanges = Boolean(annotationRawData.error) !== Boolean(this.annotationRawData.error);
    const roleHasBeenChanged = annotationRawData.userRole !== this.annotationRawData.userRole;
    if (force || newDate > currDate || updateByErrorChanges || roleHasBeenChanged) {
      // console.log("update", { new: annotationRawData.addedAt, curr: this.annotationRawData.addedAt });
      for (const [key, value] of Object.entries(annotationRawData)) {
        // console.log("anno update", { [key]: value });
        this.annotationRawData[key] = value;
      }
      this.render();
    } else {
      // console.log("not update", { new: annotationRawData, curr: this.annotationRawData.addedAt });
    }
  }

  updateErrorStatus() {
    this.annotationDIV.classList.toggle("error-status", Boolean(this.annotationRawData.error));
  }
  deleteFromCanvas() {
    this.annotationDIV.remove();
    // this.canvas.remove();
  }
  buildBaseCorners() {
    if (!this.canManage) return;
    Object.keys(FOLIA_LAYER_ROLES.RECT_CORNERS).forEach((corner) => {
      const cornerDiv = document.createElement("div");
      cornerDiv.className = `corner-div ${FOLIA_LAYER_ROLES.RECT_CORNERS[corner]}`;
      cornerDiv.setAttribute("data-id", `${this.id}`);
      cornerDiv.setAttribute("data-role", FOLIA_LAYER_ROLES.RECT_CORNERS[corner]);
      this.annotationDIV.appendChild(cornerDiv);
    });
  }
  setCornersVisibility(visibility) {
    this.annotationDIV.querySelectorAll(".corner-div").forEach((cornerEl) => {
      cornerEl.style.display = visibility ? "block" : "none";
    });
  }
  markAsSelected() {
    this.setCornersVisibility(this.canManage);
    this.annotationDIV.classList.add("selected");
    this.isSelected = true;
  }
  markAsUnselected() {
    this.setCornersVisibility(false);
    this.annotationDIV.classList.remove("selected");
    this.isSelected = false;

    if (this.isDirty) {
      this.foliaPageLayer.commitObjectChanges(this.getRawData());
    }
  }
  markAsDeleted() {
    this.markAsChanged();
    this.annotationRawData.deletedAt = this.isDirty;
  }
  markAsChanged() {
    this.isDirty = new Date().toISOString();
    this.annotationRawData.addedAt = this.isDirty;
  }

  saveRectsState(startPoint) {
    if (!startPoint) return;
    this._startMoving = {
      prevState: this.getRawData(),
      offset: {
        x: this.annotationDIV.offsetLeft - startPoint.x,
        y: this.annotationDIV.offsetTop - startPoint.y,
      },
      startPoint: {
        x: startPoint.x,
        y: startPoint.y,
      },
      startRect: [
        this.annotationDIV.offsetLeft,
        this.annotationDIV.offsetTop,
        this.annotationDIV.offsetLeft + this.annotationDIV.clientWidth,
        this.annotationDIV.offsetTop + this.annotationDIV.clientHeight,
      ],
      dimensions: {
        left: this.annotationDIV.offsetLeft,
        top: this.annotationDIV.offsetTop,
        width: this.annotationDIV.clientWidth,
        height: this.annotationDIV.clientHeight,
      },
      aspectRatioH: this.annotationDIV.clientHeight / this.annotationDIV.clientWidth,
      aspectRatioW: this.annotationDIV.clientWidth / this.annotationDIV.clientHeight,
      sourcePoint: {
        x: this.sourcePoint ? this.sourcePoint.x : 0,
        y: this.sourcePoint ? this.sourcePoint.y : 0,
      },
      targetPoint: {
        x: this.targetPoint ? this.targetPoint.x : 0,
        y: this.targetPoint ? this.targetPoint.y : 0,
      },
    };
  }

  getDuplicate() {
    const shiftValue = 20;
    const duplicate = this.getRawData();
    duplicate.id = uuid();
    duplicate.addedAt = new Date().toISOString();

    switch (duplicate.__typename) {
      case "InkAnnotation": {
        const paths = shiftInk(
          duplicate.paths.map((path) => fromPdfPath(path, this.viewport.width, this.viewport.height)),
          shiftValue
        );
        duplicate.paths = paths.map((path) => toPdfPath(path, this.viewport.width, this.viewport.height));
        break;
      }
      case "ArrowAnnotation": {
        const { sourcePoint, targetPoint } = shiftArrow(
          fromPdfPoint(duplicate.sourcePoint, this.viewport.width, this.viewport.height),
          fromPdfPoint(duplicate.targetPoint, this.viewport.width, this.viewport.height),
          shiftValue
        );
        duplicate.sourcePoint = toPdfPoint(sourcePoint, this.viewport.width, this.viewport.height);
        duplicate.targetPoint = toPdfPoint(targetPoint, this.viewport.width, this.viewport.height);
        break;
      }
      default: {
        const rect = shiftRect(
          fromPdfRect(duplicate.rect, this.viewport.width, this.viewport.height),
          shiftValue
        );
        duplicate.rect = toPdfRect(rect, this.viewport.width, this.viewport.height);
        if (duplicate.__typename === "ImageAnnotation") duplicate.newbie = true;
      }
    }
    return duplicate;
  }

  updateRects() {}

  moveTo(point) {
    if (!this.canManage) return;
    if (!point) return;

    if (this.annotationRawData.__typename === ANNOTATION_TYPES.ARROW) {
      // arrow
      const arrowRect = [
        Math.min(this._startMoving.sourcePoint.x, this._startMoving.targetPoint.x),
        Math.min(this._startMoving.sourcePoint.y, this._startMoving.targetPoint.y),
        Math.max(this._startMoving.sourcePoint.x, this._startMoving.targetPoint.x) -
          Math.min(this._startMoving.sourcePoint.x, this._startMoving.targetPoint.x),
        Math.max(this._startMoving.sourcePoint.y, this._startMoving.targetPoint.y) -
          Math.min(this._startMoving.sourcePoint.y, this._startMoving.targetPoint.y),
      ];
      const directionX = Math.sign(this.targetPoint.x - this.sourcePoint.x);
      const directionY = Math.sign(this.targetPoint.y - this.sourcePoint.y);

      const deltaX = this._startMoving.startPoint.x - point.x;
      const deltaY = this._startMoving.startPoint.y - point.y;

      const newArrowRect = [
        Math.min(
          Math.max(arrowRect[0] - deltaX, this.safeArea),
          this.viewport.width - arrowRect[2] - this.safeArea
        ),
        Math.min(
          Math.max(arrowRect[1] - deltaY, this.safeArea),
          this.viewport.height - arrowRect[3] - this.safeArea
        ),
        arrowRect[2],
        arrowRect[3],
      ];

      this.sourcePoint.x = directionX === 1 ? newArrowRect[0] : newArrowRect[0] + arrowRect[2];
      this.sourcePoint.y = directionY === 1 ? newArrowRect[1] : newArrowRect[1] + arrowRect[3];
      this.targetPoint.x = directionX === 1 ? newArrowRect[0] + arrowRect[2] : newArrowRect[0];
      this.targetPoint.y = directionY === 1 ? newArrowRect[1] + arrowRect[3] : newArrowRect[1];

      // console.log("move arrow", this.sourcePoint, this.targetPoint);
    } else {
      // other
      const left = Math.min(
        Math.max(this._startMoving.offset.x + point.x, this.safeArea),
        this.viewport.width - this.annotationDIV.clientWidth - this.safeArea
      );
      const top = Math.min(
        Math.max(this._startMoving.offset.y + point.y, this.safeArea),
        this.viewport.height - this.annotationDIV.clientHeight - this.safeArea
      );

      this.annotationDIV.style.left = left + "px";
      this.annotationDIV.style.top = top + "px";
      //
    }

    this.markAsChanged();
    this.updateRects();
  }

  resizeTo(point, corner, withAlt) {
    // console.log("resizeTo", point, corner, withAlt);
    if (!this.canManage) return;
    if (!point || !corner) return;

    const lineWidth = (this.annotationRawData.lineWidth || 0) * this.viewport.scale;
    this.safeArea = lineWidth * 1;

    const fixedAspectRatio = this.fixedAspectRatio && !withAlt;
    const { startPoint, startRect, aspectRatioH, aspectRatioW, dimensions } = this._startMoving;
    let deltaX = startPoint.x - point.x;
    let deltaY = startPoint.y - point.y;
    let left = startRect[0],
      top = startRect[1],
      width = startRect[2] - startRect[0],
      height = startRect[3] - startRect[1];

    switch (corner) {
      case FOLIA_LAYER_ROLES.RECT_CORNERS.LT:
        left = Math.min(Math.max(startRect[0] - deltaX, this.safeArea), startRect[2] - this.safeArea * 3);
        top = Math.min(Math.max(startRect[1] - deltaY, this.safeArea), startRect[3] - this.safeArea * 3);
        width = startRect[2] - left;
        height = startRect[3] - top;
        break;
      case FOLIA_LAYER_ROLES.RECT_CORNERS.RT:
        top = Math.min(Math.max(startRect[1] - deltaY, this.safeArea), startRect[3] - this.safeArea * 3);
        width = Math.min(
          Math.max(startRect[2] - left - deltaX, this.safeArea * 3),
          this.viewport.width - left - this.safeArea
        );
        height = startRect[3] - top;
        break;
      case FOLIA_LAYER_ROLES.RECT_CORNERS.RB:
        width = Math.min(
          Math.max(startRect[2] - left - deltaX, this.safeArea * 3),
          this.viewport.width - left - this.safeArea
        );
        height = Math.min(
          Math.max(startRect[3] - top - deltaY, this.safeArea * 3),
          this.viewport.height - top - this.safeArea
        );
        break;
      case FOLIA_LAYER_ROLES.RECT_CORNERS.LB:
        left = Math.min(Math.max(startRect[0] - deltaX, this.safeArea), startRect[2] - this.safeArea * 3);
        width = startRect[2] - left;
        height = Math.min(
          Math.max(startRect[3] - top - deltaY, this.safeArea * 3),
          this.viewport.height - top - this.safeArea
        );
        break;
      default:
        break;
    }
    this.annotationDIV.style.left = left + "px";
    this.annotationDIV.style.top = top + "px";
    this.annotationDIV.style.width = width + "px";
    this.annotationDIV.style.height = height + "px";

    this.markAsChanged();
    this.updateRects();
  }

  _resizeTo(point, corner, withAlt) {
    if (!this.canManage) return;
    if (!point || !corner) return;

    let left = this._startMoving.offset.x + point.x;
    let top = this._startMoving.offset.y + point.y;
    let deltaX = this._startMoving.startPoint.x - point.x;
    let deltaY = this._startMoving.startPoint.y - point.y;

    switch (corner) {
      case FOLIA_LAYER_ROLES.RECT_CORNERS.LT: {
        if (this.fixedAspectRatio && !withAlt) {
          let height = this._startMoving.dimensions.height + deltaY;
          deltaX = deltaY * this._startMoving.aspectRatioW;
          let width = this._startMoving.dimensions.width + deltaX;
          left = this._startMoving.dimensions.left - deltaX;
          if (width < RECT_MIN_SIZE || height < RECT_MIN_SIZE) break;
          this.annotationDIV.style.left = left + "px";
          this.annotationDIV.style.width = width + "px";
          this.annotationDIV.style.top = top + "px";
          this.annotationDIV.style.height = height + "px";
        } else {
          let width = this._startMoving.dimensions.width + deltaX;
          let height = this._startMoving.dimensions.height + deltaY;
          if (width >= RECT_MIN_SIZE) {
            this.annotationDIV.style.left = left + "px";
            this.annotationDIV.style.width = width + "px";
          }
          if (height >= RECT_MIN_SIZE) {
            this.annotationDIV.style.top = top + "px";
            this.annotationDIV.style.height = height + "px";
          }
        }
        break;
      }
      case FOLIA_LAYER_ROLES.RECT_CORNERS.RT: {
        let width = this._startMoving.dimensions.width - deltaX;
        const height = this._startMoving.dimensions.height + deltaY;
        if (this.fixedAspectRatio && !withAlt) {
          width = height * this._startMoving.aspectRatioW;
          if (width < RECT_MIN_SIZE || height < RECT_MIN_SIZE) break;
          this.annotationDIV.style.width = width + "px";
          this.annotationDIV.style.top = top + "px";
          this.annotationDIV.style.height = height + "px";
        } else {
          if (width >= RECT_MIN_SIZE) this.annotationDIV.style.width = width + "px";
          if (height >= RECT_MIN_SIZE) {
            this.annotationDIV.style.top = top + "px";
            this.annotationDIV.style.height = height + "px";
          }
        }
        break;
      }
      case FOLIA_LAYER_ROLES.RECT_CORNERS.RB: {
        const width = this._startMoving.dimensions.width - deltaX;
        let height = this._startMoving.dimensions.height - deltaY;

        if (this.fixedAspectRatio && !withAlt) {
          height = width * this._startMoving.aspectRatioH;
          if (width < RECT_MIN_SIZE || height < RECT_MIN_SIZE) break;
          this.annotationDIV.style.width = width + "px";
          this.annotationDIV.style.height = height + "px";
        } else {
          if (width >= RECT_MIN_SIZE) this.annotationDIV.style.width = width + "px";
          if (height >= RECT_MIN_SIZE) this.annotationDIV.style.height = height + "px";
        }
        break;
      }
      case FOLIA_LAYER_ROLES.RECT_CORNERS.LB: {
        const width = this._startMoving.dimensions.width + deltaX;
        let height = this._startMoving.dimensions.height - deltaY;
        if (this.fixedAspectRatio && !withAlt) {
          height = width * this._startMoving.aspectRatioH;
          if (width < RECT_MIN_SIZE || height < RECT_MIN_SIZE) break;
          this.annotationDIV.style.left = left + "px";
          this.annotationDIV.style.width = width + "px";
          this.annotationDIV.style.height = height + "px";
        } else {
          if (width >= RECT_MIN_SIZE) {
            this.annotationDIV.style.left = left + "px";
            this.annotationDIV.style.width = width + "px";
          }
          if (height >= RECT_MIN_SIZE) this.annotationDIV.style.height = height + "px";
        }
        break;
      }
      default:
        break;
    }

    this.markAsChanged();
    this.updateRects();
  }

  pointTo(point, corner) {
    if (!this.canManage) return;

    const deltaX = this._startMoving.startPoint.x - point.x;
    const deltaY = this._startMoving.startPoint.y - point.y;

    if (corner === FOLIA_LAYER_ROLES.ARROW_CORNERS.BEGIN && this.sourcePoint) {
      this.sourcePoint.x = Math.min(
        Math.max(this._startMoving.sourcePoint.x - deltaX, this.safeArea),
        this.viewport.width - this.safeArea
      );
      this.sourcePoint.y = Math.min(
        Math.max(this._startMoving.sourcePoint.y - deltaY, this.safeArea),
        this.viewport.height - this.safeArea
      );
    } else if (corner === FOLIA_LAYER_ROLES.ARROW_CORNERS.END && this.targetPoint) {
      this.targetPoint.x = Math.min(
        Math.max(this._startMoving.targetPoint.x - deltaX, this.safeArea),
        this.viewport.width - this.safeArea
      );
      this.targetPoint.y = Math.min(
        Math.max(this._startMoving.targetPoint.y - deltaY, this.safeArea),
        this.viewport.height - this.safeArea
      );
    }

    this.markAsChanged();
    this.updateRects();
  }

  snapToBounds(margin, role) {
    const leftIsOut = this.rect.left < margin;
    const topIsOut = this.rect.top < margin;
    const rightIsOut = this.rect.left + this.rect.width > this.viewport.width - margin;
    const bottomIsOut = this.rect.top + this.rect.height > this.viewport.height - margin;

    switch (role) {
      case FOLIA_LAYER_ROLES.ANNOTATION_OBJECT: {
        if (leftIsOut) this.annotationDIV.style.left = margin + "px";
        if (topIsOut) this.annotationDIV.style.top = margin + "px";
        if (rightIsOut) this.annotationDIV.style.left = this.viewport.width - this.rect.width - margin + "px";
        if (bottomIsOut)
          this.annotationDIV.style.top = this.viewport.height - this.rect.height - margin + "px";
        break;
      }
      case FOLIA_LAYER_ROLES.RECT_CORNERS.LT: {
        if (leftIsOut) {
          this.annotationDIV.style.width = this.rect.width - Math.abs(this.rect.left) - margin + "px";
          this.annotationDIV.style.left = margin + "px";
        }
        if (topIsOut) {
          this.annotationDIV.style.height = this.rect.height - Math.abs(this.rect.top) - margin + "px";
          this.annotationDIV.style.top = margin + "px";
        }
        break;
      }
      case FOLIA_LAYER_ROLES.RECT_CORNERS.RT: {
        if (topIsOut) {
          this.annotationDIV.style.height = this.rect.height - Math.abs(this.rect.top) - margin + "px";
          this.annotationDIV.style.top = margin + "px";
        }
        if (rightIsOut) {
          this.annotationDIV.style.width = this.viewport.width - this.rect.left - margin + "px";
        }
        break;
      }
      case FOLIA_LAYER_ROLES.RECT_CORNERS.RB: {
        if (rightIsOut) {
          this.annotationDIV.style.width = this.viewport.width - this.rect.left - margin + "px";
        }
        if (bottomIsOut) {
          this.annotationDIV.style.height = this.viewport.height - this.rect.top - margin + "px";
        }
        break;
      }
      case FOLIA_LAYER_ROLES.RECT_CORNERS.LB: {
        if (leftIsOut) {
          this.annotationDIV.style.width = this.rect.width - Math.abs(this.rect.left) - margin + "px";
          this.annotationDIV.style.left = margin + "px";
        }
        if (bottomIsOut) {
          this.annotationDIV.style.height = this.viewport.height - this.rect.top - margin + "px";
        }
        break;
      }
      default:
        break;
    }
  }
  startEditMode() {}
  stopEditMode() {}

  get rect() {
    return {
      left: this.annotationDIV.offsetLeft,
      top: this.annotationDIV.offsetTop,
      width: this.annotationDIV.clientWidth,
      height: this.annotationDIV.clientHeight,
    };
  }
  get id() {
    return this.annotationRawData.id;
  }
  get author() {
    return this.annotationRawData.collaboratorEmail;
  }
  get addedAt() {
    return this.annotationRawData.addedAt;
  }
  get isDeleted() {
    return !!this.annotationRawData.deletedAt;
  }
  get containerElement() {
    return this.annotationDIV;
  }
  get canManage() {
    const { permissions } = this.foliaPageLayer.dataProxy;
    if (this.annotationRawData.__typename === ANNOTATION_TYPES.COMMENT) {
      return (
        permissions.includes(PERMISSIONS.MANAGE_ANNOTATION) &&
        this.annotationRawData.collaboratorEmail === this.dataProxy.userEmail
      );
    }
    return permissions.includes(PERMISSIONS.MANAGE_ANNOTATION);
  }
  get canDelete() {
    const { userEmail, permissions } = this.foliaPageLayer.dataProxy;
    const isAnnotationOwn = this.annotationRawData.collaboratorEmail === userEmail;
    return isAnnotationOwn
      ? permissions.includes(PERMISSIONS.MANAGE_ANNOTATION)
      : permissions.includes(PERMISSIONS.DELETE_FOREIGN_ANNOTATION);
  }
}

export default FoliaBaseAnnotation;
