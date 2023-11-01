import { v4 as uuid } from "uuid";
import html from "./folia-page.html";
import FoliaFloatingBar from "./folia-floating-bar";
import {
  ANNOTATION_TYPES,
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
} from "../constants";

import InkObject from "./render-objects/ink";
import SquareObject from "./render-objects/square";
import CircleObject from "./render-objects/circle";
import ArrowObject from "./render-objects/arrow";
import ImageObject from "./render-objects/image";
import TextBoxObject from "./render-objects/text-box";
import CommentObject from "./render-objects/comment";
import HighlightObject from "./render-objects/highlight";
import { UndoRedo } from "../undo-redo";

class EventBusRequest {
  constructor(eventBus) {
    this.eventBus = eventBus;
  }

  async get(reqName, reqProps) {
    const responseName = uuid();
    const that = this;
    return new Promise((resolve, reject) => {
      try {
        const timeout = setTimeout(() => reject(new Error("event bus request timeout")), 10_000);
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

  constructor() {
    super();
    const template = document.createElement("template");
    template.innerHTML = html;
    this.attachShadow({ mode: "open" });
    this.shadowRoot.appendChild(template.content.cloneNode(true));
    // console.log("folia page 'constructor'");
  }

  // ----------- system methods ------------
  static get observedAttributes() {
    return [];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    // console.log("folia page 'attributeChangedCallback'");
    switch (name) {
      default:
        break;
    }
  }

  connectedCallback() {
    console.log("connectedCallback", this.pageNumber);
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

    const floatingBar = document.createElement("folia-floating-bar");
    this.floatingBar = this.shadowRoot.appendChild(floatingBar);
    this.floatingBar.eventBus = this.#eventBus;
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
    console.log("disconnectedCallback", this.pageNumber);

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

  startRender(viewport) {
    // console.log("folia page start render", viewport);
    cancelAnimationFrame(this.AnimationFrameTimer);
    this.render(viewport);
  }

  render(viewport) {
    // console.log("folia page render", pdfCanvas);
    if (viewport) this.viewport = viewport.clone();
    if (!this.pageShouldRender) return;
    this.#canvas.width = this.#canvas.width;
    const ctx = this.#canvas.getContext("2d");
    for (const annoObj of this.#objects) {
      ctx.save();
      if (annoObj instanceof HighlightObject) {
        const pdfCanvas = this.parentNode.querySelector('div.canvasWrapper>canvas[role="presentation"]');
        annoObj.renderTo(this.#viewport, ctx, this.#ui, pdfCanvas);
      } else {
        annoObj.renderTo(this.#viewport, ctx, this.#ui);
      }
      ctx.restore();
    }

    if (this.annotationBuilder) {
      ctx.save();
      this.annotationBuilder.draw(ctx);
      ctx.restore();
    }

    if (this.selectionArea) this.renderSelectionArea(ctx);
    this.AnimationFrameTimer = requestAnimationFrame(() => this.render(viewport));
  }

  resume() {
    // console.log(`page #${this.pageNumber} invoked 'resume'`);
    this.pageShouldRender = true;
    clearTimeout(this.cancel2resumeHideBarTimer);
    this.cancel2resumeHideBarTimer = setTimeout(() => this.showFloatingBar(true), 500);
  }

  hide() {
    // console.log("folia page 'hide'");
  }

  cancel() {
    // console.log(`page #${this.pageNumber} invoked 'cancel'`);
    this.pageShouldRender = false;
    cancelAnimationFrame(this.AnimationFrameTimer);
    this.showFloatingBar(false);
  }

  // ---------- getters & setters of own properties ----------
  get pageNumber() {
    return this.#pageNumber;
  }
  set pageNumber(value) {
    // console.log("set page", value);
    this.#pageNumber = value;
    this.shadowRoot.querySelector(".folia-page")?.setAttribute("id", `page${this.#pageNumber}`);
  }
  get viewport() {
    return this.#viewport;
  }
  set viewport(value) {
    this.#viewport = value.clone();
    const { width, height, scale } = this.#viewport;
    // console.log("set viewport", width, "x", height, "scale", scale);
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
    // console.log("set eventBus", value);
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
    // console.log("refreshFoliaPage");
    const dataRequest = new EventBusRequest(this.#eventBus);
    dataRequest
      .get("folia-data", { pageNumber: this.#pageNumber })
      .then((data) => {
        this.#permissions = data.permissions;
        this.#userEmail = data.userEmail;
        this.#userName = data.userName;
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
  findObjectByCoordinates(point) {
    if (!point) throw new Error("required point");
    const { x, y } = point;
    return this.#objects
      .filter((obj) => !obj.isDeleted)
      .find((obj) => {
        const { left, top, right, bottom } = obj.getBoundingRect();
        return x >= left && x <= right && y >= top && y <= bottom;
      });
  }
  findObjectsByArea(startPos, endPos) {
    if (!startPos) throw new Error("required startPos");
    if (!endPos) throw new Error("required endPos");

    const selectionArea = {
      left: Math.min(startPos.x, endPos.x),
      top: Math.min(startPos.y, endPos.y),
      right: Math.max(startPos.x, endPos.x),
      bottom: Math.max(startPos.y, endPos.y),
    };
    this.selectionArea = selectionArea;

    // prettier-ignore
    return this.#objects.filter((object) => {
      if (object instanceof CommentObject) return false;
      if (object.isDeleted) return false;
      const { left, top, right, bottom } = object.getBoundingRect();
      const x_overlap = Math.max(0, Math.min(selectionArea.right, right) - Math.max(selectionArea.left, left));
      const y_overlap = Math.max(0, Math.min(selectionArea.bottom, bottom) - Math.max(selectionArea.top, top));
      return Boolean(x_overlap * y_overlap);
    });
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
    console.log("deleteSelectedObjects");
    const deletedObjects = annoObject ? [annoObject] : this.#multipleSelection.values();
    for (const object of deletedObjects) {
      object.changeManually({ deletedAt: new Date().toISOString() });
    }
    this.resetObjectsSelection();
  }

  onMouseDown(e) {
    if (e.target !== this) return;
    this.freeMousePoint = this.normalizeMousePoin(e);

    this.activeObject = this.findObjectByCoordinates(this.freeMousePoint) || e.objectInstance;
    this.activeObjectRole = e.objectRole || e.target.dataset["role"];
    // console.log("onMouseDown", this.#pageNumber, this.activeObject, this.activeObjectRole);
    // console.log("onMouseDown", e.target);

    if (!this.activeObject && this.activeObjectRole === ROLE_PAGE) {
      this.resetObjectsSelection();
      // this.#multipleSelection.clear();
      // this.#eventBus.dispatch("reset-objects-selection");
      this.startMousePoint = this.normalizeMousePoin(e);
    } else if (this.activeObject && this.activeObjectRole) {
      this.startMousePoint = this.normalizeMousePoin(e);
      if (!e.shiftKey && !this.#multipleSelection.has(this.activeObject)) {
        this.resetObjectsSelection();
        // this.#eventBus.dispatch("reset-objects-selection");
        // this.#multipleSelection.clear();
      }
      this.#multipleSelection.size > 0
        ? this.#multipleSelection.forEach((object) => object.rememberStartPosition())
        : this.activeObject.rememberStartPosition();
    }
    this.mouseWasPressedDown = true;
    // console.log("onMouseDown", this.#pageNumber, this.activeObjectRole, this.activeObject?.annotationUI);
  }
  onMouseMove(e) {
    this.freeMousePoint = this.normalizeMousePoin(e);
    if (!this.mouseWasPressedDown) return;
    this.mouseWasMoved = true;
    // console.log("onMouseMove", this.activeObject, this.activeObjectRole);
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
      // this.#multipleSelection.clear();
      // this.#eventBus.dispatch("reset-objects-selection");
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
        // this.#multipleSelection.clear();
        // this.#eventBus.dispatch("reset-objects-selection");
        this.#multipleSelection.add(this.activeObject);
        this.showFloatingBar(true);
      } else if (!e.shiftKey && this.#multipleSelection.has(this.activeObject)) {
        // run edit mode if needed
        this.#multipleSelection.remainOnly(this.activeObject);
        this.activeObject.startEditMode();
        // console.log("run edit mode if needed");
        // this.showFloatingBar(false);
      }
    }
    // console.log("onMouseUp", this.activeObjectRole, this.activeObject);

    this.mouseWasPressedDown = false;
    this.mouseWasMoved = false;
    this.startMousePoint = null;
    this.activeObject = null;
    this.activeObjectRole = null;
  }
  onMouseOver(e) {
    // console.log("onMouseOver", e.target);
    this.pageIsActive = true;
  }
  onMouseOut(e) {
    // console.log("onMouseOut", e.target);
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
      this.floatingBar.show(objects);
    } else {
      this.floatingBar.hide();
    }
  }
  startDrawing(BuilderClass) {
    // console.log("startDrawing", this.parentNode);
    this.resetObjectsSelection();
    this.stopDrawing();
    this.#annotationBuilderClass = BuilderClass;
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
    this.#annotationBuilderClass = null;
  }
}

if ("customElements" in window) {
  customElements.define("folia-page", FoliaPage);
} else {
  throw new Error("Custom html element <folia-page> is not supported.");
}

export { FoliaPage };
