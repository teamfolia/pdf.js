import { cloneDeep } from "lodash";
import { fromPdfRect, fromPdfPoint } from "../folia-util";
import { RECT_MIN_SIZE, FOLIA_LAYER_ROLES } from "../folia-page-layer";
import { PERMISSIONS } from "../constants";

class FoliaBaseAnnotation {
  isSelected = false;
  isDirty = 0;
  annotationRawData = {};

  constructor(foliaPageLayer, annotationRawData) {
    this.foliaPageLayer = foliaPageLayer;
    this.foliaLayer = foliaPageLayer.foliaLayer;
    this.dataProxy = foliaPageLayer.dataProxy;
    this.annotationRawData = cloneDeep(annotationRawData);
    this.viewport = foliaPageLayer.viewport.clone({ dontFlip: true });
    this.permissions = [];
    this.needToReRender = true;

    // console.log(this.annotationRawData)
    if (this.annotationRawData.newbie) {
      this.isDirty = this.annotationRawData.created;
      setTimeout(() => this.commitObjectChanges(), 0);
    }

    const annotationDIV = document.createElement("div");
    annotationDIV.setAttribute("data-id", `${this.id}`);
    annotationDIV.setAttribute("data-role", FOLIA_LAYER_ROLES.ANNOTATION_OBJECT);
    annotationDIV.className = "folia-annotation";
    this.annotationDIV = annotationDIV;
    this.foliaLayer.appendChild(annotationDIV);
  }

  get editableProperties() {
    const that = this;
    return {
      list: that.editablePropertiesList,
      set: (data) => {
        if (!that.canManage) return;
        for (const [key, value] of Object.entries(data)) {
          if (that.editablePropertiesList.includes(key)) {
            this.annotationRawData[key] = value;
            this.isDirty = new Date().toISOString();
          }
        }
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
    console.log("BASE RENDER");
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

  deleteFromCanvas() {
    this.annotationDIV.remove();
  }
  buildBaseCorners() {
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
    this.setCornersVisibility(true);
    this.annotationDIV.classList.add("selected");
    this.isSelected = true;
    this.annotationDIV.style.zIndex = "2";
    this.render();
  }
  markAsUnselected() {
    this.setCornersVisibility(false);
    this.annotationDIV.classList.remove("selected");
    this.isSelected = false;
    this.annotationDIV.style.zIndex = "1";
    this.commitObjectChanges();
    this.render();
  }
  markAsDeleted() {
    this.annotationRawData.deletedAt = this.isDirty = new Date().toISOString();
  }
  commitObjectChanges() {
    if (!this.isDirty) return;
    if (this.annotationRawData.deletedAt) {
      this.dataProxy.deleteObject(this.id);
    } else {
      this.dataProxy.postObject(this.getRawData());
    }
  }
  update(viewport, annotationRawData) {
    this.viewport = viewport;

    if (this.isDirty === annotationRawData.addedAt) this.isDirty = null;
    if (!this.isDirty) {
      for (const [key, value] of Object.entries(annotationRawData)) {
        if (this.editablePropertiesList.includes(key)) {
          this.needToReRender = JSON.stringify(this.annotationRawData[key]) !== JSON.stringify(value);
          this.annotationRawData[key] = value;
        }
      }
    }

    this.render();
  }
  memorizeMovingOffset(startPoint) {
    if (!startPoint) return;
    this._startMoving = {
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

  moveTo(point) {
    if (!this.canManage) return;
    if (!point) return;
    const left = this._startMoving.offset.x + point.x;
    const top = this._startMoving.offset.y + point.y;
    this.annotationDIV.style.left = left + "px";
    this.annotationDIV.style.top = top + "px";

    this.isDirty = new Date().toISOString();
    if (typeof this.updateAnnotationRawData === "function") {
      this.updateAnnotationRawData();
    }
    requestAnimationFrame(() => this.render());
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

    this.isDirty = new Date().toISOString();
    if (typeof this.updateAnnotationRawData === "function") {
      this.updateAnnotationRawData();
    }
    requestAnimationFrame(() => this.render());
  }

  pointTo(point, corner, withAlt) {
    if (!this.canManage) return;
    const deltaX = this._startMoving.startPoint.x - point.x;
    const deltaY = this._startMoving.startPoint.y - point.y;
    if (corner === FOLIA_LAYER_ROLES.ARROW_CORNERS.BEGIN) {
      this.sourcePoint.x = this._startMoving.sourcePoint.x - deltaX;
      this.sourcePoint.y = this._startMoving.sourcePoint.y - deltaY;
    } else if (corner === FOLIA_LAYER_ROLES.ARROW_CORNERS.END) {
      this.targetPoint.x = this._startMoving.targetPoint.x - deltaX;
      this.targetPoint.y = this._startMoving.targetPoint.y - deltaY;
    }
    requestAnimationFrame(() => this.render());
    if (typeof this.updateAnnotationRawData === "function") {
      this.updateAnnotationRawData();
    }
    this.isDirty = new Date().toISOString();
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
  get deleted() {
    return this.annotationRawData.deleted;
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
