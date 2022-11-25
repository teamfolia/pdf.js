import MultipleSelect from "./MultiSelectObjects";
import FoliaInkAnnotation from "./annotations/folia-ink-annotation";
import FoliaShapeAnnotation from "./annotations/folia-shape-annotation";
import FoliaEmptyAnnotation from "./annotations/folia-empty-annotation";

export const FOLIA_LAYER_ROLES = {
  FOLIA_LAYER: 'folia-layer',
  ANNOTATION_OBJECT: 'annotation-object',
  RECT_CORNERS: {
    LT: 'corner-lt',
    RT: 'corner-rt',
    RB: 'corner-rb',
    LB: 'corner-lb',
  },
  ARROW_CORNERS: {
    BEGIN: 'corner-begin',
    END: 'corner-end',
  }
}
export const SAFE_MARGIN = 10
export const ANNOTATION_RECT_MIN_SIZE = 30

class FoliaPageLayer {
  _cancelled = false;
  foliaLayer;
  pageNumber = 0;
  annotations = [];
  annotationObjects = [];

  multipleSelect;
  actionTarget = {role: '', localId: ''};
  isMouseDown = false;
  isMouseMoved = false;
  startPoint;

  constructor(props) {
    this.viewport = props.viewport
    this.pageDiv = props.pageDiv
    this.pdfPage = props.pdfPage
    this.pageNumber = props.pdfPage.pageNumber - 1
    this.annotationStorage = props.annotationStorage
    this.linkService = props.linkService
    this.multipleSelect = new MultipleSelect(this.viewport)
  }

  prepare() {
    if (!this.pageDiv) return
    if (!this.foliaLayer) {
      this.foliaLayer = document.createElement('div')
      this.foliaLayer.setAttribute('data-role', FOLIA_LAYER_ROLES.FOLIA_LAYER)
      this.foliaLayer.setAttribute('data-page-number', `${this.pageNumber}`)
      this.foliaLayer.className = 'folia-layer'
      this.foliaLayer.onmousedown = this.#onFoliaLayerMouseDown.bind(this)
    }
    this.foliaLayer.style.width = Math.floor(this.viewport.width) + 'px'
    this.foliaLayer.style.height = Math.floor(this.viewport.height) + 'px'
    if (!this.pageDiv.querySelector(`[data-page-number="${this.pageNumber}"]`)) {
      this.pageDiv.appendChild(this.foliaLayer)
    }
  }

  async render(viewport) {
    this.viewport = viewport
    this.prepare()
    const annotations = await this.linkService.foliaAPI.filterAnnotations({
      ...this.linkService.pdfDocument.foliaDocumentIds,
      pageNumber: this.pageNumber
    })
    // console.log(`ANNOTATIONS LIST LENGTH FOR ${this.pageNumber} PAGE IS`, annotations)
    for (const annotationRawData of annotations) {
      try {
        let annotationObject = this.annotationObjects.find(obj => obj.localId === annotationRawData.localId)
        if (annotationObject && !annotationRawData.deleted) {
          // console.log('FoliaPageLayer update', 'localId:' + annotationObject.localId)
          annotationObject.render(this.viewport, annotationRawData)
        } else if (annotationObject && annotationRawData.deleted) {
          // console.log('FoliaPageLayer delete', 'localId:' + annotationObject.localId)
          annotationObject.remove()
        } else if (!annotationObject && !annotationRawData.deleted) {
          let ItemAnnotationClass = FoliaEmptyAnnotation
          if (annotationRawData.annoType === 'ink') ItemAnnotationClass = FoliaInkAnnotation
          else if (annotationRawData.annoType === 'shape') ItemAnnotationClass = FoliaShapeAnnotation
          const item = new ItemAnnotationClass(annotationRawData, this.viewport, this.foliaLayer)
          item.render(this.viewport, annotationRawData)
          if (item) this.annotationObjects.push(item)
          // console.log('FoliaPageLayer create', annotationRawData.annoType, 'ID:' + item.remoteId)
        }
      } catch (e) {
        console.error('PageFoliaRender says:', e.message)
      }
    }
  }

  async cancel() {
    console.log('FoliaPageLayer cancel')
    this._cancelled = true;
  }
  async hide() {
    console.log('FoliaPageLayer hide')
    if (!this.foliaLayer) {
      return;
    }
    this.foliaLayer.hidden = true;
  }

  #onFoliaLayerMouseDown(e) {
    e.stopPropagation()
    e.preventDefault()
    const {role, localId} = e.target.dataset
    if (role === FOLIA_LAYER_ROLES.FOLIA_LAYER) {
      return this.multipleSelect.clear()
    }

    this.foliaLayer.parentNode.parentNode.onmouseup = this.#onFoliaLayerMouseUp.bind(this)
    this.foliaLayer.onmouseup = this.#onFoliaLayerMouseUp.bind(this)
    this.foliaLayer.onmousemove = this.#onFoliaLayerMouseMove.bind(this)
    this.isMouseDown = true
    this.actionTarget = {role, localId}
    this.startPoint = {x: e.clientX, y: e.clientY}
    this.multipleSelect.prepare2moving(this.startPoint)
  }

  #onFoliaLayerMouseMove(e) {
    e.stopPropagation()
    e.preventDefault()
    if (!this.isMouseDown) return

    const annoObject = this.annotationObjects.find(obj => obj.localId === this.actionTarget.localId)
    if (annoObject && this.actionTarget.role === FOLIA_LAYER_ROLES.ANNOTATION_OBJECT) {
      if (this.multipleSelect.isEmpty() && !this.multipleSelect.includes(annoObject)) {
        this.multipleSelect.toggleObject(annoObject, e.shiftKey)
        this.multipleSelect.prepare2moving(this.startPoint)
      } else if (!this.multipleSelect.isEmpty() && !this.multipleSelect.includes(annoObject)) {
        if (!e.shiftKey) this.multipleSelect.clear()
        this.multipleSelect.toggleObject(annoObject, e.shiftKey)
        this.multipleSelect.prepare2moving(this.startPoint)
      }

      if (this.multipleSelect.includes(annoObject)) {
        this.multipleSelect.moveTo({x: e.clientX, y: e.clientY})
      }
    }
    else if (annoObject && Object.values(FOLIA_LAYER_ROLES.RECT_CORNERS).includes(this.actionTarget.role)) {
      if (this.multipleSelect.includes(annoObject)) {
        this.multipleSelect.resizeTo({x: e.clientX, y: e.clientY}, this.actionTarget.role, e.shiftKey)
      }
    }
    else if (annoObject && Object.values(FOLIA_LAYER_ROLES.ARROW_CORNERS).includes(this.actionTarget.role)) {
      if (this.multipleSelect.includes(annoObject)) {
        this.multipleSelect.pointTo({x: e.clientX, y: e.clientY}, this.actionTarget.role, e.shiftKey)
      }
    }

    this.isMouseMoved = true
  }

  #onFoliaLayerMouseUp(e) {
    e.stopPropagation()
    e.preventDefault()
    this.foliaLayer.onmouseup = null
    this.foliaLayer.onmousemove = null

    if (this.actionTarget.role === FOLIA_LAYER_ROLES.FOLIA_LAYER) {
      this.multipleSelect.clear()
    } else if (!this.isMouseMoved && this.actionTarget.role === FOLIA_LAYER_ROLES.ANNOTATION_OBJECT) {
      const annoObject = this.annotationObjects.find(obj => obj.localId === this.actionTarget.localId)
      if (annoObject) this.multipleSelect.toggleObject(annoObject, e.shiftKey)
    }

    this.multipleSelect.checkForOutOfBounds(SAFE_MARGIN, this.actionTarget.role)
    this.isMouseMoved = false
    this.isMouseDown = false
    this.actionTarget = {}
  }
}

export default FoliaPageLayer
