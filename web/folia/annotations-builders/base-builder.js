import { hexColor2pdf } from "../folia-util";
import { v4 as uuid } from "uuid";
import { UndoRedo } from "../undo-redo";
import { ANNOTATION_TYPES } from "../constants";

class BaseBuilder {
  viewport;
  pageDiv;
  pageNumber;

  canvas;
  preset = {};

  static initialPreset = {};

  constructor(foliaPageLayer, BuildingClass, undoRedoManager) {
    this.foliaPageLayer = foliaPageLayer;
    this.viewport = foliaPageLayer.viewport.clone({ dontFlip: true });
    this.applyPreset(BuildingClass.initialPreset);
    this.asset = BuildingClass.asset;
    this.undoRedoManager = undoRedoManager;
    this.resume();
    this.undoRedoManager.updateUI();
  }

  prepareAnnotations2save() {
    // console.log("base builder.prepareAnnotations2save");
    return [];
  }

  stop() {
    // console.log("base builder.stop");
    if (this.removeOnClickListener) this.removeOnClickListener();
    const collaboratorEmail = this.foliaPageLayer.dataProxy.userEmail;
    const addedAt = new Date().toISOString();
    const page = this.foliaPageLayer.pageNumber;

    for (const data of this.prepareAnnotations2save()) {
      const id = uuid();
      const annotation = {
        id,
        page,
        collaboratorEmail,
        addedAt,
        deleted: false,
        newbie: true,
        ...data,
      };

      const makeSelected = [ANNOTATION_TYPES.COMMENT].includes(annotation.__typename);
      this.foliaPageLayer.addAnnotationObject(annotation, makeSelected);
      this.foliaPageLayer.commitObjectChanges(annotation);
      this.foliaPageLayer.undoRedoManager.creatingObject(annotation);
    }

    this.foliaPageLayer.undoRedoManager.removeToolUndoRedoItems();
    this.foliaPageLayer.pageDiv
      .querySelectorAll(".annotation-builder-container")
      .forEach((el) => el.remove());
    this.canvas = null;
    this.newbieAnnotationsData = [];
  }

  applyUndoRedo() {
    // console.log("Base method of applyUndoRedo");
  }

  applyPreset(preset) {
    for (const [key, value] of Object.entries(preset)) {
      this.preset[key] = value;
    }
  }

  getRelativePoint(e) {
    let reference;
    const offset = {
      left: e.currentTarget.offsetLeft,
      top: e.currentTarget.offsetTop,
    };
    reference = e.currentTarget.offsetParent;
    do {
      offset.left += reference.offsetLeft;
      offset.top += reference.offsetTop - reference.scrollTop;
      reference = reference.offsetParent;
    } while (reference);

    return {
      x: e.pageX - offset.left,
      y: e.pageY - offset.top,
    };
  }

  onMouseClick(e) {
    e.preventDefault();
    e.stopPropagation();
  }
}

export default BaseBuilder;
