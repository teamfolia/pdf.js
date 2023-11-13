import { hexColor2pdf } from "../folia-util";
import { v4 as uuid } from "uuid";
import { UndoRedo } from "../undo-redo";
import { ANNOTATION_TYPES } from "../constants";

class BaseBuilder {
  canvas;
  preset = {};

  static initialPreset = {};

  resetDrawingBinded = this.resetDrawing.bind(this);

  constructor(foliaPageLayer, BuildingClass, undoRedoManager) {
    this.foliaPageLayer = foliaPageLayer;
    this.viewport = foliaPageLayer.viewport.clone({ dontFlip: true });
    this.applyPreset(BuildingClass.initialPreset);
    this.asset = BuildingClass.asset;
    this.undoRedoManager = undoRedoManager;
    this.resume();
    this.undoRedoManager?.updateUI();

    this.foliaPageLayer.eventBus.on("reset-drawing", this.resetDrawingBinded);
  }

  resetDrawing(callerPage) {
    console.log("reset-drawing base", { callerPage, currentPage: this.foliaPageLayer.pageNumber });
  }

  prepareAnnotations2save() {
    return [];
  }

  stop() {
    this.foliaPageLayer.eventBus.off("reset-drawing", this.resetDrawingBinded);
    // console.log("base builder.stop");
    if (this.removeOnClickListener) this.removeOnClickListener();
    const collaboratorEmail = this.foliaPageLayer.userEmail;
    const collaboratorName = this.foliaPageLayer.userName;
    const addedAt = new Date().toISOString();
    const page = this.foliaPageLayer.pageNumber;

    for (const data of this.prepareAnnotations2save()) {
      const id = data.id || uuid();
      const annotation = {
        id,
        page,
        collaboratorEmail,
        collaboratorName,
        addedAt,
        createdAt: addedAt,
        deleted: false,
        // newbie: true,
        ...data,
      };
      const makeSelected = [ANNOTATION_TYPES.COMMENT, ANNOTATION_TYPES.TEXT_BOX].includes(
        annotation.__typename
      );
      const shouldBeCommitted = !("doNotCommit" in annotation);

      const annoObj = this.foliaPageLayer.addAnnotationObject(annotation, makeSelected);
      const annoData = annoObj?.toObjectData() || annotation;
      if (shouldBeCommitted) {
        this.foliaPageLayer.eventBus.dispatch("objects-were-updated", [{ ...annoData, newbie: true }]);
      }
      this.foliaPageLayer.eventBus.dispatch("undo-redo-collect", { action: "add", currentState: annoData });
    }

    this.foliaPageLayer.undoRedoManager?.removeToolUndoRedoItems();
    this.foliaPageLayer.parentNode
      .querySelectorAll(".annotation-builder-container")
      .forEach((el) => el.remove());
    this.canvas = null;
    this.newbieAnnotationsData = [];
  }

  applyUndoRedo() {}

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
      offset.left += reference.offsetLeft - reference.scrollLeft;
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
