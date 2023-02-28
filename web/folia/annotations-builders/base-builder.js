import { hexColor2pdf } from "../folia-util";
import { v4 as uuid } from "uuid";
import { UndoRedo } from "../undo-redo";

class BaseBuilder {
  viewport;
  pageDiv;
  pageNumber;

  canvas;
  preset = {};

  static initialPreset = {};

  constructor(foliaPageLayer, BuildingClass) {
    this.foliaPageLayer = foliaPageLayer;
    this.viewport = foliaPageLayer.viewport.clone({ dontFlip: true });
    this.applyPreset(BuildingClass.initialPreset);
    this.asset = BuildingClass.asset;
    this.undoRedoManager = BuildingClass.undoRedoManager;
    this.resume();
    this.undoRedoManager.updateUI();
  }

  // prepareConversation(e) {
  //   const viewRect = [e.offsetX, e.offsetY, 50, 50];
  //   const annoData = {
  //     edited: false,
  //     initial_comment: "",
  //     rect: viewRect2pdfRect(viewRect, this.viewport),
  //   };
  //   this.newbieAnnotationsData = [annoData];
  // }

  prepareAnnotations2save() {
    return [];
  }

  stop() {
    console.log("TEXT BOX BASE STOP");
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

      this.foliaPageLayer.addAnnotationObject(annotation);
      this.foliaPageLayer.commitObjectChanges(annotation);
      this.foliaPageLayer.undoRedoManager.creatingObject(annotation);
    }

    // console.log("stop builder on page", page);
    this.foliaPageLayer.pageDiv
      .querySelectorAll(".annotation-builder-container")
      .forEach((el) => el.remove());
    this.canvas = null;
    this.newbieAnnotationsData = [];
  }

  applyUndoRedo() {
    console.log("Base method of applyUndoRedo");
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
