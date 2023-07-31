import { v4 as uuid } from "uuid";
import { cloneDeep } from "lodash";
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

  constructor(foliaPageLayer, annotationRawData) {
    this.foliaPageLayer = foliaPageLayer;
    this.foliaLayer = foliaPageLayer.foliaLayer;
    this.dataProxy = foliaPageLayer.dataProxy;
    this.annotationRawData = cloneDeep(annotationRawData);
    this.viewport = foliaPageLayer.viewport.clone({ dontFlip: true });
    this.permissions = [];
    this.needToReRender = true;

    const annotationDIV = document.createElement("div");
    annotationDIV.setAttribute("data-id", `${this.id}`);
    annotationDIV.setAttribute("data-role", FOLIA_LAYER_ROLES.ANNOTATION_OBJECT);
    annotationDIV.className = `folia-annotation ${this.annotationRawData.__typename}`;
    // console.log("error on constructor", this.annotationRawData.error);
    annotationDIV.classList.toggle("error-status", Boolean(this.annotationRawData.error));
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

    try {
    } catch (e) {
      console.error(e);
      this.foliaLayer.appendChild(annotationDIV);
    }
  }

  appendAnnot2Layer(parent, child) {
    ANNOTATION_WEIGHT;
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
  render() {
    // console.log("BASE RENDER");
    const { width: viewportWidth, height: viewportHeight } = this.viewport;
    const [left, top, width, height] = fromPdfRect(
      this.annotationRawData.rect,
      viewportWidth,
      viewportHeight
    );
    this.annotationDIV.style.left = `${left}px`;
    this.annotationDIV.style.top = `${top}px`;
    this.annotationDIV.style.width = `${width}px`;
    this.annotationDIV.style.height = `${height}px`;
  }

  update(annotationRawData, viewport, force = false) {
    this.viewport = this.viewport || viewport;
    this.annotationRawData.error = annotationRawData.error;
    this.annotationDIV.classList.toggle("error-status", Boolean(this.annotationRawData.error));

    const newDate = new Date(annotationRawData.addedAt).getTime();
    const currDate = new Date(this.annotationRawData.addedAt).getTime();

    if (newDate === currDate) this.isDirty = null;

    if (force || newDate > currDate) {
      // console.log("anno update", annotationRawData);
      for (const [key, value] of Object.entries(annotationRawData)) {
        // console.log("anno update", { [key]: value });
        this.annotationRawData[key] = value;
      }
    }

    this.render();
  }

  updateErrorStatus() {
    this.annotationDIV.classList.toggle("error-status", Boolean(this.annotationRawData.error));
  }
  deleteFromCanvas() {
    this.annotationDIV.remove();
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
    const left = this._startMoving.offset.x + point.x;
    const top = this._startMoving.offset.y + point.y;
    this.annotationDIV.style.left = left + "px";
    this.annotationDIV.style.top = top + "px";

    this.pointTo(point, FOLIA_LAYER_ROLES.ARROW_CORNERS.BEGIN);
    this.pointTo(point, FOLIA_LAYER_ROLES.ARROW_CORNERS.END);

    this.markAsChanged();
    this.updateRects();
  }

  resizeTo(point, corner, withAlt) {
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
      this.sourcePoint.x = this._startMoving.sourcePoint.x - deltaX;
      this.sourcePoint.y = this._startMoving.sourcePoint.y - deltaY;
    } else if (corner === FOLIA_LAYER_ROLES.ARROW_CORNERS.END && this.targetPoint) {
      this.targetPoint.x = this._startMoving.targetPoint.x - deltaX;
      this.targetPoint.y = this._startMoving.targetPoint.y - deltaY;
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
      return this.annotationRawData.collaboratorEmail === this.dataProxy.userEmail;
    }
    return permissions.includes(PERMISSIONS.MANAGE_ANNOTATION);
  }
  get canDelete() {
    const { userEmail, permissions } = this.foliaPageLayer.dataProxy;
    const isAnnotationOwn = this.annotationRawData.collaboratorEmail === userEmail;
    if (this.annotationRawData.__typename === ANNOTATION_TYPES.COMMENT) {
      return isAnnotationOwn;
    }
    return isAnnotationOwn
      ? permissions.includes(PERMISSIONS.MANAGE_ANNOTATION)
      : permissions.includes(PERMISSIONS.DELETE_FOREIGN_ANNOTATION);
  }
}

export default FoliaBaseAnnotation;
