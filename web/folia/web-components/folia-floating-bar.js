import { foliaDateFormat } from "../folia-util";
import { colord } from "colord";
import foliaFloatingBarHtml from "./folia-floating-bar.html";
import { ANNOTATION_TYPES } from "../constants";

const FONT_FAMILY = {
  SANS_SERIF: "SANS_SERIF",
  SERIF: "SERIF",
  MONOSPACE: "MONOSPACE",
  SCRIPT: "SCRIPT",
  FANTASY: "FANTASY",
};

const FONT_NAMES = {
  SANS_SERIF: "Sans serif",
  SERIF: "Serif",
  MONOSPACE: "Monospace",
  SCRIPT: "Script",
  FANTASY: "Fantasy",
};

const TEXT_ALIGNMENT = {
  START: "START",
  CENTER: "CENTER",
  END: "END",
};

const FONT_WEIGHT = {
  W400: "W400",
  W600: "W600",
};

const FONT_SIZES = [
  { value: "8", text: "8" },
  { value: "10", text: "10" },
  { value: "12", text: "12" },
  { value: "14", text: "14" },
  { value: "16", text: "16" },
  { value: "18", text: "18" },
  { value: "20", text: "20" },
  { value: "24", text: "24" },
  { value: "36", text: "36" },
  { value: "48", text: "48" },
  { value: "64", text: "64" },
  { value: "72", text: "72" },
  { value: "96", text: "96" },
  { value: "144", text: "144" },
];

const FONT_FAMILIES = [
  { value: FONT_FAMILY.SANS_SERIF, text: "Sans serif" },
  { value: FONT_FAMILY.SERIF, text: "Serif" },
  { value: FONT_FAMILY.MONOSPACE, text: "Monospace" },
  { value: FONT_FAMILY.SCRIPT, text: "Script" },
  { value: FONT_FAMILY.FANTASY, text: "Fantasy" },
];

const FONT_FAMILY_PANEL = "FONT_FAMILY_PANEL";
const FONT_SIZE_PANEL = "FONT_SIZE_PANEL";
const COLOR_PANEL = "COLOR_PANEL";
const STROKE_PANEL = "STROKE_PANEL";
const INFO_PANEL = "INFO_PANEL";
const NO_PANEL = "NO_PANEL";

class FoliaFloatingBar extends HTMLElement {
  #objectData;
  #eventBus;
  #openedPanel;
  #color;
  #lineWidth;
  #opacity;
  #fontWeight;
  #textAlignment;
  #fontFamily;
  #fontSize;

  onMouseDownBinded = this.onMouseDown.bind(this);
  onClickBinded = this.onClick.bind(this);
  strokeSliderOnInputBinded = this.strokeSliderOnInput.bind(this);
  opacitySliderOnInputBinded = this.opacitySliderOnInput.bind(this);
  fontFamilyInputBinded = this.fontFamilyInput.bind(this);
  fontSizeInputBinded = this.fontSizeInput.bind(this);

  constructor() {
    super();
    const template = document.createElement("template");
    template.innerHTML = foliaFloatingBarHtml;
    this.attachShadow({ mode: "open" });
    this.shadowRoot.appendChild(template.content.cloneNode(true));
    this.selectedAnnotationsData = null;
  }

  static get observedAttributes() {
    return [];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    switch (name) {
      default:
        break;
    }
  }

  connectedCallback() {
    this.shadowRoot.addEventListener("mousedown", this.onMouseDownBinded, { passive: false });
    this.shadowRoot.addEventListener("click", this.onClickBinded, { passive: false });
    this.bar = this.shadowRoot.querySelector(".folia-floating-bar");

    this.duplicateBtn = this.shadowRoot.querySelector('folia-button[name="duplicate"]');
    this.stampBtn = this.shadowRoot.querySelector('folia-button[name="create_stamp"]');
    this.deleteBtn = this.shadowRoot.querySelector('folia-button[name="delete"]');
    this.infoBtn = this.shadowRoot.querySelector('folia-button[name="info"]');
    this.strokeBtn = this.shadowRoot.querySelector('folia-button[name="stroke"]');
    this.colorBtn = this.shadowRoot.querySelector('folia-button[name="color"]');
    this.boldBtn = this.shadowRoot.querySelector('folia-button[name="bold"]');
    this.alignLeftBtn = this.shadowRoot.querySelector('folia-button[name="align-left"]');
    this.alignCenterBtn = this.shadowRoot.querySelector('folia-button[name="align-center"]');
    this.alignRightBtn = this.shadowRoot.querySelector('folia-button[name="align-right"]');

    this.strokePanel = this.shadowRoot.querySelector(".folia-floating-bar-stroke-panel");
    this.colorPanel = this.shadowRoot.querySelector(".folia-floating-bar-color-panel");
    this.infoPanel = this.shadowRoot.querySelector(".folia-floating-bar-info-panel");

    this.addedAt = this.shadowRoot.getElementById("added-at");
    this.collaboratorName = this.shadowRoot.getElementById("collaborator-name");
    this.strokeWidth = this.shadowRoot.getElementById("stroke-width");
    this.opacityValue = this.shadowRoot.getElementById("opacity-value");

    this.strokeSlider = this.shadowRoot.getElementById("stroke-slider");
    this.opacitySlider = this.shadowRoot.getElementById("opacity-slider");
    this.strokeSlider.addEventListener("input", this.strokeSliderOnInputBinded);
    this.opacitySlider.addEventListener("input", this.opacitySliderOnInputBinded);

    this.fontFamilyDropDown = this.shadowRoot.querySelector('folia-drop-down[name="font-family"]');
    this.fontSizeDropDown = this.shadowRoot.querySelector('folia-drop-down[name="font-size"]');
    // console.log(">>>>", this.fontFamilyDropDown, this.fontSizeDropDown);
    this.fontFamilyDropDown.addEventListener("input", this.fontFamilyInputBinded);
    this.fontSizeDropDown.addEventListener("input", this.fontSizeInputBinded);
  }

  disconnectedCallback() {
    this.shadowRoot.removeEventListener("mousedown", this.onMouseDownBinded, { passive: false });
    this.shadowRoot.removeEventListener("click", this.onClickBinded, { passive: false });
    this.strokeSlider.removeEventListener("input", this.strokeSliderOnInputBinded);
    this.opacitySlider.removeEventListener("input", this.opacitySliderOnInputBinded);
    this.fontFamilyDropDown.removeEventListener("input", this.fontFamilyInputBinded);
    this.fontSizeDropDown.removeEventListener("input", this.fontSizeInputBinded);
  }

  hide() {
    // console.log("hide objectData");
    this.colorPanel.classList.toggle("shown", false);
    this.strokePanel.classList.toggle("shown", false);
    this.infoPanel.classList.toggle("shown", false);
    this.bar.classList.toggle("shown", false);
    this.bar.classList.toggle("trasparent", false);
  }

  show(objects, zoomScale) {
    // console.log("show objectData", objects);
    this.selectedAnnotationsData = { objects, zoomScale };
    this.zoomScale = zoomScale;
    this.openedPanel = null;
    const padding = 20;
    let left = Infinity,
      top = Infinity,
      right = -Infinity,
      bottom = -Infinity,
      pageWidth = 0,
      pageHeigth = 0,
      isFontDependent = false,
      isStrokeDependent = false,
      isColorDependent = false,
      isHighlightDependent = false;

    for (const object of objects) {
      const {
        __typename,
        id,
        color,
        lineWidth,
        fontWeight,
        textAlignment,
        fontFamily,
        fontSize,
        viewport,
        collaboratorName,
        addedAt,
        zoomScale = 1,
        bounds: { points },
      } = object;
      left = Math.min(left, Math.min(...points.map((point) => point.x)));
      top = Math.min(top, Math.min(...points.map((point) => point.y)));
      right = Math.max(right, Math.max(...points.map((point) => point.x)));
      bottom = Math.max(bottom, Math.max(...points.map((point) => point.y)));

      pageWidth = viewport.width;
      pageHeigth = viewport.height;
      this.collaboratorName.innerText = collaboratorName;
      this.addedAt.innerText = foliaDateFormat(addedAt);

      isHighlightDependent = isHighlightDependent || __typename === ANNOTATION_TYPES.HIGHLIGHT;

      if (color) {
        isColorDependent = true;
        this.color = color;
      }
      if (lineWidth) {
        isStrokeDependent = true;
        this.lineWidth = lineWidth;
      }
      if (fontWeight) {
        isFontDependent = true;
        this.fontWeight = fontWeight;
      }
      if (textAlignment) this.textAlignment = textAlignment;
      if (fontFamily) this.fontFamily = fontFamily;
      if (fontSize) this.fontSize = fontSize;

      this.stampData = { id, viewport, zoomScale: this.zoomScale };
    }

    this.bar.classList.toggle("trasparent", true);
    this.shadowRoot.querySelectorAll(".text-box-property").forEach((el) => {
      el.classList.toggle("shown", isFontDependent);
    });
    this.shadowRoot.querySelectorAll(".stroke-property").forEach((el) => {
      el.classList.toggle("shown", isStrokeDependent);
    });
    this.shadowRoot.querySelectorAll(".color-property").forEach((el) => {
      el.classList.toggle("shown", isColorDependent);
    });
    this.shadowRoot.querySelectorAll('[data-role="duplicate"]').forEach((el) => {
      el.classList.toggle("hidden", isHighlightDependent);
    });
    this.shadowRoot.querySelectorAll('[data-role="make-as-a-stamp"]').forEach((el) => {
      el.classList.toggle("hidden", isHighlightDependent || objects.length > 1);
    });

    setTimeout(() => {
      const barWidth = this.bar.clientWidth;
      const barHeight = this.bar.clientHeight;
      const colorPanelHeight = this.colorPanel.clientHeight;

      if (right + barWidth + padding < pageWidth) {
        this.bar.style.left = right + padding + "px";
        this.bar.style.top = top + (bottom - top) / 2 - barHeight / 2 + "px";
        // left middle
      } else if (left - barWidth - padding > 0) {
        this.bar.style.left = left - barWidth - padding + "px";
        this.bar.style.top = top + (bottom - top) / 2 - barHeight / 2 + "px";
        // right middle
      } else if (bottom + padding + barHeight + colorPanelHeight < pageHeigth) {
        this.bar.style.left = left + (right - left) / 2 - barWidth / 2 + "px";
        this.bar.style.top = bottom + padding + "px";
        // middle bottom
      } else if (top - padding - barHeight > 0) {
        this.bar.style.left = left + (right - left) / 2 - barWidth / 2 + "px";
        this.bar.style.top = top - padding - barHeight + "px";
        // middle top
      } else {
        this.bar.style.left = pageWidth / 2 - barWidth / 2 + "px";
        this.bar.style.top = pageHeigth / 2 - barHeight / 2 + "px";
        // middle middle
      }
      this.bar.classList.toggle("shown", true);

      // pointing for tooltips to show on the bottom side when is not enough height to show on top
      this.shadowRoot.querySelectorAll("folia-button").forEach((btn) => {
        const topEdge = this.bar.offsetTop - document.getElementById("viewerContainer").scrollTop;
        btn.toggleAttribute("top", topEdge >= barHeight);
      });
    }, 0);
  }

  get canDelete() {}
  set canDelete(value) {
    this.deleteBtn.toggleAttribute("disabled", !value);
  }

  get canManage() {}
  set canManage(value) {
    this.strokeBtn.toggleAttribute("disabled", !value);
    this.colorBtn.toggleAttribute("disabled", !value);
    this.duplicateBtn.toggleAttribute("disabled", !value);
    // this.stampBtn.toggleAttribute("disabled", !value);
    this.boldBtn.toggleAttribute("disabled", !value);
    this.alignLeftBtn.toggleAttribute("disabled", !value);
    this.alignCenterBtn.toggleAttribute("disabled", !value);
    this.alignRightBtn.toggleAttribute("disabled", !value);
    this.fontFamilyDropDown.toggleAttribute("disabled", !value);
    this.fontSizeDropDown.toggleAttribute("disabled", !value);
  }

  get eventBus() {
    return null;
  }
  set eventBus(value) {
    this.#eventBus = value;
  }

  get openedPanel() {
    return this.#openedPanel;
  }
  set openedPanel(value) {
    // console.log("set openedPanel", value);
    switch (value) {
      case STROKE_PANEL:
        this.strokeBtn.toggleAttribute("selected", true);
        this.colorBtn.toggleAttribute("selected", false);
        this.infoBtn.toggleAttribute("selected", false);

        this.strokePanel.classList.toggle("shown", true);
        this.colorPanel.classList.toggle("shown", false);
        this.infoPanel.classList.toggle("shown", false);
        break;
      case COLOR_PANEL:
        this.strokeBtn.toggleAttribute("selected", false);
        this.colorBtn.toggleAttribute("selected", true);
        this.infoBtn.toggleAttribute("selected", false);

        this.strokePanel.classList.toggle("shown", false);
        this.colorPanel.classList.toggle("shown", true);
        this.infoPanel.classList.toggle("shown", false);
        break;
      case INFO_PANEL:
        this.strokeBtn.toggleAttribute("selected", false);
        this.colorBtn.toggleAttribute("selected", false);
        this.infoBtn.toggleAttribute("selected", true);

        this.strokePanel.classList.toggle("shown", false);
        this.colorPanel.classList.toggle("shown", false);
        this.infoPanel.classList.toggle("shown", true);
        break;
      case FONT_FAMILY_PANEL:
        this.strokeBtn.toggleAttribute("selected", false);
        this.colorBtn.toggleAttribute("selected", false);
        this.infoBtn.toggleAttribute("selected", false);

        this.strokePanel.classList.toggle("shown", false);
        this.colorPanel.classList.toggle("shown", false);
        this.infoPanel.classList.toggle("shown", false);
        break;
      case FONT_SIZE_PANEL:
        this.strokeBtn.toggleAttribute("selected", false);
        this.colorBtn.toggleAttribute("selected", false);
        this.infoBtn.toggleAttribute("selected", false);

        this.strokePanel.classList.toggle("shown", false);
        this.colorPanel.classList.toggle("shown", false);
        this.infoPanel.classList.toggle("shown", false);
        break;
      default:
        this.strokeBtn.toggleAttribute("selected", false);
        this.colorBtn.toggleAttribute("selected", false);
        this.infoBtn.toggleAttribute("selected", false);

        this.strokePanel.classList.toggle("shown", false);
        this.colorPanel.classList.toggle("shown", false);
        this.infoPanel.classList.toggle("shown", false);
        break;
    }
    this.#openedPanel = value;
  }

  get lineWidth() {
    return this.#lineWidth;
  }
  set lineWidth(lineWidth) {
    this.#lineWidth = parseInt(lineWidth, 10);
    this.strokeSlider.value = this.#lineWidth;
    this.strokeWidth.innerText = "" + this.#lineWidth;

    const { min, max, value } = this.strokeSlider;
    const strokePercentValue = (value * 100) / (max - min);
    this.strokeSlider.style.setProperty("--color", "#FFFFFF");
    // prettier-ignore
    const stokeBackground = `linear-gradient(90deg, #64748B 0%, #64748B ${strokePercentValue - 5}%, #E2E8F0 ${strokePercentValue - 5}% 100%)`;
    this.strokeSlider.style.setProperty("background", stokeBackground);
  }

  get color() {
    return colord(this.#color)
      .alpha(this.#opacity / 100)
      .toHex();
  }
  set color(value) {
    // console.log("set color", value);
    const alpha = parseInt(colord(value).alpha() * 100, 10);
    const justColor = colord(value).alpha(1).toHex();
    this.#color = value;
    this.#opacity = alpha;

    this.colorBtn.setAttribute("color", value);

    this.opacitySlider.value = alpha;
    this.opacityValue.innerText = `${alpha}%`;

    // prettier-ignore
    const opacityBackground = `linear-gradient(90deg, rgba(0, 0, 0, 0) 0%, ${justColor} ${alpha - 5}%, #E2E8F0 ${alpha - 5}% 100%)`;
    this.opacitySlider.style.setProperty("--color", justColor);
    this.opacitySlider.style.setProperty("background", opacityBackground);

    this.shadowRoot.querySelectorAll(".color-button").forEach((button) => {
      const parent = button.parentNode;
      let color = colord(this.#color).alpha(1).toHex();
      const buttonColor = button.style.getPropertyValue("--color");
      parent.classList.toggle("selected", buttonColor === color);
    });
  }

  get fontWeight() {
    return this.#fontWeight;
  }
  set fontWeight(value) {
    this.#fontWeight = value;
    this.boldBtn.toggleAttribute("selected", this.#fontWeight === FONT_WEIGHT.W600);
  }

  get textAlignment() {
    return this.#textAlignment;
  }
  set textAlignment(value) {
    this.#textAlignment = value;
    this.alignLeftBtn.toggleAttribute("selected", this.#textAlignment === TEXT_ALIGNMENT.START);
    this.alignCenterBtn.toggleAttribute("selected", this.#textAlignment === TEXT_ALIGNMENT.CENTER);
    this.alignRightBtn.toggleAttribute("selected", this.#textAlignment === TEXT_ALIGNMENT.END);
  }

  get fontFamily() {
    return this.#fontFamily;
  }
  set fontFamily(value) {
    this.#fontFamily = value;
    this.fontFamilyDropDown.setAttribute("value", this.#fontFamily);
  }

  get fontSize() {
    return this.#fontSize;
  }
  set fontSize(value) {
    this.#fontSize = value;
    this.fontSizeDropDown.setAttribute("value", this.#fontSize);
  }

  fontFamilyInput(e) {
    this.fontFamily = e.data;
    this.onChange("fontFamily", e.data);
  }
  fontSizeInput(e) {
    this.fontSize = e.data;
    this.onChange("fontSize", parseInt(e.data, 10));
  }

  strokeSliderOnInput(e) {
    this.lineWidth = parseInt(e.target.value, 10);
    this.strokeWidth.innerText = `${this.lineWidth}`;
    this.onChange("lineWidth", this.lineWidth);
  }
  opacitySliderOnInput(e) {
    let color = colord(this.color)
      .alpha(e.target.value / 100)
      .toHex()
      .toLowerCase();

    color += color.length === 7 ? "ff" : "";
    this.color = color;
    this.onChange("color", color);
  }

  onMouseDown(e) {
    e.stopPropagation();
  }
  onClick(e) {
    const role = e.target.dataset["role"];
    const value = e.target.dataset["value"];

    if (e.target.hasAttribute("disabled")) return;

    switch (role) {
      case "stroke-width": {
        this.openedPanel = this.openedPanel === STROKE_PANEL ? NO_PANEL : STROKE_PANEL;
        break;
      }
      case "anno-color": {
        this.openedPanel = this.openedPanel === COLOR_PANEL ? NO_PANEL : COLOR_PANEL;
        break;
      }
      case "show-info": {
        this.openedPanel = this.openedPanel === INFO_PANEL ? NO_PANEL : INFO_PANEL;
        break;
      }
      case "font-family-panel": {
        this.openedPanel = this.openedPanel === FONT_FAMILY_PANEL ? NO_PANEL : FONT_FAMILY_PANEL;
        break;
      }
      case "font-size-panel": {
        this.openedPanel = this.openedPanel === FONT_SIZE_PANEL ? NO_PANEL : FONT_SIZE_PANEL;
        break;
      }
      case "duplicate": {
        this.openedPanel = NO_PANEL;
        this.#eventBus.dispatch("duplicate-selected-objects");
        break;
      }
      case "make-as-a-stamp": {
        this.openedPanel = NO_PANEL;
        // console.log("make-as-a-stamp", this.stampData);
        this.#eventBus.dispatch("make-as-a-stamp", this.stampData);
        this.#eventBus.dispatch("reset-objects-selection");
        break;
      }
      case "delete": {
        this.openedPanel = NO_PANEL;
        this.#eventBus.dispatch("delete-selected-objects");
        break;
      }
      case "choose-color": {
        let color = colord(window.getComputedStyle(e.target).backgroundColor)
          .alpha(this.#opacity / 100)
          .toHex()
          .toLowerCase();

        color += color.length === 7 ? "ff" : "";
        this.color = color;
        this.onChange("color", color);
        break;
      }
      case "bold": {
        this.openedPanel = NO_PANEL;
        this.fontWeight = this.fontWeight === FONT_WEIGHT.W400 ? FONT_WEIGHT.W600 : FONT_WEIGHT.W400;
        this.onChange("fontWeight", this.fontWeight);
        break;
      }
      case "align-left": {
        this.openedPanel = NO_PANEL;
        this.textAlignment = TEXT_ALIGNMENT.START;
        this.onChange("textAlignment", this.textAlignment);
        break;
      }
      case "align-center": {
        this.openedPanel = NO_PANEL;
        this.textAlignment = TEXT_ALIGNMENT.CENTER;
        this.onChange("textAlignment", this.textAlignment);
        break;
      }
      case "align-right": {
        this.openedPanel = NO_PANEL;
        this.textAlignment = TEXT_ALIGNMENT.END;
        this.onChange("textAlignment", this.textAlignment);
        break;
      }
      case "font-family": {
        this.openedPanel = NO_PANEL;
        this.fontFamily = value;
        this.onChange("fontFamily", this.fontFamily);
        break;
      }
      case "font-size": {
        this.openedPanel = NO_PANEL;
        this.fontSize = parseInt(value, 10);
        this.onChange("fontSize", this.fontSize);
        break;
      }
      case "comment_thread":{
        this.#eventBus.dispatch("attach-comment-for-annotation", this.selectedAnnotationsData);
        break;
      }
      default:
        break;
    }
  }
}

if ("customElements" in window) {
  customElements.define("folia-floating-bar", FoliaFloatingBar);
} else {
  throw new Error("Custom html element <folia-floating-bar> is not supported.");
}

export default FoliaFloatingBar;
