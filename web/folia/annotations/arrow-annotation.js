import { ANNOTATION_TYPES } from "../constants";
import { FOLIA_LAYER_ROLES } from "../folia-page-layer";
import { fromPdfPoint, hexColor2RGBA, toPdfPoint } from "../folia-util";
import FoliaBaseAnnotation from "./base-annotation";

class FoliaArrowAnnotation extends FoliaBaseAnnotation {
  arrowHeadSvg =
    "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA1OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4NCjxwYXRoIGQ9Ik0yNy4wOTU3IDEuMTUzNDlDMjguMDQzIC0wLjM4NDQ5OCAzMC4xNDkzIC0wLjM4NDQ5NyAzMS4wOTY2IDEuMTUzNDlMNTcuMzc3OSA0My44MjM5QzU4LjU3NTUgNDUuNzY4NSA1Ni45MzEyIDQ4LjI3OTIgNTQuODE2OSA0Ny43MzQzTDI5LjY1NjcgNDEuMjUwMkMyOS4yODgzIDQxLjE1NTIgMjguOTA0MSA0MS4xNTUyIDI4LjUzNTYgNDEuMjUwMkwzLjM3NTQ1IDQ3LjczNDNDMS4yNjExNCA0OC4yNzkyIC0wLjM4MzIwNCA0NS43Njg1IDAuODE0NDYyIDQzLjgyMzlMMjcuMDk1NyAxLjE1MzQ5WiIgZmlsbD0iI0VGNDQ0NCIvPg0KPC9zdmc+";
  editablePropertiesList = ["color", "lineWidth", "sourcePoint", "targetPoint"];

  constructor(...props) {
    super(...props);
    super.createAndAppendCanvas();
    this.annotationDIV.style.overflow = "show";
  }

  deleteFromCanvas() {
    this.canvas.remove();
    super.deleteFromCanvas();
  }

  buildCorners(lineWidth = 0) {
    if (!this.canManage) return;
    Object.keys(FOLIA_LAYER_ROLES.ARROW_CORNERS).forEach((corner) => {
      const dataRole = FOLIA_LAYER_ROLES.ARROW_CORNERS[corner];
      let cornerDiv = this.annotationDIV.querySelector(`.corner-div[data-role="${dataRole}"]`);
      if (!cornerDiv) {
        cornerDiv = document.createElement("div");
        cornerDiv.className = `corner-div ${dataRole}`;
        cornerDiv.setAttribute("data-id", `${this.annotationRawData.id}`);
        cornerDiv.setAttribute("data-role", dataRole);
        this.annotationDIV.appendChild(cornerDiv);
      }
    });
  }

  getRawData() {
    const { id, addedAt, deletedAt, collaboratorEmail, page, color, lineWidth, sourcePoint, targetPoint } =
      this.annotationRawData;

    return {
      __typename: ANNOTATION_TYPES.ARROW,
      id,
      addedAt: this.isDirty || addedAt,
      deletedAt,
      collaboratorEmail,
      page,
      color,
      lineWidth,
      sourcePoint,
      targetPoint,
    };
  }

  updateRects() {
    this.annotationRawData.sourcePoint = toPdfPoint(
      this.sourcePoint,
      this.viewport.width,
      this.viewport.height
    );
    this.annotationRawData.targetPoint = toPdfPoint(
      this.targetPoint,
      this.viewport.width,
      this.viewport.height
    );
    this.render();
    super.updateRects();
  }

  render() {
    this.sourcePoint = fromPdfPoint(
      this.annotationRawData.sourcePoint,
      this.viewport.width,
      this.viewport.height
    );
    this.targetPoint = fromPdfPoint(
      this.annotationRawData.targetPoint,
      this.viewport.width,
      this.viewport.height
    );

    const { arrowLength, arrowWidth } = this.drawArrow();

    let width = Math.abs(this.sourcePoint.x - this.targetPoint.x);
    let height = Math.abs(this.sourcePoint.y - this.targetPoint.y);
    let angle = 0;

    if (this.sourcePoint.x <= this.targetPoint.x && this.sourcePoint.y <= this.targetPoint.y) {
      angle = Math.acos(width / arrowLength);
    } else if (this.sourcePoint.x <= this.targetPoint.x && this.sourcePoint.y > this.targetPoint.y) {
      angle = -Math.acos(width / arrowLength);
    } else if (this.sourcePoint.x > this.targetPoint.x && this.sourcePoint.y <= this.targetPoint.y) {
      angle = Math.acos(height / arrowLength) + Math.PI / 2;
    } else if (this.sourcePoint.x > this.targetPoint.x && this.sourcePoint.y > this.targetPoint.y) {
      angle = Math.asin(height / arrowLength) + Math.PI;
    }

    const lineWidth = this.annotationRawData.lineWidth * this.viewport.scale;

    this.annotationDIV.style.left = this.sourcePoint.x + "px";
    this.annotationDIV.style.top = this.sourcePoint.y - Math.max(lineWidth, 10) / 2 + "px";
    this.annotationDIV.style.width = arrowLength + "px";
    this.annotationDIV.style.height = Math.max(lineWidth, 10) + "px";
    this.annotationDIV.style.transformOrigin = `left center`;
    this.annotationDIV.style.transform = `rotate(${angle}rad)`;
    // this.annotationDIV.style.backgroundColor = "rgba(0, 0, 0, 0.1)";
    this.annotationDIV.style.setProperty("--arrow-width", `${arrowLength}px`);
    this.annotationDIV.style.setProperty("--arrow-height", `${arrowWidth}px`);

    this.buildCorners();
  }

  drawArrow() {
    const lineWidth = this.annotationRawData.lineWidth * this.viewport.scale * window.devicePixelRatio;
    const sourceX = this.sourcePoint.x * window.devicePixelRatio;
    const sourceY = this.sourcePoint.y * window.devicePixelRatio;
    const targetX = this.targetPoint.x * window.devicePixelRatio;
    const targetY = this.targetPoint.y * window.devicePixelRatio;
    const dirX = Math.sign(targetX - sourceX);
    const dirY = -Math.sign(targetY - sourceY);
    const annotationWidth = Math.abs(targetX - sourceX);
    const annotationHeight = Math.abs(targetY - sourceY);
    const annotationAgle = Math.atan(annotationHeight / annotationWidth);
    const arrowLength = Math.sqrt(Math.pow(annotationWidth, 2) + Math.pow(annotationHeight, 2));

    const lineFactor = Math.max(lineWidth, 5);
    const arrowHeight = lineFactor * 3.7;
    const arrowLeavesHeight = arrowHeight / 6.5;
    const arrowAngle = (63 * Math.PI) / 180;
    const cornersRadius = lineFactor / 6;

    const outSideLine = arrowHeight / Math.cos(arrowAngle / 2);
    const x1 = targetX - dirX * outSideLine * Math.cos(annotationAgle - arrowAngle / 2);
    const y1 = targetY + dirY * outSideLine * Math.sin(annotationAgle - arrowAngle / 2);
    const x2 = targetX - dirX * outSideLine * Math.cos(annotationAgle + arrowAngle / 2);
    const y2 = targetY + dirY * outSideLine * Math.sin(annotationAgle + arrowAngle / 2);
    const x3 = targetX - dirX * (arrowHeight - arrowLeavesHeight) * Math.cos(annotationAgle);
    const y3 = targetY + dirY * (arrowHeight - arrowLeavesHeight) * Math.sin(annotationAgle);

    if (new Set([x3, x2, targetX, x1]).size > 1 && new Set([y3, y2, targetY, y1]).size > 1) {
      this.canvas.width = this.canvas.width;
      const ctx = this.canvas.getContext("2d");
      ctx.strokeStyle = hexColor2RGBA(this.annotationRawData.color);
      ctx.fillStyle = hexColor2RGBA(this.annotationRawData.color);
      ctx.lineWidth = lineWidth;

      ctx.beginPath();
      ctx.moveTo(x3, y3);
      ctx.arcTo(x2, y2, targetX, targetY, cornersRadius);
      ctx.arcTo(targetX, targetY, x1, y1, cornersRadius);
      ctx.arcTo(x1, y1, x3, y3, cornersRadius);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.lineCap = "butt";
      ctx.moveTo(x3, y3);
      ctx.lineTo(sourceX, sourceY);
      ctx.closePath();
      ctx.stroke();
    }

    const arrowBase = Math.sqrt(Math.pow(outSideLine, 2) - Math.pow(arrowHeight, 2));
    return {
      arrowLength: arrowLength / window.devicePixelRatio,
      arrowWidth: arrowBase - this.annotationRawData.lineWidth / 2,
    };
  }
}

export default FoliaArrowAnnotation;
