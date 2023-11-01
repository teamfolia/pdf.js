import { foliaDateFormat } from "../folia-util";
import { colord } from "colord";
import foliaFloatingBarHtml from "./folia-floating-bar.html";

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

  constructor() {
    super();
    const template = document.createElement("template");
    template.innerHTML = foliaFloatingBarHtml;
    this.attachShadow({ mode: "open" });
    this.shadowRoot.appendChild(template.content.cloneNode(true));
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
    this.strokeBtn = this.shadowRoot.querySelector(".bar-button.stroke");
    this.colorBtn = this.shadowRoot.querySelector(".bar-button.color");
    this.infoBtn = this.shadowRoot.querySelector(".bar-button.info");
    this.boldBtn = this.shadowRoot.querySelector(".bar-button.bold");
    this.alignLeftBtn = this.shadowRoot.querySelector(".bar-button.align-left");
    this.alignCenterBtn = this.shadowRoot.querySelector(".bar-button.align-center");
    this.alignRightBtn = this.shadowRoot.querySelector(".bar-button.align-right");
    this.fontFamilyBtn = this.shadowRoot.querySelector(".font-family");
    this.fontSizeBtn = this.shadowRoot.querySelector(".font-size");

    this.strokePanel = this.shadowRoot.querySelector(".folia-floating-bar-stroke-panel");
    this.colorPanel = this.shadowRoot.querySelector(".folia-floating-bar-color-panel");
    this.infoPanel = this.shadowRoot.querySelector(".folia-floating-bar-info-panel");
    this.fontFamilyPanel = this.shadowRoot.querySelector(".folia-floating-bar-font-family-panel");
    this.fontSizePanel = this.shadowRoot.querySelector(".folia-floating-bar-font-size-panel");

    this.addedAt = this.shadowRoot.getElementById("added-at");
    this.collaboratorName = this.shadowRoot.getElementById("collaborator-name");
    this.strokeWidth = this.shadowRoot.getElementById("stroke-width");
    this.opacityValue = this.shadowRoot.getElementById("opacity-value");
    this.fontFamilyValue = this.shadowRoot.getElementById("font-family-value");
    this.fontSizeValue = this.shadowRoot.getElementById("font-size-value");

    this.strokeSlider = this.shadowRoot.getElementById("stroke-slider");
    this.opacitySlider = this.shadowRoot.getElementById("opacity-slider");
    this.strokeSlider.addEventListener("input", this.strokeSliderOnInputBinded);
    this.opacitySlider.addEventListener("input", this.opacitySliderOnInputBinded);
  }

  disconnectedCallback() {
    this.shadowRoot.removeEventListener("mousedown", this.onMouseDownBinded, { passive: false });
    this.shadowRoot.removeEventListener("click", this.onClickBinded, { passive: false });
    this.strokeSlider.removeEventListener("input", this.strokeSliderOnInputBinded);
    this.opacitySlider.removeEventListener("input", this.opacitySliderOnInputBinded);
  }

  hide() {
    // console.log("hide objectData");
    this.colorPanel.classList.toggle("shown", false);
    this.strokePanel.classList.toggle("shown", false);
    this.infoPanel.classList.toggle("shown", false);
    this.bar.classList.toggle("shown", false);
    this.bar.classList.toggle("trasparent", false);
  }

  show(objects) {
    // console.log("show objectData");
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
      isColorDependent = false;

    for (const object of objects) {
      left = Math.min(left, object.bounds.left);
      top = Math.min(top, object.bounds.top);
      right = Math.max(right, object.bounds.right);
      bottom = Math.max(bottom, object.bounds.bottom);

      pageWidth = object.viewport.width;
      pageHeigth = object.viewport.height;
      this.collaboratorName.innerText = object.collaboratorName;
      this.addedAt.innerText = foliaDateFormat(object.addedAt);
      if (object.color) {
        isColorDependent = true;
        this.color = object.color;
      }
      if (object.lineWidth) {
        isStrokeDependent = true;
        this.lineWidth = object.lineWidth;
      }
      if (object.fontWeight) {
        isFontDependent = true;
        this.fontWeight = object.fontWeight;
      }
      if (object.textAlignment) this.textAlignment = object.textAlignment;
      if (object.fontFamily) this.fontFamily = object.fontFamily;
      if (object.fontSize) this.fontSize = object.fontSize;
    }

    this.bar.classList.toggle("trasparent", true);
    this.shadowRoot.querySelectorAll(".text-box-property").forEach((el) => {
      el.classList.toggle("shown", isFontDependent);
    });
    this.shadowRoot.querySelectorAll(".bar-button.stroke").forEach((el) => {
      el.classList.toggle("hidden", !isStrokeDependent);
    });
    this.shadowRoot.querySelectorAll(".color-property").forEach((el) => {
      el.classList.toggle("shown", isColorDependent);
    });

    setTimeout(() => {
      const barWidth = this.bar.clientWidth;
      const barHeight = this.bar.clientHeight;
      const colorPanelWidth = this.colorPanel.clientWidth;
      const colorPanelHeight = this.colorPanel.clientHeight;
      // console.log("show objectData", { barHeight, left, right, pageWidth });

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
        console.log("in the middle");
        // middle middle
      }
      this.bar.classList.toggle("shown", true);
    }, 0);
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
        this.strokeBtn.classList.toggle("selected", true);
        this.colorBtn.classList.toggle("selected", false);
        this.infoBtn.classList.toggle("selected", false);
        this.fontFamilyBtn.classList.toggle("selected", false);
        this.fontSizeBtn.classList.toggle("selected", false);

        this.strokePanel.classList.toggle("shown", true);
        this.colorPanel.classList.toggle("shown", false);
        this.infoPanel.classList.toggle("shown", false);
        this.fontFamilyPanel.classList.toggle("shown", false);
        this.fontSizePanel.classList.toggle("shown", false);
        break;
      case COLOR_PANEL:
        this.strokeBtn.classList.toggle("selected", false);
        this.colorBtn.classList.toggle("selected", true);
        this.infoBtn.classList.toggle("selected", false);
        this.fontFamilyBtn.classList.toggle("selected", false);
        this.fontSizeBtn.classList.toggle("selected", false);

        this.strokePanel.classList.toggle("shown", false);
        this.colorPanel.classList.toggle("shown", true);
        this.infoPanel.classList.toggle("shown", false);
        this.fontFamilyPanel.classList.toggle("shown", false);
        this.fontSizePanel.classList.toggle("shown", false);
        break;
      case INFO_PANEL:
        this.strokeBtn.classList.toggle("selected", false);
        this.colorBtn.classList.toggle("selected", false);
        this.infoBtn.classList.toggle("selected", true);
        this.fontFamilyBtn.classList.toggle("selected", false);
        this.fontSizeBtn.classList.toggle("selected", false);

        this.strokePanel.classList.toggle("shown", false);
        this.colorPanel.classList.toggle("shown", false);
        this.infoPanel.classList.toggle("shown", true);
        this.fontFamilyPanel.classList.toggle("shown", false);
        this.fontSizePanel.classList.toggle("shown", false);
        break;
      case FONT_FAMILY_PANEL:
        this.strokeBtn.classList.toggle("selected", false);
        this.colorBtn.classList.toggle("selected", false);
        this.infoBtn.classList.toggle("selected", false);
        this.fontFamilyBtn.classList.toggle("selected", true);
        this.fontSizeBtn.classList.toggle("selected", false);

        this.strokePanel.classList.toggle("shown", false);
        this.colorPanel.classList.toggle("shown", false);
        this.infoPanel.classList.toggle("shown", false);
        this.fontFamilyPanel.classList.toggle("shown", true);
        this.fontSizePanel.classList.toggle("shown", false);
        break;
      case FONT_SIZE_PANEL:
        this.strokeBtn.classList.toggle("selected", false);
        this.colorBtn.classList.toggle("selected", false);
        this.infoBtn.classList.toggle("selected", false);
        this.fontFamilyBtn.classList.toggle("selected", false);
        this.fontSizeBtn.classList.toggle("selected", true);

        this.strokePanel.classList.toggle("shown", false);
        this.colorPanel.classList.toggle("shown", false);
        this.infoPanel.classList.toggle("shown", false);
        this.fontFamilyPanel.classList.toggle("shown", false);
        this.fontSizePanel.classList.toggle("shown", true);
        break;
      default:
        this.strokeBtn.classList.toggle("selected", false);
        this.colorBtn.classList.toggle("selected", false);
        this.infoBtn.classList.toggle("selected", false);
        this.fontFamilyBtn.classList.toggle("selected", false);
        this.fontSizeBtn.classList.toggle("selected", false);

        this.strokePanel.classList.toggle("shown", false);
        this.colorPanel.classList.toggle("shown", false);
        this.infoPanel.classList.toggle("shown", false);
        this.fontFamilyPanel.classList.toggle("shown", false);
        this.fontSizePanel.classList.toggle("shown", false);
        break;
    }
    this.#openedPanel = value;
  }

  get lineWidth() {
    return this.#lineWidth;
  }
  set lineWidth(value) {
    this.#lineWidth = parseInt(value, 10);
    this.strokeSlider.value = this.#lineWidth;
    this.strokeWidth.innerText = "" + this.#lineWidth;
  }

  get color() {
    return this.#color;
  }
  set color(value) {
    this.#color = value;
    this.colorBtn.style.setProperty("--color", value);
    this.#opacity = parseInt(colord(value).alpha() * 100, 10);
    this.opacitySlider.value = this.#opacity;
    this.opacityValue.innerText = `${this.#opacity}%`;
  }

  get fontWeight() {
    return this.#fontWeight;
  }
  set fontWeight(value) {
    this.#fontWeight = value;
    this.boldBtn.classList.toggle("selected", this.#fontWeight === FONT_WEIGHT.W600);
  }

  get textAlignment() {
    return this.#textAlignment;
  }
  set textAlignment(value) {
    this.#textAlignment = value;
    this.alignLeftBtn.classList.toggle("selected", this.#textAlignment === TEXT_ALIGNMENT.START);
    this.alignCenterBtn.classList.toggle("selected", this.#textAlignment === TEXT_ALIGNMENT.CENTER);
    this.alignRightBtn.classList.toggle("selected", this.#textAlignment === TEXT_ALIGNMENT.END);
  }

  get fontFamily() {
    return this.#fontFamily;
  }
  set fontFamily(value) {
    this.#fontFamily = value;
    this.fontFamilyValue.innerText = FONT_NAMES[value];
  }

  get fontSize() {
    return this.#fontSize;
  }
  set fontSize(value) {
    this.#fontSize = value;
    this.fontSizeValue.innerText = value;
  }

  strokeSliderOnInput(e) {
    this.lineWidth = parseInt(e.target.value, 10);
    this.strokeWidth.innerText = `${this.lineWidth}`;
    this.onChange("lineWidth", this.lineWidth);
  }
  opacitySliderOnInput(e) {
    this.color = colord(this.color)
      .alpha(e.target.value / 100)
      .toHex();
    this.color += this.color.length === 7 ? "ff" : "";
    // console.log("choose-opacity", this.color);
    this.onChange("color", this.color);
  }

  onMouseDown(e) {
    e.stopPropagation();
  }
  onClick(e) {
    const role = e.target.dataset["role"];
    const value = e.target.dataset["value"];
    // console.log("fb onClick", { role, value });
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
        this.#eventBus.dispatch("make-as-a-stamp");
        break;
      }
      case "delete": {
        this.openedPanel = NO_PANEL;
        this.#eventBus.dispatch("delete-selected-objects");
        break;
      }
      case "choose-color": {
        this.color = colord(window.getComputedStyle(e.target).backgroundColor)
          .alpha(this.#opacity / 100)
          .toHex();
        this.color += this.color.length === 7 ? "ff" : "";
        // console.log("choose-color", this.color);
        this.onChange("color", this.color);
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
