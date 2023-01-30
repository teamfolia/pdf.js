import { toPdfRect, hexColor2RGBA } from "../folia-util";
import { FOLIA_LAYER_ROLES } from "../folia-page-layer";
import FoliaBaseAnnotation from "./base-annotation";
import { ANNOTATION_TYPES } from "../constants";

const FontFamily = {
  SANS_SERIF: "Source Sans Pro",
  SERIF: "Lora",
  MONOSPACE: "Courier Prime",
  SCRIPT: "Cookie",
  FANTASY: "Eagle Lake",
};

const FontWeight = {
  W400: "normal",
  W600: "bold",
};

const TextAlignment = {
  START: "left",
  CENTER: "center",
  END: "right",
};

class FoliaTextBoxAnnotation extends FoliaBaseAnnotation {
  editablePropertiesList = ["color", "fontSize", "fontFamily", "fontWeight", "textAlignment"];
  editable = true;
  newbie = false;
  textArea;

  constructor(...props) {
    super(...props);
    if (!this.annotationRawData.newbie && !this.annotationRawData.text) {
      this.deleteFromCanvas();
    }
    const textArea = document.createElement("textarea");
    textArea.placeholder = "type something";
    textArea.className = "typewriter";
    textArea.setAttribute("data-id", `${this.id}`);
    textArea.setAttribute("data-role", FOLIA_LAYER_ROLES.ANNOTATION_OBJECT);
    textArea.oninput = (e) => {
      this.annotationRawData.text = e.target.value;
      textArea.style.height = "auto";
      const height = textArea.scrollHeight + "px";
      textArea.style.height = height;
      this.annotationDIV.style.height = height;
      this.isDirty = new Date().getTime();
    };
    textArea.onclick = (e) => {
      // console.log('text area onclick')
      e.stopPropagation();
    };
    this.annotationDIV.appendChild(textArea);
    this.textArea = textArea;
    // console.log(textArea)
    this.buildBaseCorners();
  }
  getRawData() {
    if (this.annotationRawData.text.length === 0) return;

    const viewRect = [
      this.annotationDIV.offsetLeft,
      this.annotationDIV.offsetTop,
      this.annotationDIV.clientWidth,
      this.annotationDIV.clientHeight,
    ];

    const rect = toPdfRect(viewRect, this.viewport.width, this.viewport.height);
    const {
      id,
      addedAt,
      collaboratorEmail,
      page,
      color,
      text,
      fontFamily,
      fontSize,
      fontWeight,
      textAlignment,
      deleted = false,
    } = this.annotationRawData;
    return {
      __typename: ANNOTATION_TYPES.TEXT_BOX,
      id,
      addedAt: this.isDirty || addedAt,
      collaboratorEmail,
      page,
      color,
      text,
      fontFamily,
      fontSize,
      fontWeight,
      textAlignment,
      rect,
      deleted,
    };
  }
  async render() {
    await super.render();
    this.textArea.value = this.annotationRawData.text;

    if (this.annotationRawData.newbie) {
      this.foliaPageLayer.multipleSelect.startEditMode(this);
    }
  }
  async draw() {
    // console.log("DRAW", this.annotationRawData);
    this.textArea.style.left = "0px";
    this.textArea.style.top = "0px";
    this.textArea.style.width = `${this.annotationDIV.clientWidth}px`;
    this.textArea.style.height = `${this.annotationDIV.clientHeight}px`;
    this.textArea.style.color = hexColor2RGBA(this.annotationRawData.color);
    const scale = this.annotationRawData.fontSize * this.foliaPageLayer.pdfViewerScale;
    this.textArea.style.fontSize = `${scale}px`;
    this.textArea.style.textAlign = TextAlignment[this.annotationRawData.textAlignment];
    this.textArea.style.fontWeight = FontWeight[this.annotationRawData.fontWeight];
    this.textArea.style.fontFamily = FontFamily[this.annotationRawData.fontFamily];

    this.isDirty
      ? this.annotationDIV.classList.add("changed")
      : this.annotationDIV.classList.remove("changed");
  }
  markAsUnselected() {
    super.markAsUnselected();
    this.stopEditMode();
    if (this.annotationRawData.newbie && this.textArea.value.length === 0) {
      // console.trace()
      // console.log('newbie --->', this.annotationRawData.newbie, this.textArea.value.length)
      this.foliaPageLayer.annotationObjects.delete(this.id);
    } else if (this.annotationRawData.newbie && this.textArea.value.length > 0) {
      this.foliaPageLayer.commitChanges();
    }
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
