import { v4 as uuid } from "uuid";
import { ANNOTATION_TYPES } from "./constants";

class CreatingAnnotation {
  constructor(undoRedoManager, state) {
    this.manager = undoRedoManager;
    this.state = Object.assign({}, state);
    this._location = this.manager.foliaPdfViewer.pdfViewer._location;
  }

  undo() {
    this.manager.foliaPdfViewer.page = this.state.page + 1;
    const page = this.manager.foliaPdfViewer.pdfViewer._pages.find((page) => page.id === this.state.page + 1);
    if (!page) return;
    if (!page.foliaPageLayer) return setTimeout(() => this.undo(), 100);

    this.manager.foliaPdfViewer.pdfViewer.scrollPageIntoView({
      pageNumber: this.state.page + 1,
      destArray: [null, { name: "XYZ" }, this._location.left, this._location.top, this._location.scale / 100],
      allowNegativeOffset: true,
    });

    const annoObject = page.foliaPageLayer.annotationObjects.get(this.state.id);
    if (!annoObject) return;
    page.foliaPageLayer.deleteAnnotationObject(annoObject);
    // console.log("CreatingAnnotation.undo -> delete", annoObject.id);
  }

  redo() {
    const page = this.manager.foliaPdfViewer.pdfViewer._pages.find((page) => page.id === this.state.page + 1);
    if (!page) return;
    if (!page.foliaPageLayer) return setTimeout(() => this.redo(), 100);
    this.manager.replaceObjectsId(this.state.id, uuid());

    this.manager.foliaPdfViewer.pdfViewer.scrollPageIntoView({
      pageNumber: this.state.page + 1,
      destArray: [null, { name: "XYZ" }, this._location.left, this._location.top, this._location.scale / 100],
      allowNegativeOffset: true,
    });

    page.foliaPageLayer.addAnnotationObject(this.state);
    page.foliaPageLayer.commitObjectChanges(this.state);
    // console.log("CreatingAnnotation.redo -> create", this.state.id);
  }
}

class UpdatingAnnotation {
  constructor(undoRedoManager, prevState, newState) {
    this.manager = undoRedoManager;
    this.prevState = Object.assign({}, prevState);
    this.newState = Object.assign({}, newState);
    this._location = this.manager.foliaPdfViewer.pdfViewer._location;
  }

  undo() {
    this.manager.foliaPdfViewer.page = this.prevState.page + 1;
    const page = this.manager.foliaPdfViewer.pdfViewer._pages.find(
      (page) => page.id === this.prevState.page + 1
    );
    if (!page) return;
    if (!page.foliaPageLayer) return setTimeout(() => this.undo(), 100);

    this.manager.foliaPdfViewer.pdfViewer.scrollPageIntoView({
      pageNumber: this.prevState.page + 1,
      destArray: [null, { name: "XYZ" }, this._location.left, this._location.top, this._location.scale / 100],
      allowNegativeOffset: true,
    });

    const annoObject = page.foliaPageLayer.annotationObjects.get(this.prevState.id);
    if (!annoObject) return;
    annoObject.update(this.prevState, null, true);
    annoObject.markAsChanged();
    page.foliaPageLayer.commitObjectChanges(annoObject.getRawData());
    // console.log("UpdatingAnnotation.undo -> update", annoObject.id);
  }

  redo() {
    this.manager.foliaPdfViewer.page = this.newState.page + 1;
    const page = this.manager.foliaPdfViewer.pdfViewer._pages.find(
      (page) => page.id === this.newState.page + 1
    );
    if (!page) return;
    if (!page.foliaPageLayer) return setTimeout(() => this.redo(), 100);

    this.manager.foliaPdfViewer.pdfViewer.scrollPageIntoView({
      pageNumber: this.prevState.page + 1,
      destArray: [null, { name: "XYZ" }, this._location.left, this._location.top, this._location.scale / 100],
      allowNegativeOffset: true,
    });

    const annoObject = page.foliaPageLayer.annotationObjects.get(this.newState.id);
    if (!annoObject) return;
    annoObject.update(this.newState, null, true);
    annoObject.markAsChanged();
    page.foliaPageLayer.commitObjectChanges(annoObject.getRawData());
    // console.log("UpdatingAnnotation.redo -> update", annoObject.id);
  }
}

class DeletingAnnotation {
  constructor(undoRedoManager, prevState) {
    this.manager = undoRedoManager;
    this.prevState = Object.assign({}, prevState);
    this._location = this.manager.foliaPdfViewer.pdfViewer._location;
  }

  undo() {
    const page = this.manager.foliaPdfViewer.pdfViewer._pages.find(
      (page) => page.id === this.prevState.page + 1
    );
    if (!page) return;

    this.manager.replaceObjectsId(this.prevState.id, uuid());

    this.manager.foliaPdfViewer.pdfViewer.scrollPageIntoView({
      pageNumber: this.prevState.page + 1,
      destArray: [null, { name: "XYZ" }, this._location.left, this._location.top, this._location.scale / 100],
      allowNegativeOffset: true,
    });

    if (this.prevState.__typename === ANNOTATION_TYPES.IMAGE) {
      this.prevState.newbie = true;
    }
    page.foliaPageLayer.addAnnotationObject(this.prevState);
    page.foliaPageLayer.commitObjectChanges(this.prevState);
    // console.log("DeletingAnnotation.undo -> create", this.prevState.id);
  }

  redo() {
    this.manager.foliaPdfViewer.page = this.prevState.page + 1;
    const page = this.manager.foliaPdfViewer.pdfViewer._pages.find(
      (page) => page.id === this.prevState.page + 1
    );
    if (!page) return;
    if (!page.foliaPageLayer) return setTimeout(() => this.redo(), 100);

    this.manager.foliaPdfViewer.pdfViewer.scrollPageIntoView({
      pageNumber: this.prevState.page + 1,
      destArray: [null, { name: "XYZ" }, this._location.left, this._location.top, this._location.scale / 100],
      allowNegativeOffset: true,
    });

    const annoObject = page.foliaPageLayer.annotationObjects.get(this.prevState.id);
    if (!annoObject) return;
    page.foliaPageLayer.deleteAnnotationObject(annoObject);
    // console.log("DeletingAnnotation.redo -> delete", this.prevState.id);
  }
}

class ToolUndoRedo {
  constructor(undoRedoManager, prevState, newState) {
    this.manager = undoRedoManager;
    this.prevState = prevState;
    this.newState = newState;
    this._location = this.manager.foliaPdfViewer.pdfViewer._location;
  }

  undo() {
    this.manager.foliaPdfViewer.page = this.prevState.page + 1;
    const page = this.manager.foliaPdfViewer.pdfViewer._pages.find(
      (page) => page.id === this.prevState.page + 1
    );
    if (!page) return;
    if (!page.foliaPageLayer) return setTimeout(() => this.undo(), 100);

    this.manager.foliaPdfViewer.pdfViewer.scrollPageIntoView({
      pageNumber: this.prevState.page + 1,
      destArray: [null, { name: "XYZ" }, this._location.left, this._location.top, this._location.scale / 100],
      allowNegativeOffset: true,
    });

    const builder = page.foliaPageLayer.annotationBuilder;
    if (!builder) return;
    builder.applyUndoRedo(this.prevState.data);
  }

  redo() {
    this.manager.foliaPdfViewer.page = this.prevState.page + 1;
    const page = this.manager.foliaPdfViewer.pdfViewer._pages.find(
      (page) => page.id === this.prevState.page + 1
    );
    if (!page) return;
    if (!page.foliaPageLayer) return setTimeout(() => this.undo(), 100);

    this.manager.foliaPdfViewer.pdfViewer.scrollPageIntoView({
      pageNumber: this.prevState.page + 1,
      destArray: [null, { name: "XYZ" }, this._location.left, this._location.top, this._location.scale / 100],
      allowNegativeOffset: false,
    });

    const builder = page.foliaPageLayer.annotationBuilder;
    if (!builder) return;
    builder.applyUndoRedo(this.newState.data);
  }
}

export class UndoRedo {
  constructor(foliaPdfViewer) {
    this.foliaPdfViewer = foliaPdfViewer;
    this.undoStack = [];
    this.redoStack = [];
  }

  creatingObject(objectData) {
    const command = new CreatingAnnotation(this, objectData);
    // this.undoStack = [...this.undoStack.filter((item) => !(item instanceof ToolUndoRedo)), command];
    this.undoStack.push(command);
    this.redoStack = [];
    this.updateUI();
  }

  updatingObject(previousData, nextData) {
    const command = new UpdatingAnnotation(this, previousData, nextData);
    this.undoStack.push(command);
    this.redoStack = [];
    this.updateUI();
  }

  deletingObject(objectData) {
    const command = new DeletingAnnotation(this, objectData);
    this.undoStack.push(command);
    this.redoStack = [];
    this.updateUI();
  }

  addToolStep(previousData, nextData) {
    const command = new ToolUndoRedo(this, previousData, nextData);
    this.undoStack.push(command);
    this.redoStack = [];
    this.updateUI();
  }

  undo() {
    const command = this.undoStack.pop();
    if (!command) return false;
    this.redoStack.push(command);
    command.undo();
    this.updateUI();
    return true;
  }

  redo() {
    const command = this.redoStack.pop();
    if (!command) return false;
    this.undoStack.push(command);
    command.redo();
    this.updateUI();
    return true;
  }

  replaceObjectsId(oldId, newId) {
    for (const cmd of this.undoStack) {
      if (cmd instanceof CreatingAnnotation) {
        if (cmd.state.id === oldId) cmd.state.id = newId;
      } else if (cmd instanceof UpdatingAnnotation) {
        if (cmd.prevState.id === oldId) cmd.prevState.id = newId;
        if (cmd.newState.id === oldId) cmd.newState.id = newId;
      } else if (cmd instanceof DeletingAnnotation) {
        if (cmd.prevState.id === oldId) cmd.prevState.id = newId;
      }
    }
    for (const cmd of this.redoStack) {
      if (cmd instanceof CreatingAnnotation) {
        if (cmd.state.id === oldId) cmd.state.id = newId;
      } else if (cmd instanceof UpdatingAnnotation) {
        if (cmd.prevState.id === oldId) cmd.prevState.id = newId;
        if (cmd.newState.id === oldId) cmd.newState.id = newId;
      } else if (cmd instanceof DeletingAnnotation) {
        if (cmd.prevState.id === oldId) cmd.prevState.id = newId;
      }
    }
  }

  removeToolUndoRedoItems() {
    this.undoStack = this.undoStack.filter((item) => !(item instanceof ToolUndoRedo));
    this.redoStack = this.redoStack.filter((item) => !(item instanceof ToolUndoRedo));
  }

  updateUI() {
    this.foliaPdfViewer.eventBus.dispatch("undo-redo-changed", {
      canUndo: this.undoStack.length > 0,
      canRedo: this.redoStack.length > 0,
    });
  }
}
