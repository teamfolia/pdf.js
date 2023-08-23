import { toPdfRect, hexColor2RGBA, fromPdfRect } from "../folia-util";
import { FOLIA_LAYER_ROLES } from "../folia-page-layer";
import FoliaBaseAnnotation from "./base-annotation";
import { ANNOTATION_TYPES, FONT_FAMILY, FONT_WEIGHT, TEXT_ALIGNMENT } from "../constants";

class FoliaTextBoxAnnotation extends FoliaBaseAnnotation {
  editablePropertiesList = ["color", "rect", "text", "fontSize", "fontFamily", "fontWeight", "textAlignment"];
  editable = true;
  inEditMode = false;
  textArea;

  constructor(...props) {
    super(...props);
    if (this.annotationRawData.newbie) {
      delete this.annotationRawData.newbie;
    }
    this.textArea = document.createElement("textarea");
    this.textArea.placeholder = "Type something";
    this.textArea.className = "typewriter";
    this.textArea.setAttribute("disabled", "disabled");
    this.textArea.oninput = (e) => {
      this.annotationRawData.text = e.target.value;
      this.adjustHeight();
      this.markAsChanged();
    };
    this.textArea.onclick = (e) => e.stopPropagation();
    this.textArea.onmousedown = (e) => e.stopPropagation();
    this.textArea.onmousemove = (e) => e.stopPropagation();
    this.textArea.onmouseup = (e) => e.stopPropagation();

    this.lid = document.createElement("div");
    this.lid.style.position = "absolute";
    this.lid.style.left = 0;
    this.lid.style.top = 0;
    this.lid.style.right = 0;
    this.lid.style.bottom = 0;
    // this.lid.style.backgroundColor = "rgba(0, 0, 0, 0.4)";
    this.lid.setAttribute("role", "lid");
    this.lid.setAttribute("data-id", `${this.id}`);
    this.lid.setAttribute("data-role", FOLIA_LAYER_ROLES.ANNOTATION_OBJECT);

    this.annotationDIV.appendChild(this.textArea);
    this.annotationDIV.appendChild(this.lid);
    this.buildBaseCorners();
  }

  calculateMinTextHeight() {
    const fontSize = this.annotationRawData.fontSize * this.viewport.scale;
    const textArea = document.createElement("textarea");
    textArea.rows = 1;
    textArea.style.border = "dashed 1px #999999";
    textArea.style.overflow = "hidden";
    textArea.rows = 1;
    textArea.style.outline = "none";
    textArea.style.visibility = "hidden";
    textArea.style.fontFamily = FONT_FAMILY[this.annotationRawData.fontFamily];
    textArea.style.fontSize = `${fontSize}px`;
    textArea.style.fontWeight = FONT_WEIGHT[this.annotationRawData.fontWeight];
    textArea.style.height = "1em";
    this.annotationDIV.appendChild(textArea);
    this.minHeight = textArea.getBoundingClientRect().height;
  }

  adjustHeight() {
    if (this.textArea.clientHeight < this.textArea.scrollHeight) {
      this.textArea.style.height = "auto";
      const height = this.textArea.scrollHeight;
      this.textArea.style.height = height - 4 + "px";
      this.annotationDIV.style.height = height + "px";
      this.updateRects();
    }
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
    this.textArea.style.width = `${this.annotationDIV.clientWidth}px`;
    this.textArea.style.height = `${this.annotationDIV.clientHeight}px`;
  }

  render() {
    super.render();
    this.textArea.value = this.annotationRawData.text;

    this.textArea.style.left = "0px";
    this.textArea.style.top = "0px";
    this.textArea.style.width = `${this.annotationDIV.clientWidth}px`;
    this.textArea.style.height = `${this.annotationDIV.clientHeight}px`;

    this.textArea.style.color = hexColor2RGBA(this.annotationRawData.color);
    const fontSize = this.annotationRawData.fontSize * this.viewport.scale;
    this.textArea.style.fontSize = `${fontSize}px`;
    this.textArea.style.textAlign = TEXT_ALIGNMENT[this.annotationRawData.textAlignment];
    this.textArea.style.fontWeight = FONT_WEIGHT[this.annotationRawData.fontWeight];
    this.textArea.style.fontFamily = FONT_FAMILY[this.annotationRawData.fontFamily];
    this.adjustHeight();
  }

  startEditMode() {
    if (!this.canManage) return;
    this.inEditMode = true;
    this.textArea.removeAttribute("disabled");
    this.textArea.focus();
    this.prevState = this.getRawData();
    this.lid.style.display = "none";
    // this.lid.remove();
  }
  stopEditMode() {
    // this.annotationDIV.appendChild(this.lid);
    this.lid.style.display = "block";
    this.inEditMode = false;
    this.textArea.blur();
    this.textArea.setAttribute("disabled", "disabled");
    if (!this.prevState) return;
    if (!this.canManage) return;
    this.newState = this.getRawData();
    this.foliaPageLayer.undoRedoManager.updatingObject(this.prevState, this.newState);
    this.prevState = null;
    this.newState = null;
  }
  get isFocused() {
    return document.activeElement === this.textArea;
  }
}

export default FoliaTextBoxAnnotation;
