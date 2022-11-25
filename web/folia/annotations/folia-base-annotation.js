import {cloneDeep, difference} from "lodash";
import {pdfRect2viewRect} from "../folia-util";
import {ANNOTATION_RECT_MIN_SIZE, FOLIA_LAYER_ROLES} from "../FoliaPageLayer";

class FoliaBaseAnnotation {
  annotationRawData;
  viewport;
  annotationDIV;
  foliaLayer;
  isSelected = false;
  isDirty = false;

  constructor(annotationRawData, viewport, foliaLayer) {
    this.foliaLayer = foliaLayer
    this.annotationRawData = cloneDeep(annotationRawData)
    this.viewport = viewport
    const annotationDIV = document.createElement('div')
    annotationDIV.setAttribute('data-local-id', `${this.annotationRawData.localId}`)
    annotationDIV.setAttribute('data-role', FOLIA_LAYER_ROLES.ANNOTATION_OBJECT)
    annotationDIV.className = 'folia-annotation'
    this.annotationDIV = annotationDIV
    this.foliaLayer.appendChild(annotationDIV)
    this.buildCorners()
  }

  updateAnnotationRawData(annotationRawData) {
    if (!this.isDirty) this.annotationRawData = cloneDeep(annotationRawData)
  }

  updateDimensions(viewport) {
    this.viewport = viewport
    const  [left, top, width, height] = pdfRect2viewRect(this.annotationRawData.rect, this.viewport)
    this.annotationDIV.style.left = `${left}px`
    this.annotationDIV.style.top = `${top}px`
    this.annotationDIV.style.width = `${width}px`
    this.annotationDIV.style.height = `${height}px`
  }
  drawAnnotation() {
    if (typeof this.drawAnnotationData === "function") this.drawAnnotationData()
  }

  remove() {
    console.log('FoliaBaseAnnotation:remove', this.annotationRawData.localId)
  }

  buildCorners() {
    if (this.annotationRawData.annoType === 'shape' && this.annotationRawData.annoSubType === 'arrow') {
      Object.keys(FOLIA_LAYER_ROLES.ARROW_CORNERS).forEach(corner => {
        const cornerDiv = document.createElement('div')
        cornerDiv.className = `corner-div ${FOLIA_LAYER_ROLES.ARROW_CORNERS[corner]}`
        cornerDiv.setAttribute('data-local-id', `${this.annotationRawData.localId}`)
        cornerDiv.setAttribute('data-role', FOLIA_LAYER_ROLES.ARROW_CORNERS[corner])
        this.annotationDIV.appendChild(cornerDiv)
      })
    } else {
      Object.keys(FOLIA_LAYER_ROLES.RECT_CORNERS).forEach(corner => {
        const cornerDiv = document.createElement('div')
        cornerDiv.className = `corner-div ${FOLIA_LAYER_ROLES.RECT_CORNERS[corner]}`
        cornerDiv.setAttribute('data-local-id', `${this.annotationRawData.localId}`)
        cornerDiv.setAttribute('data-role', FOLIA_LAYER_ROLES.RECT_CORNERS[corner])
        this.annotationDIV.appendChild(cornerDiv)
      })
    }
  }
  setCornersVisibility(visibility) {
    this.annotationDIV.querySelectorAll('.corner-div').forEach(cornerEl => {
      cornerEl.style.display = visibility ? 'block' : 'none'
    })
  }
  markAsSelected() {
    this.setCornersVisibility(true)
    this.annotationDIV.classList.add('selected')
    this.isSelected = true
    this.annotationDIV.style.zIndex = 999
  }
  markAsUnselected() {
    this.setCornersVisibility(false)
    this.annotationDIV.classList.remove('selected')
    this.isSelected = false
    this.annotationDIV.style.zIndex = 1
  }
  memorizeMovingOffset(startPoint) {
    if (!startPoint) return
    this._startMoving = {
      offset: {
        x: this.annotationDIV.offsetLeft - startPoint.x,
        y: this.annotationDIV.offsetTop - startPoint.y,
      },
      position: {
        x: startPoint.x,
        y: startPoint.y,
      },
      dimensions: {
        width: this.annotationDIV.clientWidth,
        height: this.annotationDIV.clientHeight,
      }
    }
  }
  moveTo(point) {
    if (!point) return
    this.annotationDIV.style.left = this._startMoving.offset.x + point.x + 'px'
    this.annotationDIV.style.top = this._startMoving.offset.y + point.y + 'px'
    this.isDirty = true
    requestAnimationFrame(() => this.drawAnnotation())
  }
  resizeTo(point, corner, withShift) {
    // console.log('resizeTo', point, corner)
    if (!point || !corner) return
    if (withShift) {
      console.warn('moving with the "Shift" key in progress')
    }
    else {
      const deltaX = this._startMoving.position.x - point.x
      const deltaY = this._startMoving.position.y - point.y
      switch (corner) {
        case FOLIA_LAYER_ROLES.RECT_CORNERS.LT: {
          if (this._startMoving.dimensions.width + deltaX >= ANNOTATION_RECT_MIN_SIZE) {
            this.annotationDIV.style.left = this._startMoving.offset.x + point.x + 'px'
            this.annotationDIV.style.width = this._startMoving.dimensions.width + deltaX + 'px'
          }
          if (this._startMoving.dimensions.height + deltaY >= ANNOTATION_RECT_MIN_SIZE) {
            this.annotationDIV.style.top = this._startMoving.offset.y + point.y + 'px'
            this.annotationDIV.style.height = this._startMoving.dimensions.height + deltaY + 'px'

          }
          break
        }
        case FOLIA_LAYER_ROLES.RECT_CORNERS.RT: {
          if (this._startMoving.dimensions.width - deltaX >= ANNOTATION_RECT_MIN_SIZE) {
            this.annotationDIV.style.width = this._startMoving.dimensions.width - deltaX + 'px'
          }
          if (this._startMoving.dimensions.height + deltaY >= ANNOTATION_RECT_MIN_SIZE) {
            this.annotationDIV.style.top = this._startMoving.offset.y + point.y + 'px'
            this.annotationDIV.style.height = this._startMoving.dimensions.height + deltaY + 'px'
          }
          break
        }
        case FOLIA_LAYER_ROLES.RECT_CORNERS.RB: {
          if (this._startMoving.dimensions.width - deltaX >= ANNOTATION_RECT_MIN_SIZE) {
            this.annotationDIV.style.width = this._startMoving.dimensions.width - deltaX + 'px'
          }
          if (this._startMoving.dimensions.height - deltaY >= ANNOTATION_RECT_MIN_SIZE) {
            this.annotationDIV.style.height = this._startMoving.dimensions.height - deltaY + 'px'
          }
          break
        }
        case FOLIA_LAYER_ROLES.RECT_CORNERS.LB: {
          if (this._startMoving.dimensions.width + deltaX >= ANNOTATION_RECT_MIN_SIZE) {
            this.annotationDIV.style.left = this._startMoving.offset.x + point.x + 'px'
            this.annotationDIV.style.width = this._startMoving.dimensions.width + deltaX + 'px'
          }
          if (this._startMoving.dimensions.height - deltaY >= ANNOTATION_RECT_MIN_SIZE) {
            this.annotationDIV.style.height = this._startMoving.dimensions.height - deltaY + 'px'
          }
          break
        }
        default: break;
      }
    }
    this.isDirty = true
    requestAnimationFrame(() => this.drawAnnotation())
  }
  pointTo(point, corner, withShift)  {
    console.log(point, corner, withShift)
    if (withShift) {
      console.warn('pointing with the "Shift" key in progress')
    }
    else {
      const deltaX = this._startMoving.position.x - point.x
      const deltaY = this._startMoving.position.y - point.y
      if (corner === FOLIA_LAYER_ROLES.ARROW_CORNERS.BEGIN) {
      }
      else if (corner === FOLIA_LAYER_ROLES.ARROW_CORNERS.END) {
      }
    }
    requestAnimationFrame(() => this.drawAnnotation())
    this.isDirty = true
  }
  snapToBounds(margin, role) {
    const leftIsOut = this.rect.left < margin
    const topIsOut = this.rect.top < margin
    const rightIsOut = this.rect.left + this.rect.width > this.viewport.width - margin
    const bottomIsOut = this.rect.top + this.rect.height > this.viewport.height - margin

    switch (role) {
      case FOLIA_LAYER_ROLES.ANNOTATION_OBJECT: {
        if (leftIsOut) this.annotationDIV.style.left = margin + 'px'
        if (topIsOut) this.annotationDIV.style.top = margin + 'px'
        if (rightIsOut) this.annotationDIV.style.left = this.viewport.width - this.rect.width - margin + 'px'
        if (bottomIsOut) this.annotationDIV.style.top = this.viewport.height - this.rect.height - margin + 'px'
        break
      }
      case FOLIA_LAYER_ROLES.RECT_CORNERS.LT: {
        if (leftIsOut) {
          this.annotationDIV.style.width = this.rect.width - Math.abs(this.rect.left) - margin + 'px'
          this.annotationDIV.style.left = margin + 'px'
        }
        if (topIsOut) {
          this.annotationDIV.style.height = this.rect.height - Math.abs(this.rect.top) - margin + 'px'
          this.annotationDIV.style.top = margin + 'px'
        }
        break
      }
      case FOLIA_LAYER_ROLES.RECT_CORNERS.RT: {
        if (topIsOut) {
          this.annotationDIV.style.height = this.rect.height - Math.abs(this.rect.top) - margin + 'px'
          this.annotationDIV.style.top = margin + 'px'
        }
        if (rightIsOut) {
          this.annotationDIV.style.width = this.viewport.width - this.rect.left - margin + 'px'
        }
        break
      }
      case FOLIA_LAYER_ROLES.RECT_CORNERS.RB: {
        if (rightIsOut) {
          this.annotationDIV.style.width = this.viewport.width - this.rect.left - margin + 'px'
        }
        if (bottomIsOut) {
          this.annotationDIV.style.height = this.viewport.height - this.rect.top - margin + 'px'
        }
        break
      }
      case FOLIA_LAYER_ROLES.RECT_CORNERS.LB: {
        if (leftIsOut) {
          this.annotationDIV.style.width = this.rect.width - Math.abs(this.rect.left) - margin + 'px'
          this.annotationDIV.style.left = margin + 'px'
        }
        if (bottomIsOut) {
          this.annotationDIV.style.height = this.viewport.height - this.rect.top - margin + 'px'
        }
        break
      }
      default: break
    }
  }

  get rect() {
    return {
      left: this.annotationDIV.offsetLeft,
      top: this.annotationDIV.offsetTop,
      width: this.annotationDIV.clientWidth,
      height: this.annotationDIV.clientHeight,
    }
  }
  get localId() {
    return this.annotationRawData.localId
  }
  get remoteId() {
    return this.annotationRawData.object_id
  }
  get isSelected() {
    return this.isSelected
  }
  get containerElement() {
    return this.annotationDIV
  }
}

export default FoliaBaseAnnotation
