import { toPdfRect, hexColor2RGBA, fromPdfRect } from "../folia-util";
import { FOLIA_LAYER_ROLES } from "../folia-page-layer";
import FoliaBaseAnnotation from "./base-annotation";
import { ANNOTATION_TYPES, FONT_FAMILY, FONT_WEIGHT, TEXT_ALIGNMENT } from "../constants";

class FoliaTextBoxAnnotation extends FoliaBaseAnnotation {
  static placeholderText = "Type something";

  editablePropertiesList = ["color", "rect", "text", "fontSize", "fontFamily", "fontWeight", "textAlignment"];
  editable = true;
  editorEl;

  constructor(...props) {
    super(...props);
    this.onKeyDownBinded = this.onKeyDown.bind(this);

    if (this.annotationRawData.newbie) {
      delete this.annotationRawData.newbie;
    }
    this.editorEl = document.createElement("div");
    this.editorEl.className = "text-box";
    this.editorEl.innerText = this.annotationRawData.text;
    this.editorEl.setAttribute("data-id", `${this.id}`);
    this.editorEl.setAttribute("data-role", FOLIA_LAYER_ROLES.ANNOTATION_OBJECT);
    this.editorEl.setAttribute("text-box-placeholder", FoliaTextBoxAnnotation.placeholderText);
    // this.editorEl.style.backgroundColor = "rgba(0, 0, 0, 0.05)";
    this.editorEl.oninput = (e) => {
      this.annotationRawData.text = e.target.innerText;
      this.adjustHeight();
      this.markAsChanged();
    };

    this.annotationDIV.appendChild(this.editorEl);
    this.buildBaseCorners();
    this.calculateMinTextHeight(FoliaTextBoxAnnotation.placeholderText);

    this.updateRects();
  }

  onKeyDown(e) {
    if (e.key === "Escape") this.stopEditMode();
  }

  startEditMode() {
    if (!this.canManage) return;

    this.editorEl.setAttribute("data-role", FOLIA_LAYER_ROLES.ANNOTATION_EDITOR);
    this.editorEl.toggleAttribute("contenteditable", true);
    this.editorEl.addEventListener("keydown", this.onKeyDownBinded, true);

    this.prevState = this.getRawData();
    this.editorEl.focus();
  }

  stopEditMode() {
    this.editorEl.removeEventListener("keydown", this.onKeyDownBinded, true);

    this.editorEl.toggleAttribute("contenteditable", false);
    this.editorEl.setAttribute("data-role", FOLIA_LAYER_ROLES.ANNOTATION_OBJECT);
    if (!this.prevState) return;
    if (!this.canManage) return;
    this.newState = this.getRawData();
    this.foliaPageLayer.undoRedoManager.updatingObject(this.prevState, this.newState);
    this.prevState = null;
    this.newState = null;
  }

  calculateMinTextHeight(text) {
    const fontSize = this.annotationRawData.fontSize * this.viewport.scale;
    const fontFamily = FONT_FAMILY[this.annotationRawData.fontFamily];
    const fontWeight = FONT_WEIGHT[this.annotationRawData.fontWeight];

    const canvas = document.createElement("canvas");
    canvas.width = this.foliaLayer.clientWidth;
    canvas.height = this.foliaLayer.clientHeight;
    const ctx = canvas.getContext("2d");
    ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
    const textRect = ctx.measureText(text);
    this.minWidth = textRect.width;
    this.minHeight = textRect.fontBoundingBoxAscent + textRect.fontBoundingBoxDescent;
    // console.log("textRect", textRect, this.minWidth, this.minHeight);
  }

  adjustHeight() {
    this.editorEl.style.height = "auto";
    const height = this.editorEl.scrollHeight;
    this.editorEl.style.height = height + "px";
    this.annotationDIV.style.height = height + "px";
  }

  getRawData() {
    const { width: viewportWidth, height: viewportHeight } = this.viewport;
    const viewRect = [
      this.annotationDIV.offsetLeft,
      this.annotationDIV.offsetTop,
      this.annotationDIV.clientWidth,
      this.annotationDIV.clientHeight,
    ];
    const pdfRect = toPdfRect(viewRect, viewportWidth, viewportHeight);
    this.annotationRawData.rect = pdfRect;

    return {
      __typename: ANNOTATION_TYPES.TEXT_BOX,
      id: this.annotationRawData.id,
      addedAt: this.isDirty || this.annotationRawData.addedAt,
      deletedAt: this.annotationRawData.deletedAt,
      collaboratorEmail: this.annotationRawData.collaboratorEmail,
      page: this.annotationRawData.page,
      color: this.annotationRawData.color,
      text: this.annotationRawData.text,
      fontFamily: this.annotationRawData.fontFamily,
      fontSize: this.annotationRawData.fontSize,
      fontWeight: this.annotationRawData.fontWeight,
      textAlignment: this.annotationRawData.textAlignment,
      rect: pdfRect,
    };
  }

  updateRects() {
    // console.log("updateRects");
    this.adjustHeight();
    this.editorEl.style.width = `${this.annotationDIV.clientWidth}px`;
    this.editorEl.style.height = `${this.annotationDIV.clientHeight}px`;
  }

  render() {
    super.render();
    this.editorEl.innerText = this.annotationRawData.text;

    this.editorEl.style.left = "0px";
    this.editorEl.style.top = "0px";
    this.editorEl.style.width = `${this.annotationDIV.clientWidth}px`;
    this.editorEl.style.height = `${this.annotationDIV.clientHeight}px`;

    this.editorEl.style.setProperty("--annotation-color", hexColor2RGBA(this.annotationRawData.color));
    this.editorEl.style.color = hexColor2RGBA(this.annotationRawData.color);
    const fontSize = this.annotationRawData.fontSize * this.viewport.scale;
    this.editorEl.style.fontSize = `${fontSize}px`;
    this.editorEl.style.textAlign = TEXT_ALIGNMENT[this.annotationRawData.textAlignment];
    this.editorEl.style.fontWeight = FONT_WEIGHT[this.annotationRawData.fontWeight];
    this.editorEl.style.fontFamily = FONT_FAMILY[this.annotationRawData.fontFamily];
    this.adjustHeight();
  }

  get isFocused() {
    return document.activeElement === this.editorEl;
  }
}

export default FoliaTextBoxAnnotation;
