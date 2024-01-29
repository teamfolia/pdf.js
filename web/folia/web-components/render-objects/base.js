import { v4 as uuid } from "uuid";
import {
  ROLE_OBJECT,
  ROLE_CORNER_LB,
  ROLE_CORNER_LT,
  ROLE_CORNER_RB,
  ROLE_CORNER_RT,
  CORNER_CLASSES,
  PERMISSIONS,
  ANNOTATION_TYPES,
  ROLE_TEXTBOX_LEFT_TOP,
  ROLE_TEXTBOX_RIGHT_TOP,
} from "../../constants";
import { fromPdfPath, fromPdfPoint, fromPdfRect, toPdfPath, toPdfPoint, toPdfRect } from "../../folia-util";

class BaseAnnoObject {
  viewport;
  eventBus;

  __typename;
  id;
  addedAt;
  deletedAt;
  error;
  collaboratorEmail;
  collaboratorName;

  #userEmail;
  #userName;
  #userRole;
  #permissions;

  onMouseDownBinded = this.onMouseDown.bind(this);

  constructor(annoData, viewport, eventBus) {
    const {
      __typename,
      page,
      id,
      collaboratorEmail,
      collaboratorName,
      createdAt,
      addedAt,
      deletedAt,
      error,
      permissions,
    } = annoData;
    this.__typename = __typename;
    this.page = page;
    this.id = id;
    this.createdAt = createdAt;
    this.addedAt = addedAt;
    this.deletedAt = deletedAt;
    this.error = error;
    this.collaboratorEmail = collaboratorEmail;
    this.collaboratorName = collaboratorName;
    this.permissions = permissions;

    this.viewport = viewport;
    this.eventBus = eventBus;
    this.no_corners = false;
    this.staticObject = false;
    this.useFixedAspectRatio = false;
  }

  update(annoData) {
    const { addedAt = this.addedAt, deletedAt = this.deletedAt, error } = annoData;

    this.error = error;

    if (deletedAt) {
      this.deletedAt = deletedAt;
      return false;
    }

    const addedAtTime = new Date(addedAt).getTime();
    const currAddedAtTime = new Date(this.addedAt || "1970-01-01").getTime();
    if (addedAtTime <= currAddedAtTime) return false;

    this.addedAt = addedAt;

    return true;
  }

  changeManually(annoData, previousState) {
    if (!previousState) previousState = this.toObjectData();

    const availableProperty = Object.keys(this.toObjectData());
    for (const [key, value] of Object.entries(annoData)) {
      if (!availableProperty.includes(key)) {
        console.log(key, "do not supports for", this.__typename);
        continue;
      }
      this[key] = value;
    }
    const currentState = this.toObjectData();

    clearTimeout(this.changeTimer);
    this.changeTimer = setTimeout(() => {
      this.eventBus.dispatch("objects-were-updated", [this.toObjectData()]);
      const action = currentState.deletedAt ? "delete" : "update";
      this.eventBus.dispatch("undo-redo-collect", { action, previousState, currentState });
    }, 300);
  }

  toObjectData() {
    return {
      __typename: this.__typename,
      id: this.id,
      createdAt: this.createdAt,
      addedAt: this.addedAt,
      deletedAt: this.deletedAt,
      page: this.page,
      collaboratorEmail: this.collaboratorEmail,
    };
  }

  toFloatingBarData() {
    return {
      __typename: this.__typename,
      id: this.id,
      collaboratorName: this.collaboratorName,
      createdAt: this.createdAt,
      addedAt: this.addedAt,
      canDelete: this.canDelete,
      canManage: this.canManage,
      viewport: this.viewport,
    };
  }

  shiftObjectPosition(deltaX, deltaY) {
    const { width, height } = this.viewport;
    const rect = fromPdfRect(this.rect, width, height);
    rect[0] += deltaX;
    rect[1] += deltaY;
    return { rect: toPdfRect(rect, width, height) };
  }

  createShiftedClone(collaboratorEmail, collaboratorName) {
    const rect = this.getBoundingRect();
    const { width, height } = this.viewport;
    const now = new Date().toISOString();
    // const shift = Math.min(rect.width * 1.1, rect.height * 1.1);
    const shift = 15;
    let positionData;

    if (rect.left + rect.width + shift < width && rect.top + shift < height) {
      // right bottom
      positionData = this.shiftObjectPosition(shift, shift);
    } else if (rect.left - shift > 0 && rect.top - shift > 0) {
      // left top
      positionData = this.shiftObjectPosition(-shift, -shift);
    } else if (rect.left + rect.width + shift < width && rect.top - shift > 0) {
      // right top
      positionData = this.shiftObjectPosition(shift, -shift);
    } else if (rect.left - shift > 0 && rect.top + shift < height) {
      // left bottom
      positionData = this.shiftObjectPosition(-shift, shift);
    } else {
      const message = "сильно завелика для звичайного клону, тож буде зміщена всього на 5 поінтів ;)";
      console.log(message, { rect, shift, width, height });
      positionData = this.shiftObjectPosition(-5, 5);
      return;
    }

    return {
      ...this.toObjectData(),
      ...positionData,
      id: uuid(),
      collaboratorEmail,
      collaboratorName,
      createdAt: now,
      addedAt: now,
      newbie: true,
    };
  }

  makeSelected() {
    this.annotationUI?.classList.toggle("selected", true);
    this.corner_lt?.classList.toggle("selected", true);
    this.corner_rt?.classList.toggle("selected", true);
    this.corner_lb?.classList.toggle("selected", true);
    this.corner_rb?.classList.toggle("selected", true);
    this.source_arrow?.classList.toggle("selected", true);
    this.target_arrow?.classList.toggle("selected", true);
  }

  makeUnselected() {
    this.annotationUI?.classList.toggle("selected", false);
    this.corner_lt?.classList.toggle("selected", false);
    this.corner_rt?.classList.toggle("selected", false);
    this.corner_lb?.classList.toggle("selected", false);
    this.corner_rb?.classList.toggle("selected", false);
    this.source_arrow?.classList.toggle("selected", false);
    this.target_arrow?.classList.toggle("selected", false);
  }

  onMouseDown(e) {
    e.objectRole = e.target.dataset["role"];
    e.objectInstance = this;
    // console.log("base object", e.objectRole, e.objectInstance);
  }

  rememberStartPosition() {
    if (!this.viewport) throw new Error("not found viewport");
    const { width, height } = this.viewport;

    this.startPosition = {
      objectData: structuredClone(this.toObjectData()),
      rect: this.rect && fromPdfRect(this.rect, width, height),
      paths: this.paths && this.paths.map((path) => fromPdfPath(path, width, height)),
      sourcePoint: this.sourcePoint && fromPdfPoint(this.sourcePoint, width, height),
      targetPoint: this.targetPoint && fromPdfPoint(this.targetPoint, width, height),
      bounds: this.getBoundingRect(),
      aspectRatioW: this.getBoundingRect().width / this.getBoundingRect().height,
      aspectRatioH: this.getBoundingRect().height / this.getBoundingRect().width,
    };
  }

  move(deltaX = 0, deltaY = 0) {
    if (!this.viewport) throw new Error("not found viewport");
    if (!this.canManage) return;

    const { width, height, scale } = this.viewport;
    const annoData = {
      addedAt: new Date().toISOString(),
    };
    const safeArea = (this.lineWidth * scale) / 2;

    if (this.startPosition.rect) {
      annoData.rect = toPdfRect(
        [
          Math.min(
            width - (safeArea + this.startPosition.rect[2]),
            Math.max(safeArea, this.startPosition.rect[0] + deltaX)
          ),
          Math.min(
            height - (safeArea + this.startPosition.rect[3]),
            Math.max(safeArea, this.startPosition.rect[1] + deltaY)
          ),
          this.startPosition.rect[2],
          this.startPosition.rect[3],
        ],
        width,
        height
      );
      //
    }

    this.changeManually(annoData, this.startPosition.objectData);
  }

  resize(deltaX, deltaY, corner, shiftKey = false) {
    if (!this.viewport) throw new Error("not found viewport");
    if (!this.canManage) return;

    const { width, height } = this.viewport;
    const { rect, bounds, aspectRatioW, aspectRatioH } = this.startPosition;
    const annoData = {
      addedAt: new Date().toISOString(),
    };
    const safeArea = Math.max(10, ((this.lineWidth * this.viewport.scale) / 2) * 3);
    const isProportional = shiftKey ? !this.useFixedAspectRatio : this.useFixedAspectRatio;

    switch (corner) {
      case ROLE_CORNER_LT: {
        annoData.rect = toPdfRect(
          isProportional
            ? [
                Math.min(bounds.right - safeArea, Math.max(safeArea, rect[0] + deltaX)),
                Math.min(bounds.bottom - safeArea, Math.max(safeArea, rect[1] + deltaX / aspectRatioW)),
                Math.max(safeArea, rect[2] - deltaX),
                Math.max(safeArea, rect[3] - deltaX / aspectRatioW),
              ]
            : [
                Math.min(bounds.right - safeArea, Math.max(safeArea, rect[0] + deltaX)),
                Math.min(bounds.bottom - safeArea, Math.max(safeArea, rect[1] + deltaY)),
                Math.max(safeArea, rect[2] - deltaX),
                Math.max(safeArea, rect[3] - deltaY),
              ],
          width,
          height
        );
        break;
      }
      case ROLE_CORNER_RT: {
        annoData.rect = toPdfRect(
          isProportional
            ? [
                rect[0],
                Math.min(bounds.bottom - safeArea, Math.max(safeArea, rect[1] - deltaX / aspectRatioW)),
                Math.max(safeArea, rect[2] + deltaX),
                Math.max(safeArea, rect[3] + deltaX / aspectRatioW),
              ]
            : [
                rect[0],
                Math.min(bounds.bottom - safeArea, Math.max(safeArea, rect[1] + deltaY)),
                Math.max(safeArea, rect[2] + deltaX),
                Math.max(safeArea, rect[3] - deltaY),
              ],
          width,
          height
        );
        break;
      }
      case ROLE_CORNER_RB: {
        annoData.rect = toPdfRect(
          isProportional
            ? [
                rect[0], //                       -
                rect[1], //                       -
                Math.max(safeArea, rect[2] + deltaX),
                Math.max(safeArea, rect[3] + deltaX / aspectRatioW),
              ]
            : [
                rect[0], //                       -
                rect[1], //                       -
                Math.max(safeArea, rect[2] + deltaX),
                Math.max(safeArea, rect[3] + deltaY),
              ],
          width,
          height
        );
        break;
      }
      case ROLE_CORNER_LB: {
        annoData.rect = toPdfRect(
          isProportional
            ? [
                Math.min(bounds.right - safeArea, Math.max(safeArea, rect[0] + deltaX)),
                rect[1],
                Math.max(safeArea, rect[2] - deltaX),
                Math.max(safeArea, rect[3] - deltaX / aspectRatioW),
              ]
            : [
                Math.min(bounds.right - safeArea, Math.max(safeArea, rect[0] + deltaX)),
                rect[1],
                Math.max(safeArea, rect[2] - deltaX),
                Math.max(safeArea, rect[3] + deltaY),
              ],
          width,
          height
        );
        break;
      }
      case ROLE_TEXTBOX_LEFT_TOP: {
        annoData.rect = toPdfRect(
          [
            Math.min(bounds.right - safeArea, Math.max(safeArea, rect[0] + deltaX)),
            rect[1],
            Math.max(safeArea, rect[2] - deltaX),
            rect[3],
          ],
          width,
          height
        );
        break;
      }
      case ROLE_TEXTBOX_RIGHT_TOP: {
        annoData.rect = toPdfRect(
          [rect[0], rect[1], Math.max(safeArea, rect[2] + deltaX), rect[3]],
          width,
          height
        );
        break;
      }
      default:
        break;
    }

    this.changeManually(annoData, this.startPosition.objectData);
  }

  startEditMode() {}

  stopEditMode() {}

  renderUI(uiContainer) {
    const { left, top, width, height } = this.getBoundingRect();
    let annotationUI = uiContainer.querySelector(`[id="${this.id}"]`);

    if (!annotationUI) {
      annotationUI = document.createElement("div");
      annotationUI.setAttribute("id", this.id);
      annotationUI.setAttribute("data-role", ROLE_OBJECT);
      annotationUI.className = `annotation ${this.__typename}`;
      annotationUI.onmousedown = this.onMouseDownBinded;
      this.annotationUI = uiContainer.appendChild(annotationUI);
    }

    if (this.error) {
      this.annotationUI?.classList.toggle("error", true);
      this.annotationUI?.setAttribute("title", this.error.message);
    } else {
      this.annotationUI?.classList.toggle("error", false);
      this.annotationUI?.removeAttribute("title");
    }
    // 123

    if (!this.no_corners) {
      const cornersRoles = [ROLE_CORNER_LB, ROLE_CORNER_LT, ROLE_CORNER_RB, ROLE_CORNER_RT];
      for (const cornerRole of cornersRoles) {
        const cornerClass = CORNER_CLASSES[cornerRole];
        let corner = annotationUI.querySelector(`div.${cornerClass}`);
        if (!corner) {
          corner = document.createElement("div");
          corner.setAttribute("data-role", cornerRole);
          corner.className = `corner-div ${cornerClass}`;
          corner.onmousedown = this.onMouseDownBinded;
          switch (cornerRole) {
            case ROLE_CORNER_LB: {
              this.corner_lb = annotationUI.appendChild(corner);
              break;
            }
            case ROLE_CORNER_LT: {
              this.corner_lt = annotationUI.appendChild(corner);
              break;
            }
            case ROLE_CORNER_RB: {
              this.corner_rb = annotationUI.appendChild(corner);
              break;
            }
            case ROLE_CORNER_RT: {
              this.corner_rt = annotationUI.appendChild(corner);
              break;
            }
            default:
              break;
          }
        }
      }
    }

    const lineWidth = this.lineWidth * this.viewport.scale;
    annotationUI.style.left = left - lineWidth / 2 + "px";
    annotationUI.style.top = top - lineWidth / 2 + "px";
    annotationUI.style.width = width + lineWidth + "px";
    annotationUI.style.height = height + lineWidth + "px";
  }

  render() {
    console.log("base render");
  }

  renderTo(viewport, pageCanvasContext, uiContainer, pdfCanvas) {
    this.viewport = viewport;
    if (this.deletedAt && !this.error) {
      this.annotationUI?.remove();
    } else {
      this.render(pageCanvasContext, pdfCanvas);
      this.renderUI(uiContainer);
    }
  }

  isEquilViewports(viewport1, viewport2) {
    return (
      viewport1.width === viewport2.width &&
      viewport1.height === viewport2.height &&
      viewport1.scale === viewport2.scale
    );
  }

  set permissions(value) {
    this.#permissions = value;
    if (this.commentEl) this.commentEl.permissions = this.#permissions;
  }
  get permissions() {
    return this.#permissions;
  }

  set userEmail(value) {
    this.#userEmail = value;
  }
  get userEmail() {
    return this.#userEmail;
  }

  set userName(value) {
    this.#userName = value;
  }
  get userName() {
    return this.#userName;
  }

  set userRole(value) {
    this.#userRole = value;
  }
  get userRole() {
    return this.#userRole;
  }

  get canManage() {
    return this.#permissions.includes(PERMISSIONS.MANAGE_ANNOTATION);
  }

  get canDelete() {
    const isAnnotationOwner = this.collaboratorEmail === this.userEmail;
    return isAnnotationOwner
      ? this.#permissions.includes(PERMISSIONS.MANAGE_ANNOTATION)
      : this.#permissions.includes(PERMISSIONS.DELETE_FOREIGN_ANNOTATION);
  }

  get isDeleted() {
    return Boolean(this.deletedAt);
  }

  get isEditing() {
    return false;
  }
}

export default BaseAnnoObject;
