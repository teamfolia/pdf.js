import { v4 as uuid } from "uuid";
import FoliaConversationAnnotation from "./annotations/_conversation-annotation";
import FoliaImageAnnotation from "./annotations/image-annotation";
import FoliaTextBoxAnnotation from "./annotations/text-box-annotation";
import MultipleSelect from "./MultiSelectObjects";
import FoliaInkAnnotation from "./annotations/ink-annotation";
import FoliaSquareAnnotation from "./annotations/square-annotation";
import FoliaCircleAnnotation from "./annotations/circle-annotation";
import FoliaArrowAnnotation from "./annotations/arrow-annotation";
import FoliaHighlightAnnotation from "./annotations/highlight-annotation";
import { ANNOTATION_TYPES, ANNOTATION_WEIGHT } from "./constants";

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
    this.undoRedoManager = props.undoRedoManager;
    this.eventBus = props.eventBus;
    this.annotationBuilderClass = props.annotationBuilderClass;
    this.pdfViewerScale = props.pdfViewerScale;

    this.pageNumber = props.pdfPage.pageNumber - 1;
    this.multipleSelect = new MultipleSelect(this.viewport, props.eventBus);
  }

  startDrawing = (BuilderClass) => {
    this.stopDrawing();
    this.annotationBuilderClass = BuilderClass;
    this.annotationBuilder = new BuilderClass(this, BuilderClass, this.undoRedoManager);
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
    for (const obj of this.multipleSelect.getObjects()) {
      obj.editableProperties.set(preset);
    }
    // return this.multipleSelect.updateObjectsDrawingProperties(preset);
  }
  makeSelectedAnnotation(id, scrollIntoView = false) {
    const obj = this.annotationObjects.get(id);
    if (!obj) return console.warn(`annotation ${id} not found`, this.annotationObjects);
    this.multipleSelect.clear();
    this.multipleSelect.addObject(obj);
    if (scrollIntoView) {
      obj.annotationDIV.scrollIntoView({ block: "center", inline: "nearest" });
    }
  }
  resetObjectsSeletion() {
    this.multipleSelect.clear();
  }
  duplicateSelectedAnnotations() {
    const selectedObjects = this.multipleSelect.getObjects();
    for (const object of selectedObjects) {
      if (!object.canManage || object.permanentPosition) return;
      const duplicatedAnnot = object.getDuplicate();

      this.addAnnotationObject(duplicatedAnnot);
      this.commitObjectChanges(duplicatedAnnot);
      this.undoRedoManager.creatingObject(duplicatedAnnot);
    }
  }

  commitObjectChanges(objectData) {
    if (!objectData) return;
    if (objectData.deletedAt) {
      this.eventBus.dispatch("delete-object", objectData.id);
    } else {
      this.eventBus.dispatch("commit-object", objectData);
    }
    // this.eventBus.dispatch("findneedrefresh", {});
  }

  deleteSelectedAnnotations(object) {
    const deletedObjects = object ? [object] : this.multipleSelect.getObjects();
    deletedObjects.map((obj) => {
      if (!obj.canDelete) return;
      this.undoRedoManager.deletingObject(obj.getRawData());
      this.deleteAnnotationObject(obj);
    });
  }
  deleteAnnotationObject(object) {
    this.annotationObjects.delete(object.id);
    this.multipleSelect.deleteObject(object);
  }
  addAnnotationObject(annotation) {
    if (this._cancelled) return;
    let annotationObject = this.annotationObjects.get(annotation.id);
    if (!annotationObject) {
      const AnnoClass = ANNOTATIONS_CLASSES[annotation.__typename];
      annotationObject = new AnnoClass(this, annotation);
      this.annotationObjects.set(annotation.id, annotationObject);
    } else {
      annotationObject.update(annotation, this.viewport);
    }
  }
  render(viewport) {
    // console.time("render");
    // console.log("render", this.pageNumber);
    if (this._cancelled) return;
    this.viewport = viewport;
    if (!this.foliaLayer) {
      this.foliaLayer = document.createElement("div");
      this.foliaLayer.setAttribute("data-role", FOLIA_LAYER_ROLES.FOLIA_LAYER);
      this.foliaLayer.setAttribute("data-page-number", `${this.pageNumber}`);
      this.foliaLayer.className = "folia-layer";
      this.foliaLayer.onmousedown = this.onFoliaLayerMouseDown.bind(this);
      // this.foliaLayer.onclick = this.onFoliaLayerClick.bind(this);
    }
    this.foliaLayer.style.width = Math.floor(this.pageDiv.clientWidth) + "px";
    this.foliaLayer.style.height = Math.floor(this.pageDiv.clientHeight) + "px";
    if (!this.pageDiv.querySelector(`[data-page-number="${this.pageNumber}"]`)) {
      this.pageDiv.appendChild(this.foliaLayer);
    }

    try {
      // const annotations = this.dataProxy.getObjects(this.pageNumber).sort((a, b) => {
      //   const weightA = ANNOTATION_WEIGHT[a.__typename];
      //   const weightB = ANNOTATION_WEIGHT[b.__typename];
      //   const createdA = new Date(a.createdAt);
      //   const createdB = new Date(b.createdAt);
      //   return weightA === weightB ? createdA - createdB : weightA - weightB;
      // });
      const annotations = this.dataProxy.getObjects(this.pageNumber).sort((a, b) => {
        const addedAtA = new Date(a.addedAt);
        const addedAtB = new Date(b.addedAt);
        return addedAtA - addedAtB;
      });
      // delete
      for (const [id, annotationObject] of this.annotationObjects) {
        if (this._cancelled) return;
        if (annotations.findIndex((a) => a.id === id) === -1 && !annotationObject.isDirty) {
          this.multipleSelect.deleteObject(annotationObject);
          this.annotationObjects.delete(annotationObject.id);
        }
      }

      // create or update
      for (const annotation of annotations) {
        // console.log("annotation", annotation);
        try {
          if (this._cancelled) return;
          let annotationObject = this.annotationObjects.get(annotation.id);
          if (!annotationObject) {
            const AnnoClass = ANNOTATIONS_CLASSES[annotation.__typename];
            annotationObject = new AnnoClass(this, annotation);
            this.annotationObjects.set(annotation.id, annotationObject);
          } else {
            annotationObject.update(annotation, this.viewport);
          }
        } catch (e) {
          console.error("error rendering anno 123", e, annotation);
        }
      }

      if (this.annotationBuilderClass && !this.annotationBuilder) {
        if (this._cancelled) return;
        this.startDrawing(this.annotationBuilderClass);
      }
    } catch (err) {
      console.error(`error in render on page ${this.pageNumber}`, err.message);
    }
    // console.timeEnd("render");
  }
  refresh() {
    this.render(this.viewport);
  }
  cancel() {
    // console.log("FoliaPageLayer cancel ==>", this.pageNumber);
    this._cancelled = true;
    if (this.annotationBuilder) this.annotationBuilder.stop();
  }
  hide() {
    console.log("FoliaPageLayer hide ==>", this.pageNumber);
    this.foliaLayer.hidden = true;
  }
  show() {
    console.log("FoliaPageLayer show ==>", this.pageNumber);
    this.foliaLayer.hidden = false;
  }

  clickByViewerContainer() {
    // this.commit Changes()
    this.multipleSelect.clear();
  }
  onFoliaLayerMouseDown(e) {
    // console.log("onFoliaLayerMouseDown", e.target, e.currentTarget);
    if (e.target.tagName === "TEXTAREA") return;

    const { role, id } = e.target.dataset;
    if (!role) return;
    // e.stopPropagation();
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
    // e.preventDefault();
  }
  onFoliaLayerMouseMove(e) {
    // e.stopPropagation();
    if (!this.isMouseDown) return;
    // console.log("onFoliaLayerMouseMove", e.target.tagName, e.currentTarget.tagName);
    if (e.target.tagName === "TEXTAREA") return;

    const annoObject = this.annotationObjects.get(this.actionTarget.id);
    if (annoObject) {
      // if (annoObject.editable && annoObject.isFocused) return;
      if (annoObject.permanentPosition) return;
    }
    // e.preventDefault();

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
    // e.stopPropagation();
    // e.preventDefault();
    this.foliaLayer.onmouseup = null;
    this.foliaLayer.onmousemove = null;
    // console.log("onFoliaLayerMouseUp", e.target.tagName, e.currentTarget.tagName);
    if (e.target.tagName === "TEXTAREA") return;

    if (e.target.dataset.role === FOLIA_LAYER_ROLES.FOLIA_LAYER) {
      return this.multipleSelect.clear();
    }

    if (this.actionTarget.role === FOLIA_LAYER_ROLES.FOLIA_LAYER) {
      this.multipleSelect.clear();
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
    } else if (this.isMouseMoved) {
      this.multipleSelect.showFloatingBar();

      const annoObject = this.annotationObjects.get(this.actionTarget.id);
      if (annoObject) {
        this.undoRedoManager.updatingObject(annoObject._startMoving.prevState, annoObject.getRawData());
      }
    }

    this.multipleSelect.checkForOutOfBounds(SAFE_MARGIN, this.actionTarget.role);
    this.isMouseMoved = false;
    this.isMouseDown = false;
    this.actionTarget = {};
  }
}

export default FoliaPageLayer;
