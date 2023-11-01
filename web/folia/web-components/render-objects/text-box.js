import BaseAnnoObject from "./base";
import { fromPdfRect, hexColor2RGBA, toPdfRect } from "../../folia-util";
import {
  FONT_FAMILY,
  FONT_WEIGHT,
  TEXT_ALIGNMENT,
  ROLE_OBJECT,
  CORNER_CLASSES,
  ROLE_EDITOR,
  ROLE_TEXTBOX_LEFT_TOP,
  ROLE_TEXTBOX_RIGHT_TOP,
  ROLE_TEXTBOX_LEFT_BOTTOM,
  ROLE_TEXTBOX_RIGHT_BOTTOM,
} from "../../constants";

class TextBoxObject extends BaseAnnoObject {
  static placeholderText = "Type something";

  lineWidth = 0;
  color;
  text;
  fontFamily;
  fontSize;
  fontWeight;
  textAlignment;
  rect;

  onKeyDownBinded = this.onKeyDown.bind(this);

  constructor(annoData, viewport, eventBus) {
    super(annoData, viewport, eventBus);

    const { color, text, fontFamily, fontSize, fontWeight, textAlignment, rect } = annoData;

    this.lineWidth = 0;
    this.color = color;
    this.text = text;
    this.fontFamily = fontFamily;
    this.fontSize = fontSize;
    this.fontWeight = fontWeight;
    this.textAlignment = textAlignment;
    this.rect = rect;
    this.no_corners = true;
  }

  update(annoData) {
    if (super.update(annoData)) {
      const {
        color = this.color,
        text = this.text,
        fontFamily = this.fontFamily,
        fontSize = this.fontSize,
        fontWeight = this.fontWeight,
        textAlignment = this.textAlignment,
        rect = this.rect,
      } = annoData;

      this.color = color;
      this.text = text;
      this.fontFamily = fontFamily;
      this.fontSize = fontSize;
      this.fontWeight = fontWeight;
      this.textAlignment = textAlignment;
      this.rect = rect;

      this.editorEl.innerText = this.text;
    }

    if (this.editorEl) {
      this.editorEl.style.color = hexColor2RGBA(this.color);
      const fontSize = this.fontSize * this.viewport.scale;
      this.editorEl.style.fontSize = `${fontSize}px`;
      this.editorEl.style.textAlign = TEXT_ALIGNMENT[this.textAlignment];
      this.editorEl.style.fontWeight = FONT_WEIGHT[this.fontWeight];
      this.editorEl.style.fontFamily = FONT_FAMILY[this.fontFamily];
      this.editorEl.style.lineHeight = "140%";
      this.adjustHeight();
    }
  }

  toObjectData() {
    return {
      ...super.toObjectData(),
      color: this.color,
      text: this.text,
      fontFamily: this.fontFamily,
      fontSize: this.fontSize,
      fontWeight: this.fontWeight,
      textAlignment: this.textAlignment,
      rect: this.rect,
    };
  }

  toFloatingBarData() {
    return {
      ...super.toFloatingBarData(),
      bounds: this.getBoundingRect(),
      fontFamily: this.fontFamily,
      fontSize: this.fontSize,
      fontWeight: this.fontWeight,
      textAlignment: this.textAlignment,
      color: this.color,
    };
  }

  render(canvas) {
    // console.log("textbox::render");
  }

  renderUI(uiContainer) {
    super.renderUI(uiContainer);

    if (!this.editorEl) {
      const editorEl = document.createElement("div");
      editorEl.className = "text-box";
      editorEl.innerText = this.text;
      editorEl.setAttribute("data-id", `${this.id}`);
      editorEl.setAttribute("data-role", ROLE_OBJECT);
      editorEl.setAttribute("text-box-placeholder", TextBoxObject.placeholderText);
      editorEl.style.lineHeight = "140%";

      editorEl.oninput = (e) => {
        this.changeManually({
          addedAt: new Date().toISOString(),
          text: e.target.innerText,
        });
        this.adjustHeight();
      };

      editorEl.onpaste = (e) => {
        e.preventDefault();
        e.target.innerText = e.clipboardData.getData("text/plain");
        this.changeManually({
          addedAt: new Date().toISOString(),
          text: e.target.innerText,
        });
        this.adjustHeight();
      };

      editorEl.onkeydown = (e) => {
        if ((e.ctrlKey === true || e.metaKey === true) && e.key === "Enter") {
          e.preventDefault();
          this.stopEditMode();
        }
      };

      this.editorEl = this.annotationUI.appendChild(editorEl);
      this.calculateMinTextHeight(TextBoxObject.placeholderText);
      this.adjustHeight();

      const cornersRoles = [
        ROLE_TEXTBOX_LEFT_TOP,
        ROLE_TEXTBOX_RIGHT_TOP,
        ROLE_TEXTBOX_LEFT_BOTTOM,
        ROLE_TEXTBOX_RIGHT_BOTTOM,
      ];
      for (const cornerRole of cornersRoles) {
        const cornerClass = CORNER_CLASSES[cornerRole];
        let corner = this.annotationUI.querySelector(`div.${cornerClass}`);
        if (!corner) {
          corner = document.createElement("div");
          corner.setAttribute("data-role", cornerRole);
          corner.className = `corner-div ${cornerClass}`;
          corner.onmousedown = this.onMouseDownBinded;
          switch (cornerRole) {
            case ROLE_TEXTBOX_LEFT_TOP: {
              this.corner_lt = this.annotationUI.appendChild(corner);
              break;
            }
            case ROLE_TEXTBOX_RIGHT_TOP: {
              this.corner_rt = this.annotationUI.appendChild(corner);
              break;
            }
            case ROLE_TEXTBOX_LEFT_BOTTOM: {
              this.corner_lb = this.annotationUI.appendChild(corner);
              break;
            }
            case ROLE_TEXTBOX_RIGHT_BOTTOM: {
              this.corner_rb = this.annotationUI.appendChild(corner);
              break;
            }
            default:
              break;
          }
        }
      }
    }

    const fontSize = this.fontSize * this.viewport.scale;
    this.editorEl.style.color = hexColor2RGBA(this.color);
    this.editorEl.style.fontSize = `${fontSize}px`;
    this.editorEl.style.textAlign = TEXT_ALIGNMENT[this.textAlignment];
    this.editorEl.style.fontWeight = FONT_WEIGHT[this.fontWeight];
    this.editorEl.style.fontFamily = FONT_FAMILY[this.fontFamily];
    this.adjustHeight();
  }

  getBoundingRect() {
    const rect = fromPdfRect(this.rect, this.viewport.width, this.viewport.height);
    return {
      left: rect[0],
      top: rect[1],
      width: rect[2],
      height: rect[3],
      right: rect[0] + rect[2],
      bottom: rect[1] + rect[3],
    };
  }

  onKeyDown(e) {
    if (e.key === "Escape") {
      this.text = this.prevState.text;
      this.addedAt = this.prevState.addedAt;
      this.editorEl.innerText = this.prevState.text;
      this.adjustHeight();
      this.stopEditMode();
    } else if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      this.stopEditMode();
    }
  }

  makeUnselected() {
    this.stopEditMode();
    super.makeUnselected();
    if (this.text.length === 0) this.changeManually({ deletedAt: new Date().toISOString() });
  }

  startEditMode() {
    if (!this.canManage) return;

    this.editorEl.setAttribute("data-role", ROLE_EDITOR);
    this.editorEl.style.cursor = "text";
    this.editorEl.style.userSelect = "default";
    this.editorEl.toggleAttribute("contenteditable", true);
    this.editorEl.addEventListener("keydown", this.onKeyDownBinded, { passive: false });
    this.editorEl.focus();

    this.prevState = this.toObjectData();
  }

  stopEditMode() {
    this.editorEl.setAttribute("data-role", ROLE_OBJECT);
    this.editorEl.style.cursor = "grab";
    this.editorEl.style.userSelect = "none";
    this.editorEl.removeEventListener("keydown", this.onKeyDownBinded, { passive: false });
    this.editorEl.toggleAttribute("contenteditable", false);
    // this.foliaPageLayer.undoRedoManager.updatingObject(this.prevState, this.newState);
  }

  calculateMinTextHeight(text) {
    const fontSize = this.fontSize * this.viewport.scale;
    const fontFamily = FONT_FAMILY[this.fontFamily];
    const fontWeight = FONT_WEIGHT[this.fontWeight];

    const canvas = document.createElement("canvas");
    canvas.width = this.viewport.width;
    canvas.height = this.viewport.height;
    const ctx = canvas.getContext("2d");
    ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
    const textRect = ctx.measureText(text);
    this.minWidth = textRect.width;
    this.minHeight = textRect.fontBoundingBoxAscent + textRect.fontBoundingBoxDescent;
  }

  adjustHeight() {
    this.editorEl.style.height = "auto";
    const height = this.editorEl.scrollHeight;
    this.editorEl.style.height = height + "px";
    this.annotationUI.style.height = height + "px";

    const rect = toPdfRect(
      [this.annotationUI.offsetLeft, this.annotationUI.offsetTop, this.annotationUI.clientWidth, height],
      this.viewport.width,
      this.viewport.height
    );
    this.rect[3] = rect[3];
  }

  resize(deltaX, deltaY, corner) {
    super.resize(deltaX, deltaY, corner);
    this.adjustHeight();
    const annoData = {
      addedAt: new Date().toISOString(),
      rect: this.rect,
    };
    this.changeManually(annoData, this.startPosition.objectData);
  }
}

export default TextBoxObject;
