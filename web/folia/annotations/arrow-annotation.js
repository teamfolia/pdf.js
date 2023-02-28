import { ANNOTATION_TYPES } from "../constants";
import { FOLIA_LAYER_ROLES } from "../folia-page-layer";
import { fromPdfPoint, hexColor2RGBA, toPdfPoint } from "../folia-util";
import FoliaBaseAnnotation from "./base-annotation";

class FoliaArrowAnnotation extends FoliaBaseAnnotation {
  editablePropertiesList = ["color", "lineWidth", "sourcePoint", "targetPoint"];

  constructor(...props) {
    super(...props);
    this.annotationDIV.classList.add(this.annotationRawData.__typename);
    this.annotationDIV.style.overflow = "show";
    this.buildCorners();
  }

  buildCorners() {
    Object.keys(FOLIA_LAYER_ROLES.ARROW_CORNERS).forEach((corner) => {
      const cornerDiv = document.createElement("div");
      cornerDiv.className = `corner-div ${FOLIA_LAYER_ROLES.ARROW_CORNERS[corner]}`;
      cornerDiv.setAttribute("data-id", `${this.annotationRawData.id}`);
      cornerDiv.setAttribute("data-role", FOLIA_LAYER_ROLES.ARROW_CORNERS[corner]);
      this.annotationDIV.appendChild(cornerDiv);
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

    const lineWidth = this.annotationRawData.lineWidth * this.viewport.scale;
    let width = Math.abs(this.sourcePoint.x - this.targetPoint.x);
    let height = Math.abs(this.sourcePoint.y - this.targetPoint.y);
    let hypotenuse = Math.sqrt(Math.pow(width, 2) + Math.pow(height, 2));
    let angle = 0;

    if (this.sourcePoint.x <= this.targetPoint.x && this.sourcePoint.y <= this.targetPoint.y) {
      angle = (Math.acos(width / hypotenuse) * 180) / Math.PI;
    } else if (this.sourcePoint.x <= this.targetPoint.x && this.sourcePoint.y > this.targetPoint.y) {
      angle = -(Math.acos(width / hypotenuse) * 180) / Math.PI;
    } else if (this.sourcePoint.x > this.targetPoint.x && this.sourcePoint.y <= this.targetPoint.y) {
      angle = -(Math.asin(height / hypotenuse) * 180) / Math.PI - 180;
    } else if (this.sourcePoint.x > this.targetPoint.x && this.sourcePoint.y > this.targetPoint.y) {
      angle = (Math.asin(height / hypotenuse) * 180) / Math.PI - 180;
    }

    const arrowContainerHeight = lineWidth * 3.7;

    this.annotationDIV.style.left = this.sourcePoint.x + "px";
    this.annotationDIV.style.top = this.sourcePoint.y - arrowContainerHeight / 2 + "px";
    this.annotationDIV.style.width = hypotenuse + "px";
    this.annotationDIV.style.height = arrowContainerHeight + "px";
    this.annotationDIV.style.transformOrigin = "left center";
    this.annotationDIV.style.transform = `rotate(${angle}deg)`;

    const canvas = document.createElement("canvas");

    canvas.width = this.annotationDIV.clientWidth + lineWidth;
    canvas.height = this.annotationDIV.clientHeight;
    const sourcePoint = {
      x: 0 + lineWidth / 2,
      y: canvas.height / 2,
    };
    const targetPoint = {
      x: canvas.width - lineWidth / 2,
      y: canvas.height / 2,
    };
    const ctx = canvas.getContext("2d");

    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = hexColor2RGBA(this.annotationRawData.color);
    ctx.lineWidth = lineWidth;

    const arrowheadFactor = 1.3;
    let dx = targetPoint.x - sourcePoint.x;
    let dy = targetPoint.y - sourcePoint.y;
    const dlen = Math.sqrt(dx * dx + dy * dy);
    dx = dx / dlen;
    dy = dy / dlen;
    const headLen = arrowheadFactor * lineWidth;
    const hpx0 = targetPoint.x + headLen * dy - headLen * dx;
    const hpy0 = targetPoint.y - headLen * dx - headLen * dy;
    const hpx1 = targetPoint.x - headLen * dy - headLen * dx;
    const hpy1 = targetPoint.y + headLen * dx - headLen * dy;

    ctx.beginPath();
    ctx.moveTo(sourcePoint.x, sourcePoint.y);
    ctx.lineTo(targetPoint.x, targetPoint.y);
    ctx.moveTo(hpx0, hpy0);
    ctx.lineTo(targetPoint.x, targetPoint.y);
    ctx.lineTo(hpx1, hpy1);
    ctx.stroke();
    ctx.restore();
    ctx.closePath();
    this.annotationDIV.style.backgroundImage = `url("${canvas.toDataURL()}")`;
  }
}

export default FoliaArrowAnnotation;
