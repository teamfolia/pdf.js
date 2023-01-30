import { hexColor2pdf } from "../folia-util";

class BaseBuilder {
  viewport;
  pageDiv;
  pageNumber;

  annotationType;
  annotationSubType;

  canvas;
  preset = {};

  static initialPreset = {};

  constructor(foliaPageLayer, BuildingClass) {
    this.foliaPageLayer = foliaPageLayer;
    this.viewport = foliaPageLayer.viewport.clone({ dontFlip: true });
    this.applyPreset(BuildingClass.initialPreset);
    this.asset = BuildingClass.asset;
    this.resume();
  }

  // resume() {
  //   const onceCLickListener = (e) => {
  //     if (this.annotationType === "typewriter") {
  //       this.prepareTypewriter(e);
  //     } else if (this.annotationType === "conversation") {
  //       this.prepareConversation(e);
  //     }
  //   };

  //   this.pageDiv.addEventListener("click", onceCLickListener, { once: true });
  //   this.removeOnClickListener = () => {
  //     this.pageDiv.removeEventListener("click", onceCLickListener);
  //   };
  // }

  prepareTypewriter(e) {
    const { color, fontFamily, fontSize, fontWeight, textAlign, singleCreating } = this.preset;
    const viewRect = [e.offsetX, e.offsetY, 200, 50];
    const annoData = {
      fontFamily,
      fontSize,
      fontWeight,
      textAlign,
      singleCreating,
      color: hexColor2pdf(color),
      contents: "",
      rect: viewRect2pdfRect(viewRect, this.viewport),
    };
    this.newbieAnnotationsData = [annoData];
  }

  prepareConversation(e) {
    const viewRect = [e.offsetX, e.offsetY, 50, 50];
    const annoData = {
      edited: false,
      initial_comment: "",
      rect: viewRect2pdfRect(viewRect, this.viewport),
    };
    this.newbieAnnotationsData = [annoData];
  }

  prepareAnnotations2save() {
    return [];
  }

  stop() {
    if (this.removeOnClickListener) this.removeOnClickListener();
    const collaboratorEmail = this.foliaPageLayer.dataProxy.userEmail;
    const addedAt = new Date().toISOString();
    const page = this.foliaPageLayer.pageNumber;

    for (const data of this.prepareAnnotations2save()) {
      const id = crypto.randomUUID();
      const annotation = {
        id,
        page,
        collaboratorEmail,
        addedAt,
        deleted: false,
        ...data,
      };
      const permissions = {
        canCreate: true,
        canUpdate: true,
        canDelete: true,
        canDeleteConversation: true,
        canAddReply: true,
      };

      this.foliaPageLayer.renderSingle(annotation, permissions);
      this.foliaPageLayer.dataProxy.postObject(annotation);
    }

    console.log("stop builder on page", page);
    this.foliaPageLayer.pageDiv
      .querySelectorAll(".annotation-builder-container")
      .forEach((el) => el.remove());
    this.canvas = null;
    this.newbieAnnotationsData = [];
  }

  undo() {}

  redo() {}

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
