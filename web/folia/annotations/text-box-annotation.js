import { toPdfRect, hexColor2RGBA } from "../folia-util";
import { FOLIA_LAYER_ROLES } from "../folia-page-layer";
import FoliaBaseAnnotation from "./base-annotation";
import { ANNOTATION_TYPES, FONT_FAMILY, FONT_WEIGHT, TEXT_ALIGNMENT } from "../constants";

class FoliaTextBoxAnnotation extends FoliaBaseAnnotation {
  editablePropertiesList = ["color", "rect", "text", "fontSize", "fontFamily", "fontWeight", "textAlignment"];
  editable = true;
  newbie = false;
  textArea;

  constructor(...props) {
    super(...props);
    if (!this.annotationRawData.newbie && !this.annotationRawData.text) {
      this.deleteFromCanvas();
    }
    if (this.annotationRawData.newbie) {
      delete this.annotationRawData.newbie;
    }
    // console.log(this.id, this.annotationRawData);
    const textArea = document.createElement("textarea");
    textArea.placeholder = "Type something";
    textArea.className = "typewriter";
    textArea.setAttribute("disabled", "disabled");
    textArea.setAttribute("data-id", `${this.id}`);
    textArea.setAttribute("data-role", FOLIA_LAYER_ROLES.ANNOTATION_OBJECT);
    textArea.oninput = (e) => {
      this.annotationRawData.text = e.target.value;
      this.adjustHeight();
      this.markAsChanged();
    };
    textArea.onclick = (e) => e.stopPropagation();
    this.annotationDIV.appendChild(textArea);
    this.textArea = textArea;
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
    textArea.style.fontSize = `${fontSize * 0.55}px`;
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
    const {
      id,
      addedAt,
      deletedAt,
      collaboratorEmail,
      page,
      rect,
      color,
      text,
      fontFamily,
      fontSize,
      fontWeight,
      textAlignment,
    } = this.annotationRawData;
    return {
      __typename: ANNOTATION_TYPES.TEXT_BOX,
      id,
      addedAt: this.isDirty || addedAt,
      deletedAt,
      collaboratorEmail,
      page,
      color,
      text,
      fontFamily,
      fontSize,
      fontWeight,
      textAlignment,
      rect,
    };
  }

  updateRects() {
    const viewRect = [
      this.annotationDIV.offsetLeft,
      this.annotationDIV.offsetTop,
      this.annotationDIV.clientWidth,
      this.annotationDIV.clientHeight,
    ];
    this.textArea.style.width = `${this.annotationDIV.clientWidth - 4}px`;
    this.textArea.style.height = `${this.annotationDIV.clientHeight - 4}px`;

    this.annotationRawData.rect = toPdfRect(viewRect, this.viewport.width, this.viewport.height);
  }

  render() {
    super.render();
    this.textArea.value = this.annotationRawData.text;

    this.textArea.style.left = "0px";
    this.textArea.style.top = "0px";
    this.textArea.style.width = `${this.annotationDIV.clientWidth - 4}px`;
    this.textArea.style.height = `${this.annotationDIV.clientHeight - 4}px`;

    this.textArea.style.color = hexColor2RGBA(this.annotationRawData.color);
    const fontSize = this.annotationRawData.fontSize * this.viewport.scale;
    this.textArea.style.fontSize = `${fontSize * 0.55}px`;
    this.textArea.style.textAlign = TEXT_ALIGNMENT[this.annotationRawData.textAlignment];
    this.textArea.style.fontWeight = FONT_WEIGHT[this.annotationRawData.fontWeight];
    this.textArea.style.fontFamily = FONT_FAMILY[this.annotationRawData.fontFamily];
    this.adjustHeight();
  }

  startEditMode() {
    if (!this.canManage) return;
    this.textArea.removeAttribute("disabled");
    this.textArea.focus();
    this.prevState = this.getRawData();
  }
  stopEditMode() {
    this.textArea.blur();
    this.textArea.setAttribute("disabled", "disabled");
    if (!this.prevState) return;
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
