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
  addAnnotationEl,
} from "../folia-util";
import { RECT_MIN_SIZE, FOLIA_LAYER_ROLES } from "../folia-page-layer";
import { ANNOTATION_TYPES, ANNOTATION_WEIGHT, PERMISSIONS } from "../constants";

class FoliaBaseAnnotation {
  isSelected = false;
  annotationRawData = {};
  safeArea = 0;
  _isDirty;

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
    annotationDIV.setAttribute("data-timestamp", new Date(this.annotationRawData.addedAt).getTime());
    annotationDIV.className = `folia-annotation ${this.annotationRawData.__typename}`;
    annotationDIV.classList.toggle("no-permission", !this.canManage);
    annotationDIV.classList.toggle("error", Boolean(this.annotationRawData.error));
    annotationDIV.classList.toggle(this.annotationRawData.__typename, true);

    this.annotationDIV = addAnnotationEl(this.foliaLayer, annotationDIV);
    // console.log("BASE ANNO CONSTRUCTOR", this.annotationRawData.__typename);
  }

  createAndAppendCanvas() {
    // console.log("createAndAppendCanvas::" + this.annotationRawData.__typename, this.canvas);
    const canvas = document.createElement("canvas");
    canvas.setAttribute("data-id", `${this.id}`);
    canvas.setAttribute("data-timestamp", new Date(this.annotationRawData.addedAt).getTime());
    canvas.width = this.pdfCanvas.width;
    canvas.height = this.pdfCanvas.height;
    canvas.className = "folia-annotation-canvas " + this.annotationRawData.__typename;
    canvas.style.width = this.pdfCanvas.clientWidth + "px";
    canvas.style.height = this.pdfCanvas.clientHeight + "px";
    this.canvas = addAnnotationEl(this.pdfCanvas.parentNode, canvas);
  }

  render() {
    const { left, top, width, height } = this.getBoundingRect();
    this.annotationDIV.style.left = `${left}px`;
    this.annotationDIV.style.top = `${top}px`;
    this.annotationDIV.style.width = `${width}px`;
    this.annotationDIV.style.height = `${height}px`;
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
    // console.log("Update in viewer ERR:", this.annotationRawData.id, this.annotationRawData.error);
    this.annotationRawData.error = annotationRawData.error;
    this.updateErrorStatus();
    this.annotationDIV.classList.toggle("no-permission", !this.canManage);

    const inputDate = new Date(annotationRawData.addedAt).getTime();
    const objectDate = new Date(this.annotationRawData.addedAt).getTime();

    if (inputDate === objectDate) this.isDirty = null;

    const updateByErrorChanges = Boolean(annotationRawData.error) !== Boolean(this.annotationRawData.error);
    // prettier-ignore
    const roleHasBeenChanged = this.annotationRawData.hasOwnProperty("userRole") && annotationRawData.userRole !== this.annotationRawData.userRole;
    if (force || inputDate > objectDate || updateByErrorChanges || roleHasBeenChanged) {
      // prettier-ignore
      // console.log("object was changed", annotationRawData.id, { force, date: inputDate > objectDate, errorChanges: updateByErrorChanges, roleChanges: roleHasBeenChanged });
      for (const [key, value] of Object.entries(annotationRawData)) {
        this.annotationRawData[key] = value;
      }
      this.render();
    }
  }

  updateErrorStatus() {
    this.annotationDIV.classList.toggle("error", Boolean(this.annotationRawData.error));
  }

  deleteFromCanvas() {
    this.annotationDIV.remove();
    this.canvas?.remove();
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
    this.foliaLayer.classList.add("selected");
    this.annotationDIV.classList.add("selected");
    const stepan = document.createElement("span");
    stepan.className = "stepan";
    this.annotationDIV.appendChild(stepan);
    this.canvas?.classList.add("selected");
    // this.canvas && this.canvas.classList.add("selected");
    this.isSelected = true;
  }
  markAsUnselected() {
    this.setCornersVisibility(false);
    this.foliaLayer.classList.remove("selected");
    this.annotationDIV.classList.remove("selected");
    this.annotationDIV.querySelectorAll("span.stepan").forEach((el) => el.remove());
    this.canvas?.classList.remove("selected");

    this.isSelected = false;
    delete this.annotationRawData.doNotCommit;

    if (this.isDirty) this.foliaPageLayer.commitObjectChanges(this.getRawData());
  }

  markAsDeleted() {
    this.markAsChanged();
    this.annotationRawData.deletedAt = this.isDirty;
  }

  markAsChanged() {
    this.isDirty = new Date().toISOString();
    this.annotationRawData.addedAt = this.isDirty;
  }

  markAsUnchanged() {
    this.isDirty = null;
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
    // console.log("resizeTo", this.safeArea);
    if (!this.canManage) return;
    if (!point || !corner) return;

    const lineWidth = (this.annotationRawData.lineWidth || 0) * this.viewport.scale;
    this.safeArea ||= lineWidth * 1;

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

      // const arrowHeight = Math.max(this.annotationRawData.lineWidth * this.viewport.scale, 5) * 3.7;
      // const annotationWidth = Math.abs(this.targetPoint.x - this.sourcePoint.x) * window.devicePixelRatio;
      // const annotationHeight = Math.abs(this.targetPoint.y - this.sourcePoint.y) * window.devicePixelRatio;
      // const arrowLength = Math.sqrt(Math.pow(annotationWidth, 2) + Math.pow(annotationHeight, 2));
      // console.log({ arrowHeight, arrowLength });
      //
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

  startEditMode() {
    //
  }
  stopEditMode() {
    //
  }

  get isDirty() {
    // console.log("get isDirty, doNotCommit is", "doNotCommit" in this.annotationRawData);
    if ("doNotCommit" in this.annotationRawData) return false;
    return this._isDirty;
  }
  set isDirty(value) {
    this._isDirty = value;
  }
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
