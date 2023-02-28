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
    // console.log(this.id, this.annotationRawData);
    const textArea = document.createElement("textarea");
    textArea.placeholder = "type something";
    textArea.className = "typewriter";
    textArea.setAttribute("data-id", `${this.id}`);
    textArea.setAttribute("data-role", FOLIA_LAYER_ROLES.ANNOTATION_OBJECT);
    textArea.oninput = (e) => {
      this.annotationRawData.text = e.target.value;
      if (textArea.clientHeight < textArea.scrollHeight) {
        textArea.style.height = "auto";
        const height = textArea.scrollHeight + "px";
        textArea.style.height = height;
        this.annotationDIV.style.height = height;
        this.updateRects();
      }
      // this.isDirty = new Date().getTime();
      this.markAsChanged();
    };
    textArea.onclick = (e) => e.stopPropagation();
    this.annotationDIV.appendChild(textArea);
    this.textArea = textArea;
    this.buildBaseCorners();
  }
  getRawData() {
    if (this.annotationRawData.text.length === 0) return;

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
    this.textArea.style.width = `${this.annotationDIV.clientWidth}px`;
    this.textArea.style.height = `${this.annotationDIV.clientHeight}px`;

    this.annotationRawData.rect = toPdfRect(viewRect, this.viewport.width, this.viewport.height);
    super.updateRects();
  }

  render() {
    super.render();
    this.textArea.value = this.annotationRawData.text;

    if (this.annotationRawData.newbie) {
      // this.foliaPageLayer.multipleSelect.startEditMode(this);
      delete this.annotationRawData.newbie;
    }

    this.textArea.style.left = "0px";
    this.textArea.style.top = "0px";
    this.textArea.style.width = `${this.annotationDIV.clientWidth}px`;
    this.textArea.style.height = `${this.annotationDIV.clientHeight}px`;
    this.textArea.style.color = hexColor2RGBA(this.annotationRawData.color);
    const fontSize = this.annotationRawData.fontSize * this.viewport.scale;
    this.textArea.style.fontSize = `${fontSize * 0.55}px`;
    this.textArea.style.textAlign = TEXT_ALIGNMENT[this.annotationRawData.textAlignment];
    this.textArea.style.fontWeight = FONT_WEIGHT[this.annotationRawData.fontWeight];
    this.textArea.style.fontFamily = FONT_FAMILY[this.annotationRawData.fontFamily];
  }

  startEditMode() {
    this.textArea.focus();
  }
  stopEditMode() {
    this.textArea.blur();
  }
  get isFocused() {
    return document.activeElement === this.textArea;
  }
}

export default FoliaTextBoxAnnotation;
