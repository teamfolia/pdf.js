import { v4 as uuid } from "uuid";
import html from "./folia-page.html";
import FoliaFloatingBar from "./folia-floating-bar";
import { COLLABORATOR_PERMISSIONS } from "../../../../web-folia/src/core/constants";
import {
  ANNOTATION_TYPES,
  FONT_FAMILY,
  FONT_WEIGHT,
  ROLE_ARROW_SOURCE,
  ROLE_ARROW_TARGET,
  ROLE_CORNER_LB,
  ROLE_CORNER_LT,
  ROLE_CORNER_RB,
  ROLE_CORNER_RT,
  ROLE_OBJECT,
  ROLE_PAGE,
  ROLE_TEXTBOX_LEFT_TOP,
  ROLE_TEXTBOX_RIGHT_TOP,
  TEXT_ALIGNMENT,
} from "../constants";

import InkObject from "./render-objects/ink";
import SquareObject from "./render-objects/square";
import CircleObject from "./render-objects/circle";
import ArrowObject from "./render-objects/arrow";
import ImageObject from "./render-objects/image";
import TextBoxObject from "./render-objects/text-box";
import CommentObject from "./render-objects/comment";
import HighlightObject from "./render-objects/highlight";
import {
  areArraysSimilar,
  isPointInRect,
  arePolygonsIntersected,
  setArrowNewPosition,
  setPathsNewPosition,
  setRectNewPosition,
  setTextRectNewPosition,
  sortObjects,
  isRectInRect,
} from "../folia-util";
import PixelEraser from "../annotations-builders/pixel-eraser";
import CommentBuilder from "../annotations-builders/comment-builder";

class EventBusRequest {
  constructor(eventBus) {
    this.eventBus = eventBus;
  }

  async get(reqName, reqProps) {
    const responseName = uuid();
    const that = this;
    return new Promise((resolve, reject) => {
      try {
        const timeout = setTimeout(() => reject(new Error("event bus request timeout")), 30_000);
        this.eventBus.on(responseName, handleResponse);
        this.eventBus.dispatch(reqName, { responseName, reqProps });

        function handleResponse(responseData) {
          clearTimeout(timeout);
          that.eventBus.off(responseName, handleResponse);
          resolve(responseData);
        }
      } catch (e) {
        console.error(e);
        reject(e);
      }
    });
  }
}

class MultipleObjectsSelection extends Set {
  constructor() {
    super();
  }

  add(object) {
    super.add(object);
    object.makeSelected();
  }

  delete(object) {
    object.makeUnselected();
    super.delete(object);
  }

  clear() {
    this.forEach((object) => {
      object.makeUnselected();
    });
    super.clear();
  }

  has(object) {
    return super.has(object);
  }

  get size() {
    return super.size;
  }

  get first() {
    return Array.from(this).at(0);
  }

  get last() {
    return Array.from(this).at(-1);
  }

  toArray() {
    return Array.from(this);
  }

  remainOnly(object) {
    for (const obj of this) {
      if (obj === object) continue;
      this.delete(obj);
    }
  }
}

class FoliaPage extends HTMLElement {
  static AnnoClasses = {
    InkAnnotation: InkObject,
    SquareAnnotation: SquareObject,
    CircleAnnotation: CircleObject,
    ArrowAnnotation: ArrowObject,
    ImageAnnotation: ImageObject,
    TextBoxAnnotation: TextBoxObject,
    CommentAnnotation: CommentObject,
    HighlightAnnotation: HighlightObject,
  };

  #canvas;
  #ui;
  #pdfCanvas;
  #floatingBar;

  #objects = [];
  #multipleSelection = new MultipleObjectsSelection();
  #undoRedoManager;
  #permissions;
  #userEmail;
  #userName;
  #userRole;
  #viewport;
  #eventBus;
  #pageNumber;
  #annotationBuilderClass;

  #refreshFoliaPageBinded = this.refreshFoliaPage.bind(this);
  #onMouseDownBinded = this.onMouseDown.bind(this);
  #onMouseMoveBinded = this.onMouseMove.bind(this);
  #onMouseUpBinded = this.onMouseUp.bind(this);
  #onMouseOverBinded = this.onMouseOver.bind(this);
  #onMouseOutBinded = this.onMouseOut.bind(this);

  #projectHasBeenUpdatedBinded = this.projectHasBeenUpdated.bind(this);
  #deleteSelectedObjectsBinded = this.deleteSelectedObjects.bind(this);
  #duplicateSelectedObjectsBinded = this.duplicateSelectedObjects.bind(this);
  #unselectObjectBinded = this.unselectObject.bind(this);
  #selectAllObjectsBinded = this.selectAllObjects.bind(this);
  #resetObjectsSelectionBinded = this.resetObjectsSelection.bind(this);
  #pasteAnnotationFromClipboardBinded = this.pasteAnnotationFromClipboard.bind(this);
  #showFloatingBarBinded = this.showFloatingBar.bind(this);
  #attachCommentForAnnotation = this.attachCommentForAnnotation.bind(this);

  constructor() {
    super();
    const template = document.createElement("template");
    template.innerHTML = html;
    this.attachShadow({ mode: "open" });
    this.shadowRoot.appendChild(template.content.cloneNode(true));
    this.zoomScale = 1;
  }

  // ----------- system methods ------------
  static get observedAttributes() {
    return [];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    switch (name) {
      default:
        break;
    }
  }

  connectedCallback() {
    this.setAttribute("data-role", ROLE_PAGE);

    this.viewerContainer = document.getElementById("viewerContainer");
    this.viewerContainer.addEventListener("mousedown", this.#onMouseDownBinded, { passive: false });
    this.viewerContainer.addEventListener("mousemove", this.#onMouseMoveBinded, { passive: false });
    this.viewerContainer.addEventListener("mouseup", this.#onMouseUpBinded, { passive: false });

    this.addEventListener("mouseover", this.#onMouseOverBinded, { passive: false });
    this.addEventListener("mouseout", this.#onMouseOutBinded, { passive: false });

    this.#eventBus.on("project-updated", this.#projectHasBeenUpdatedBinded);
    this.#eventBus.on("refresh-folia-page", this.#refreshFoliaPageBinded);
    this.#eventBus.on("unselect-object", this.#unselectObjectBinded);
    this.#eventBus.on("delete-selected-objects", this.#deleteSelectedObjectsBinded);
    this.#eventBus.on("duplicate-selected-objects", this.#duplicateSelectedObjectsBinded);
    this.#eventBus.on("select-all-objects", this.#selectAllObjectsBinded);
    this.#eventBus.on("reset-objects-selection", this.#resetObjectsSelectionBinded);
    this.#eventBus.on("paste-from-clipboard", this.#pasteAnnotationFromClipboardBinded);
    this.#eventBus.on("show-floating-bar", this.#showFloatingBarBinded);
    this.#eventBus.on("attach-comment-for-annotation", this.#attachCommentForAnnotation);

    const floatingBar = document.createElement("folia-floating-bar");
    this.floatingBar = this.shadowRoot.appendChild(floatingBar);
    this.floatingBar.eventBus = this.#eventBus;
    this.floatingBar.permissions = this.#permissions;
    this.floatingBar.onChange = (propertyName, propertyValue) => {
      for (const object of this.#multipleSelection) {
        object.changeManually({
          addedAt: new Date().toISOString(),
          [propertyName]: propertyValue,
        });
      }
    };

    this.refreshFoliaPage();
  }

  disconnectedCallback() {
    cancelAnimationFrame(this.AnimationFrameTimer);
    this.floatingBar.remove();
    this.floatingBar = null;

    this.viewerContainer.removeEventListener("mousedown", this.#onMouseDownBinded, { passive: false });
    this.viewerContainer.removeEventListener("mousemove", this.#onMouseMoveBinded, { passive: false });
    this.viewerContainer.removeEventListener("mouseup", this.#onMouseUpBinded, { passive: false });
    this.removeEventListener("mouseover", this.#onMouseOverBinded, { passive: false });
    this.removeEventListener("mouseout", this.#onMouseOutBinded, { passive: false });
    if (this.#eventBus) {
      this.#eventBus.off("project-updated", this.#projectHasBeenUpdatedBinded);
      this.#eventBus.off("refresh-folia-page", this.#refreshFoliaPageBinded);
      this.#eventBus.on("unselect-object", this.#unselectObjectBinded);
      this.#eventBus.off("delete-selected-objects", this.#deleteSelectedObjectsBinded);
      this.#eventBus.off("duplicate-selected-objects", this.#duplicateSelectedObjectsBinded);
      this.#eventBus.off("select-all-objects", this.#selectAllObjectsBinded);
      this.#eventBus.off("reset-objects-selection", this.#resetObjectsSelectionBinded);
      this.#eventBus.off("paste-from-clipboard", this.#pasteAnnotationFromClipboardBinded);
      this.#eventBus.off("show-floating-bar", this.#showFloatingBarBinded);
    }
  }

  renderSelectionArea(ctx) {
    const { left, top, right, bottom } = this.selectionArea;
    ctx.fillStyle = "rgba(0, 0, 0, 0.15)";
    ctx.strokeStyle = "#2990ff";
    ctx.lineWidth = 2;
    ctx.fillRect(
      left * window.devicePixelRatio,
      top * window.devicePixelRatio,
      (right - left) * window.devicePixelRatio,
      (bottom - top) * window.devicePixelRatio
    );

    ctx.strokeRect(
      left * window.devicePixelRatio,
      top * window.devicePixelRatio,
      (right - left) * window.devicePixelRatio,
      (bottom - top) * window.devicePixelRatio
    );
  }

  startRender(viewport, zoomScale) {
    this.zoomScale = zoomScale;

    cancelAnimationFrame(this.AnimationFrameTimer);
    this.render(viewport);
  }

  render(viewport) {
    if (viewport) this.viewport = viewport.clone();
    if (!this.pageShouldRender) return;
    this.#canvas.width = this.#canvas.width;
    const ctx = this.#canvas.getContext("2d");
    const pdfCanvas = this.parentNode.querySelector('div.canvasWrapper>canvas[role="presentation"]');
    const pdfCtx = pdfCanvas.getContext("2d", { willReadFrequently: true });

    const lastSelectedObject = this.#multipleSelection.first;
    const annoObjects = this.#objects.filter((obj) => obj !== lastSelectedObject).sort(sortObjects);
    if (lastSelectedObject) annoObjects.push(lastSelectedObject);

    for (const annoObj of annoObjects) {
      ctx.save();
      try {
        if (annoObj instanceof HighlightObject) {
          annoObj.renderTo(this.#viewport, ctx, this.#ui, pdfCtx);
        } else if (PixelEraser.ERASABLE_TYPES.includes(annoObj.__typename)) {
          // annoObj.renderTo(this.#viewport, ctx, this.#ui);
          if (!(this.annotationBuilder instanceof PixelEraser)) {
            annoObj.renderTo(this.#viewport, ctx, this.#ui);
          }
        } else {
          annoObj.renderTo(this.#viewport, ctx, this.#ui);
        }
      } catch (e) {}
      ctx.restore();
    }

    if (this.annotationBuilder) {
      ctx.save();
      this.annotationBuilder.draw(ctx);
      ctx.restore();
    }

    if (this.points && Array.isArray(this.points)) {
      for (const point of this.points) {
        ctx.beginPath();
        ctx.lineWidth = 2;
        ctx.fillStyle = point.color || "gray";
        ctx.strokeStyle = "black";
        ctx.arc(point.x, point.y, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.closePath();
      }
    }
    if (this.selectionArea) this.renderSelectionArea(ctx);
    this.AnimationFrameTimer = requestAnimationFrame(() => this.render(viewport));
  }
  points = [];

  resume() {
    this.pageShouldRender = true;
    clearTimeout(this.cancel2resumeHideBarTimer);
    this.cancel2resumeHideBarTimer = setTimeout(() => this.showFloatingBar(true), 500);
  }

  hide() {}

  cancel() {
    this.pageShouldRender = false;
    cancelAnimationFrame(this.AnimationFrameTimer);
    this.showFloatingBar(false);
  }

  // ---------- getters & setters of own properties ----------
  get pageNumber() {
    return this.#pageNumber;
  }
  set pageNumber(value) {
    this.#pageNumber = value;
    this.shadowRoot.querySelector(".folia-page")?.setAttribute("id", `page${this.#pageNumber}`);
  }
  get viewport() {
    return this.#viewport;
  }
  set viewport(value) {
    this.#viewport = value.clone();
    const { width, height, scale } = this.#viewport;

    this.#canvas ||= this.shadowRoot.querySelector(".folia-page-canvas");
    this.#canvas.width = width * window.devicePixelRatio;
    this.#canvas.height = height * window.devicePixelRatio;
    this.#canvas.style.width = width + "px";
    this.#canvas.style.height = height + "px";

    this.#ui ||= this.shadowRoot.querySelector(".folia-page-ui");
  }
  get eventBus() {
    return this.#eventBus;
  }
  set eventBus(value) {
    this.#eventBus = value;
  }
  get userEmail() {
    return this.#userEmail;
  }
  get userName() {
    return this.#userName;
  }
  get objects() {
    return this.#objects;
  }
  get selectedObjects() {
    return Array.from(this.#multipleSelection);
  }
  get canManage() {
    return (
      this.#permissions.includes(COLLABORATOR_PERMISSIONS.MANAGE_ANNOTATION) ||
      this.#permissions.includes(COLLABORATOR_PERMISSIONS.MANAGE_OWN_COMMENT)
    );
  }
  get annotationBuilderClass() {
    return null;
  }
  set annotationBuilderClass(value) {
    this.#annotationBuilderClass = value;
  }
  get undoRedoManager() {
    return this.#undoRedoManager;
  }
  set undoRedoManager(value) {
    this.#undoRedoManager = value;
  }
  // ----------- internal methods ---------------
  refreshFoliaPage() {
    const dataRequest = new EventBusRequest(this.#eventBus);
    dataRequest
      .get("folia-data", { pageNumber: this.#pageNumber })
      .then((data) => {
        this.#permissions = data.permissions;
        this.#userEmail = data.userEmail;
        this.#userName = data.userName;
        this.#userRole = data.userRole;
        for (const dataObject of data.objects) {
          let annoObj = this.#objects.find((obj) => obj.id === dataObject.id);
          if (annoObj) {
            annoObj.update(dataObject);
          } else {
            const AnnoObjClass = FoliaPage.AnnoClasses[dataObject.__typename];
            if (!AnnoObjClass) continue;
            annoObj = new AnnoObjClass(dataObject, this.#viewport, this.#eventBus, this.#pdfCanvas);
            annoObj.userEmail = this.#userEmail;
            annoObj.userName = this.#userName;
            annoObj.userRole = this.#userRole;
            annoObj.permissions = this.#permissions;
            this.#objects.push(annoObj);
          }
        }
        this.startRender();
      })
      .catch(console.error);
  }
  projectHasBeenUpdated(data) {
    this.#permissions = data.permissions;
    this.#userEmail = data.userEmail;
    this.#userName = data.userName;

    for (const object of this.#objects) {
      object.permissions = data.permissions;
    }
  }

  pageShouldRender = false;
  pageIsActive = false;
  mouseWasPressedDown = false;
  mouseWasMoved = false;
  freeMousePoint = null;
  startMousePoint = null;
  activeObject = null;
  activeObjectRole = null;

  normalizeMousePoin(e) {
    return {
      x: Math.min(this.parentNode.clientWidth, Math.max(0, e.layerX)),
      y: Math.min(this.parentNode.clientHeight, Math.max(0, e.layerY)),
    };
  }
  unselectObject(object) {
    this.#multipleSelection.delete(object);
  }
  resetObjectsSelection() {
    this.#multipleSelection.clear();
    this.showFloatingBar(false);
  }
  attachCommentForAnnotation() {
    console.log("Attching comment for annotation");
    const BuilderClass = CommentBuilder;
    BuilderClass.initialPreset = {"parentAnnotationId": "3244342223edssd", "x": 230, "y": 200, "pageNumber": 0};
    this.startDrawing(BuilderClass);
  }
  selectAnnotation({ id, scrollIntoView = false }) {
    const object = this.#objects.find((obj) => obj.id === id);
    if (!object) return console.warn(`annotation ${id} not found`);

    this.#multipleSelection.clear();
    this.#multipleSelection.add(object);
    if (scrollIntoView) {
      object.annotationUI.scrollIntoView({ block: "center", inline: "nearest" });
    }
  }
  selectAllObjects() {
    const allAvailableObjects = this.#objects.filter((object) => !object.isDeleted);
    allAvailableObjects
      .filter((object) => {
        return !(object instanceof CommentObject);
      })
      .forEach((object) => this.#multipleSelection.add(object));
    this.showFloatingBar(true);
  }
  addAnnotationObject(dataObject, makeSelected = false) {
    const AnnoObjClass = FoliaPage.AnnoClasses[dataObject.__typename];
    if (!AnnoObjClass) {
      return console.warn("Unavailable annotation type", dataObject.__typename);
    }
    const annoObj = new AnnoObjClass(dataObject, this.#viewport, this.#eventBus, this.#pdfCanvas);
    annoObj.userEmail = this.#userEmail;
    annoObj.userName = this.#userName;
    annoObj.permissions = this.#permissions;
    this.#objects.push(annoObj);

    if (makeSelected) {
      setTimeout(() => {
        this.#multipleSelection.add(annoObj);
        this.showFloatingBar(true);
        annoObj.startEditMode();
      }, 50);
    }
    return annoObj;
  }
  duplicateSelectedObjects() {
    const object = Array.from(this.#multipleSelection).pop();

    if (
      !object ||
      !object.canManage ||
      object.staticObject ||
      object.__typename === ANNOTATION_TYPES.COMMENT ||
      object.__typename === ANNOTATION_TYPES.REPLY ||
      object.__typename === ANNOTATION_TYPES.HIGHLIGHT
    )
      return;
    const objectData = object.createShiftedClone(this.userEmail, this.userName);
    if (!objectData) return;
    const annoObject = this.addAnnotationObject(objectData);
    this.eventBus.dispatch("undo-redo-collect", { action: "add", currentState: objectData });
    this.eventBus.dispatch("objects-were-updated", [annoObject.toObjectData()]);
    this.#multipleSelection.clear();
    this.showFloatingBar(false);
  }
  deleteSelectedObjects(annoObject) {
    const deletedObjects = annoObject ? [annoObject] : this.#multipleSelection.values();
    for (const object of deletedObjects) {
      if (!object.canDelete) continue;
      object.changeManually({ deletedAt: new Date().toISOString() });
    }
    this.resetObjectsSelection();
  }
  pasteAnnotationFromClipboard(data) {
    if (!this.pageIsActive || !this.canManage) return;
    const isEditing = this.#multipleSelection.toArray().some((object) => object.isEditing);
    if (isEditing) return;

    this.resetObjectsSelection();

    if (!Array.isArray(data)) return;
    for (let annoData of data) {
      switch (annoData.__typename) {
        case ANNOTATION_TYPES.ARROW: {
          const { sourcePoint, targetPoint } = setArrowNewPosition(
            annoData.sourcePoint,
            annoData.targetPoint,
            this.viewport,
            this.freeMousePoint,
            annoData.lineWidth
          );
          annoData.sourcePoint = sourcePoint;
          annoData.targetPoint = targetPoint;
          break;
        }
        case ANNOTATION_TYPES.CIRCLE:
        case ANNOTATION_TYPES.SQUARE:
        case ANNOTATION_TYPES.IMAGE: {
          const rect = setRectNewPosition(
            annoData.rect,
            this.viewport,
            this.freeMousePoint,
            annoData.lineWidth
          );
          annoData.rect = rect;
          break;
        }
        case ANNOTATION_TYPES.INK: {
          const paths = setPathsNewPosition(
            annoData.paths,
            this.viewport,
            this.freeMousePoint,
            annoData.lineWidth
          );
          annoData.paths = paths;
          break;
        }
        case ANNOTATION_TYPES.TEXT_BOX: {
          const absTextRect = setTextRectNewPosition(this.viewport, annoData.text, "MONOSPACE", 13, "W400");

          annoData.rect = setRectNewPosition(
            annoData.rect || absTextRect,
            this.#viewport,
            this.freeMousePoint
          );
          annoData.fontSize ||= 13;
          annoData.fontWeight ||= "W400";
          annoData.fontFamily ||= "MONOSPACE";
          annoData.color ||= "#000000FF";
          annoData.textAlignment ||= "CENTER";
          break;
        }
        default:
          continue;
          break;
      }

      annoData.id = uuid();
      annoData.addedAt = new Date().toISOString();
      annoData.collaboratorEmail = this.#userEmail;
      annoData.page = this.pageNumber;

      this.addAnnotationObject(annoData);
      this.eventBus.dispatch("objects-were-updated", [{ ...annoData, newbie: true }]);
      this.eventBus.dispatch("undo-redo-collect", { action: "add", currentState: annoData });
    }
  }

  overlappingObjects = [];
  overlappedObjectIndex = 0;
  findObjectByCoordinates(point) {
    if (!point) throw new Error("required point");
    const { x, y } = point;
    const overlappingObjects = this.#objects
      .slice()
      .sort(sortObjects)
      .reverse()
      .filter((obj) => !obj.isDeleted)
      .filter((obj) => {
        const objRect = obj.getBoundingRect();
        const isIn = isPointInRect(point, objRect);
        return isIn;
      });

    if (overlappingObjects.length === 0) {
      this.overlappedObjectIndex = 0;
      this.overlappingObjects = overlappingObjects;
      return null;
    }

    let objIndex = 0;
    if (areArraysSimilar(overlappingObjects, this.overlappingObjects)) {
      objIndex = this.overlappedObjectIndex;
    } else {
      this.overlappedObjectIndex = 0;
    }
    this.overlappingObjects = overlappingObjects.slice();
    return overlappingObjects.at(objIndex);
  }
  findObjectsByArea(startPos, endPos) {
    if (!startPos) throw new Error("required startPos");
    if (!endPos) throw new Error("required endPos");

    const selectionArea = {
      left: Math.min(startPos.x, endPos.x),
      top: Math.min(startPos.y, endPos.y),
      right: Math.max(startPos.x, endPos.x),
      bottom: Math.max(startPos.y, endPos.y),
      width: Math.min(startPos.x, endPos.x) + Math.max(startPos.x, endPos.x),
      height: Math.min(startPos.y, endPos.y) + Math.max(startPos.y, endPos.y),
    };
    this.selectionArea = selectionArea;

    return this.#objects.filter((object) => {
      if (object instanceof CommentObject) return false;
      if (object.isDeleted) return false;
      return isRectInRect(selectionArea, object.getBoundingRect());
    });
  }

  onMouseDown(e) {
    if (e.target !== this) return;
    this.freeMousePoint = this.normalizeMousePoin(e);

    this.activeObject = this.findObjectByCoordinates(this.freeMousePoint) || e.objectInstance;
    this.activeObjectRole = e.objectRole || e.target.dataset["role"];

    if (!this.activeObject && this.activeObjectRole === ROLE_PAGE) {
      this.resetObjectsSelection();
      // this.#multipleSelection.clear();
      // this.#eventBus.dispatch("reset-objects-selection");
      this.startMousePoint = this.normalizeMousePoin(e);
    } else if (this.activeObject && this.activeObjectRole) {
      this.startMousePoint = this.normalizeMousePoin(e);
      if (!e.shiftKey && !this.#multipleSelection.has(this.activeObject)) {
        const selectedHeap = this.#multipleSelection.toArray();
        if (!this.overlappingObjects.some((obj) => selectedHeap.some((sObj) => sObj.id === obj.id))) {
          this.resetObjectsSelection();
        }
      }
      this.#multipleSelection.size > 0
        ? this.#multipleSelection.forEach((object) => object.rememberStartPosition())
        : this.activeObject.rememberStartPosition();
    }
    this.mouseWasPressedDown = true;
  }
  onMouseMove(e) {
    this.freeMousePoint = this.normalizeMousePoin(e);
    if (!this.mouseWasPressedDown) return;
    this.mouseWasMoved = true;
    // prettier-ignore
    const cornersRoles = [
      ROLE_CORNER_LB, ROLE_CORNER_LT, ROLE_CORNER_RB, ROLE_CORNER_RT,
      ROLE_ARROW_SOURCE, ROLE_ARROW_TARGET,
      ROLE_TEXTBOX_LEFT_TOP, ROLE_TEXTBOX_RIGHT_TOP,
    ];
    const deltaX = this.freeMousePoint.x - this.startMousePoint.x;
    const deltaY = this.freeMousePoint.y - this.startMousePoint.y;
    this.showFloatingBar(false);

    if (this.activeObjectRole === ROLE_OBJECT) {
      if (this.#multipleSelection.size === 0) {
        this.activeObject.move(deltaX, deltaY);
      } else {
        this.#multipleSelection.forEach((object) => object.move(deltaX, deltaY));
      }
      //
    } else if (cornersRoles.includes(this.activeObjectRole)) {
      this.#multipleSelection.remainOnly(this.activeObject);
      this.#multipleSelection.forEach((object) =>
        object.resize(deltaX, deltaY, this.activeObjectRole, e.shiftKey)
      );
      //
    } else if (this.activeObjectRole === ROLE_PAGE) {
      const foundObjects = this.findObjectsByArea(this.startMousePoint, this.freeMousePoint);
      this.resetObjectsSelection();
      foundObjects.forEach((object) => this.#multipleSelection.add(object));
      //
    }
  }
  onMouseUp(e) {
    if (!this.mouseWasPressedDown) return;
    this.selectionArea = null;

    if (!this.activeObject && this.activeObjectRole === ROLE_PAGE && this.mouseWasMoved) {
      this.showFloatingBar(true);
    } else if (!this.activeObject && this.activeObjectRole === ROLE_PAGE && !this.mouseWasMoved) {
      this.showFloatingBar(false);
    } else if (this.activeObject && this.activeObjectRole && this.mouseWasMoved) {
      this.showFloatingBar(true);
      // this.overlappingObjects = [];
      //
    } else if (this.activeObject && this.activeObjectRole && !this.mouseWasMoved) {
      if (e.shiftKey && !this.#multipleSelection.has(this.activeObject)) {
        this.#multipleSelection.add(this.activeObject);
        this.showFloatingBar(true);
      } else if (e.shiftKey && this.#multipleSelection.has(this.activeObject)) {
        this.#multipleSelection.delete(this.activeObject);
        this.showFloatingBar(true);
      } else if (!e.shiftKey && !this.#multipleSelection.has(this.activeObject)) {
        this.resetObjectsSelection();
        this.#multipleSelection.add(this.activeObject);
        this.showFloatingBar(true);
      } else if (!e.shiftKey && this.#multipleSelection.has(this.activeObject)) {
        // run edit mode if needed
        this.#multipleSelection.remainOnly(this.activeObject);
        this.activeObject.startEditMode();
        // this.showFloatingBar(false);
      }
    }
    if (!this.mouseWasMoved) {
      this.overlappedObjectIndex++;
      if (this.overlappedObjectIndex >= this.overlappingObjects.length) this.overlappedObjectIndex = 0;
    }

    this.mouseWasPressedDown = false;
    this.mouseWasMoved = false;
    this.startMousePoint = null;
    this.activeObject = null;
    this.activeObjectRole = null;
  }
  onMouseOver(e) {
    this.pageIsActive = true;
  }
  onMouseOut(e) {
    this.pageIsActive = false;
    this.onMouseUp(e);
    // this.mouseWasPressedDown = false;
    // this.mouseWasMoved = false;
  }

  // ---------- custom outside methods ----------
  showFloatingBar(visible = false) {
    const objects = Array.from(this.#multipleSelection)
      .filter((object) => {
        return !(object instanceof CommentObject);
      })
      .map((object) => {
        return object.toFloatingBarData();
      });

    if (!this.floatingBar) return;
    if (visible && objects.length > 0) {
      this.floatingBar.canDelete = objects.at(-1)?.canDelete;
      this.floatingBar.canManage = objects.at(-1)?.canManage;
      this.floatingBar.show(objects, this.zoomScale);
    } else {
      this.floatingBar.hide();
    }
  }
  startDrawing(BuilderClass) {
    this.resetObjectsSelection();
    this.stopDrawing();
    this.annotationBuilderClass = BuilderClass;
    this.annotationBuilder = new BuilderClass(this, BuilderClass, this.undoRedoManager);
  }
  updateToolDrawingProperties(preset) {
    this.annotationBuilder.applyPreset(preset);
  }
  stopDrawing() {
    // console.warn("stopDrawing");
    if (!this.annotationBuilder) return;
    this.annotationBuilder.stop();
    this.annotationBuilder = null;
    this.annotationBuilderClass = null;
  }
}

if ("customElements" in window) {
  customElements.define("folia-page", FoliaPage);
} else {
  throw new Error("Custom html element <folia-page> is not supported.");
}

export { EventBusRequest, FoliaPage };
