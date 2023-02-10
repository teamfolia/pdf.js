import FoliaConversationAnnotation from "./annotations/conversation-annotation";
import FoliaImageAnnotation from "./annotations/image-annotation";
import FoliaTypewriterAnnotation from "./annotations/text-box-annotation";
import MultipleSelect from "./MultiSelectObjects";
import FoliaInkAnnotation from "./annotations/ink-annotation";
import FoliaSquareAnnotation from "./annotations/square-annotation";
import FoliaCircleAnnotation from "./annotations/circle-annotation";
import FoliaArrowAnnotation from "./annotations/arrow-annotation";
import FoliaHighlightAnnotation from "./annotations/highlight-annotation";
import { ANNOTATION_TYPES } from "./constants";
import FoliaTextBoxAnnotation from "./annotations/text-box-annotation";
import { times } from "lodash";

const ANNOTATIONS_CLASSES = {
  [ANNOTATION_TYPES.INK]: FoliaInkAnnotation,
  [ANNOTATION_TYPES.HIGHLIGHT]: FoliaHighlightAnnotation,
  [ANNOTATION_TYPES.ARROW]: FoliaArrowAnnotation,
  [ANNOTATION_TYPES.CIRCLE]: FoliaCircleAnnotation,
  [ANNOTATION_TYPES.SQUARE]: FoliaSquareAnnotation,
  [ANNOTATION_TYPES.TEXT_BOX]: FoliaTextBoxAnnotation,
  [ANNOTATION_TYPES.IMAGE]: FoliaImageAnnotation,
  [ANNOTATION_TYPES.COMMENT]: FoliaConversationAnnotation,
};

export const FOLIA_LAYER_ROLES = {
  FOLIA_LAYER: "folia-layer",
  ANNOTATION_OBJECT: "annotation-object",
  RECT_CORNERS: {
    LT: "corner-lt",
    RT: "corner-rt",
    RB: "corner-rb",
    LB: "corner-lb",
  },
  ARROW_CORNERS: {
    BEGIN: "corner-begin",
    END: "corner-end",
  },
};
export const SAFE_MARGIN = 10;
export const RECT_MIN_SIZE = 30;

class MyMap extends Map {
  constructor() {
    super();
  }

  set(id, object) {
    super.set(id, object);
    return object.render();
  }

  delete(id) {
    const object = this.get(id);
    if (object) object.deleteFromCanvas();
    if (object) object.markAsDeleted();
    super.delete(id);
  }
}

class FoliaPageLayer {
  _cancelled = false;
  foliaLayer;
  pageNumber = 0;
  annotations = [];
  annotationObjects = new MyMap();
  permissions = {};

  multipleSelect;
  actionTarget = { role: "", id: "" };
  isMouseDown = false;
  isMouseMoved = false;
  startPoint;
  annotationBuilder;

  constructor(props) {
    // console.log("FoliaPageLayer.constructor", props);
    this.pageDiv = props.pageDiv;
    this.pdfPage = props.pdfPage;
    this.viewport = props.viewport;
    this.annotationStorage = props.annotationStorage;
    this.dataProxy = props.dataProxy;
    this.eventBus = props.eventBus;
    this.annotationBuilderClass = props.annotationBuilderClass;
    this.pdfViewerScale = props.pdfViewerScale;

    this.pageNumber = props.pdfPage.pageNumber - 1;
    this.multipleSelect = new MultipleSelect(this.viewport, props.eventBus);
  }

  startDrawing = (BuilderClass) => {
    this.stopDrawing();
    this.annotationBuilderClass = BuilderClass;
    this.annotationBuilder = new BuilderClass(this, BuilderClass);
  };
  updateToolDrawingProperties(preset) {
    this.annotationBuilder.applyPreset(preset);
  }
  stopDrawing() {
    if (!this.annotationBuilder) return;
    this.annotationBuilder.stop();
    this.annotationBuilder = null;
    this.annotationBuilderClass = null;
  }

  updateObjectsDrawingProperties(preset) {
    return this.multipleSelect.updateObjectsDrawingProperties(preset);
  }
  makeSelectedAnnotation(id) {
    const obj = this.annotationObjects.get(id);
    if (!obj) return console.warn(`annotation ${id} not found`, this.annotationObjects);
    this.multipleSelect.clear();
    this.multipleSelect.addObject(obj);
  }
  resetObjectsSeletion() {
    this.multipleSelect.clear();
  }

  deleteSelectedAnnotations(obj) {
    const deletedObjects = obj ? [obj] : this.multipleSelect.getObjects();
    deletedObjects.map((obj) => {
      if (!obj.canDelete) return;
      // console.log("DELETE", { canDelete: obj.canDelete, canManage: obj.canManage });
      this.annotationObjects.delete(obj.id);
      this.multipleSelect.deleteObject(obj);
    });
  }
  refresh() {
    this.render(this.viewport).catch(console.error);
  }
  async render(viewport) {
    // console.log(">>", this.pageNumber, viewport, this.foliaLayer);
    this.viewport = viewport;
    if (!this.foliaLayer) {
      this.foliaLayer = document.createElement("div");
      this.foliaLayer.setAttribute("data-role", FOLIA_LAYER_ROLES.FOLIA_LAYER);
      this.foliaLayer.setAttribute("data-page-number", `${this.pageNumber}`);
      this.foliaLayer.className = "folia-layer";
      this.foliaLayer.onmousedown = this.onFoliaLayerMouseDown.bind(this);
      this.foliaLayer.onclick = this.onFoliaLayerClick.bind(this);
    }
    this.foliaLayer.style.width = Math.floor(this.pageDiv.clientWidth) + "px";
    this.foliaLayer.style.height = Math.floor(this.pageDiv.clientHeight) + "px";
    if (!this.pageDiv.querySelector(`[data-page-number="${this.pageNumber}"]`)) {
      this.pageDiv.appendChild(this.foliaLayer);
    }

    // TODO: make annotation.render method as syncronous
    const annotations = await this.dataProxy.getObjects(this.pageNumber);
    // console.log(`ANNOTATIONS LIST LENGTH FOR ${this.pageNumber} PAGE IS`, annotations);

    const promises = [];
    for (const annoData of annotations) {
      let annoObject = this.annotationObjects.get(annoData.id);
      if (!annoObject && !annoData.deleted) {
        // console.log(`RENDER ADD ON PAGE ${this.pageNumber}`, annoData.__typename);
        const AnnoClass = ANNOTATIONS_CLASSES[annoData.__typename];
        if (AnnoClass) {
          annoObject = new AnnoClass(this, annoData);
          const promise = this.annotationObjects.set(annoData.id, annoObject);
          promises.push(promise);
        }
      } else if (annoObject && !annoData.deleted) {
        // console.log(`RENDER UPDATE ON PAGE ${this.pageNumber}`, annoData.id);
        const promise = annoObject.update(this.viewport, annoData);
        promises.push(promise);
      } else if (annoObject && annoData.deleted) {
        // console.log(`RENDER DELETE ON PAGE ${this.pageNumber}`, annoData.id);
        this.annotationObjects.delete(annoData.id);
      }
    }

    Promise.allSettled(promises)
      .then((resolves) => {
        if (this.annotationBuilderClass && !this.annotationBuilder) {
          this.startDrawing(this.annotationBuilderClass);
        }
      })
      .catch(console.error);

    return;
  }
  renderSingle(annotationRawData, permissions) {
    let annoObject = this.annotationObjects.get(annotationRawData.id);
    if (!annoObject && !annotationRawData.deleted) {
      const AnnoClass = ANNOTATIONS_CLASSES[annotationRawData.__typename];
      if (AnnoClass) {
        annoObject = new AnnoClass(this, { ...annotationRawData, permissions });
        this.annotationObjects.set(annotationRawData.id, annoObject);
      }
    } else if (annoObject && !annotationRawData.deleted) {
      annoObject.update(this.viewport, annotationRawData);
    } else if (annoObject && annotationRawData.deleted) {
      this.annotationObjects.delete(annotationRawData.id);
    }
  }
  clickByViewerContainer() {
    // this.commit Changes()
    this.multipleSelect.clear();
  }
  onFoliaLayerClick(e) {
    // console.log("onFoliaLayerClick");
    const { role, id } = e.target.dataset;
    if (role === FOLIA_LAYER_ROLES.FOLIA_LAYER) {
      return this.multipleSelect.clear();
    }
    e.stopPropagation();
    e.preventDefault();
  }
  onFoliaLayerMouseDown(e) {
    const { role, id } = e.target.dataset;
    // console.log('onFoliaLayerMouseDown', e.target, {role, id})
    if (!role) return;
    e.stopPropagation();
    this.actionTarget = { role, id };
    if (role === FOLIA_LAYER_ROLES.FOLIA_LAYER) {
      return this.multipleSelect.clear();
    }

    this.foliaLayer.parentNode.parentNode.onmouseup = this.onFoliaLayerMouseUp.bind(this);
    this.foliaLayer.onmouseup = this.onFoliaLayerMouseUp.bind(this);
    this.foliaLayer.onmousemove = this.onFoliaLayerMouseMove.bind(this);
    this.isMouseDown = true;
    this.startPoint = { x: e.clientX, y: e.clientY };
    this.multipleSelect.prepare2moving(this.startPoint);

    if (!this.multipleSelect.isEmpty()) this.multipleSelect.hideFloatingBar();
    // if (!this.multipleSelect.isEmpty()) {
    //   // this.dataProxy.floatingBar.hide();
    //   this.eventBus.dispatch("floating_bar_hide");
    // }
    // const annoObject = this.annotationObjects.get(this.actionTarget.id);
    // console.log('onFoliaLayerMouseDown', annoObject && annoObject.editable)
    e.preventDefault();
  }
  onFoliaLayerMouseMove(e) {
    e.stopPropagation();
    if (!this.isMouseDown) return;
    // this.foliaDataStorage.floatingBar.hide()
    const annoObject = this.annotationObjects.get(this.actionTarget.id);
    if (annoObject) {
      if (annoObject.editable && annoObject.isFocused) return;
      if (annoObject.permanentPosition) return;
    }
    e.preventDefault();

    if (annoObject && this.actionTarget.role === FOLIA_LAYER_ROLES.ANNOTATION_OBJECT) {
      if (this.multipleSelect.isEmpty() && !this.multipleSelect.includes(annoObject)) {
        this.multipleSelect.toggleObject(annoObject, e.shiftKey);
        this.multipleSelect.prepare2moving(this.startPoint);
      } else if (!this.multipleSelect.isEmpty() && !this.multipleSelect.includes(annoObject)) {
        if (!e.shiftKey) this.multipleSelect.clear();
        this.multipleSelect.toggleObject(annoObject, e.shiftKey);
        this.multipleSelect.prepare2moving(this.startPoint);
      }

      if (this.multipleSelect.includes(annoObject)) {
        this.multipleSelect.moveTo({ x: e.clientX, y: e.clientY });
      }
    } else if (annoObject && Object.values(FOLIA_LAYER_ROLES.RECT_CORNERS).includes(this.actionTarget.role)) {
      if (this.multipleSelect.includes(annoObject)) {
        this.multipleSelect.resizeTo({ x: e.clientX, y: e.clientY }, this.actionTarget.role, e.altKey);
      }
    } else if (
      annoObject &&
      Object.values(FOLIA_LAYER_ROLES.ARROW_CORNERS).includes(this.actionTarget.role)
    ) {
      if (this.multipleSelect.includes(annoObject)) {
        this.multipleSelect.pointTo({ x: e.clientX, y: e.clientY }, this.actionTarget.role, e.altKey);
      }
    }

    this.isMouseMoved = true;
  }
  onFoliaLayerMouseUp(e) {
    e.stopPropagation();
    e.preventDefault();
    this.foliaLayer.onmouseup = null;
    this.foliaLayer.onmousemove = null;

    if (this.actionTarget.role === FOLIA_LAYER_ROLES.FOLIA_LAYER) {
      this.multipleSelect.clear();
      // this.dataProxy.floatingBar.hide();
    } else if (!this.isMouseMoved && this.actionTarget.role === FOLIA_LAYER_ROLES.ANNOTATION_OBJECT) {
      const annoObject = this.annotationObjects.get(this.actionTarget.id);
      if (annoObject && !annoObject.editable) {
        this.multipleSelect.toggleObject(annoObject, e.shiftKey);
      } else if (annoObject && annoObject.editable) {
        this.multipleSelect.includes(annoObject)
          ? this.multipleSelect.startEditMode(annoObject, e.shiftKey)
          : this.multipleSelect.toggleObject(annoObject, e.shiftKey);
      }
      this.multipleSelect.showFloatingBar();
      // dataProxy.floatingBar.show(this.multipleSelect.getObjects());
    } else if (this.isMouseMoved) {
      this.multipleSelect.showFloatingBar();
      // dataProxy.floatingBar.show(this.multipleSelect.getObjects());
      // const annoObject = this.annotationObjects.get(this.actionTarget.id);
      // this.multipleSelect.showToolbar(annoObject);
    }

    this.multipleSelect.checkForOutOfBounds(SAFE_MARGIN, this.actionTarget.role);
    this.isMouseMoved = false;
    this.isMouseDown = false;
    this.actionTarget = {};
  }
  async cancel() {
    console.log("FoliaPageLayer cancel");
    this._cancelled = true;
  }
  hide() {
    console.log("FoliaPageLayer hide");
    this.foliaLayer.hidden = true;
  }
  show() {
    console.log("FoliaPageLayer show");
    this.foliaLayer.hidden = false;
  }
}

export default FoliaPageLayer;
