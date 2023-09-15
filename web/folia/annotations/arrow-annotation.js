import { ANNOTATION_TYPES } from "../constants";
import { FOLIA_LAYER_ROLES } from "../folia-page-layer";
import { fromPdfPoint, hexColor2RGBA, toPdfPoint } from "../folia-util";
import FoliaBaseAnnotation from "./base-annotation";

class FoliaArrowAnnotation extends FoliaBaseAnnotation {
  editablePropertiesList = ["color", "lineWidth", "sourcePoint", "targetPoint"];

  constructor(...props) {
    super(...props);
    this.annotationDIV.classList.toggle(this.annotationRawData.__typename, true);
    this.annotationDIV.style.overflow = "show";
  }

  // _buildCorners(coorX = 0, corrY = 0) {
  //   if (!this.canManage) return;
  //   const lineWidth = this.annotationRawData.lineWidth * this.viewport.scale;
  //   const left2right = this.sourcePoint.x <= this.targetPoint.x;
  //   const top2bottom = this.sourcePoint.y <= this.targetPoint.y;

  //   let beginCornerDiv = this.annotationDIV.querySelector('div[data-role="corner-begin"]');
  //   if (!beginCornerDiv) {
  //     beginCornerDiv = document.createElement("div");
  //     beginCornerDiv.setAttribute("data-id", `${this.annotationRawData.id}`);
  //     beginCornerDiv.setAttribute("data-role", "corner-begin");
  //     this.annotationDIV.appendChild(beginCornerDiv);
  //   }
  //   if (left2right) {
  //     beginCornerDiv.style.left = lineWidth / 2 - beginCornerDiv.clientWidth / 2 + "px";
  //   } else {
  //     beginCornerDiv.style.right = lineWidth / 2 - beginCornerDiv.clientWidth / 2 + "px";
  //   }
  //   if (top2bottom) {
  //     beginCornerDiv.style.top = lineWidth / 2 - beginCornerDiv.clientWidth / 2 + "px";
  //   } else {
  //     beginCornerDiv.style.bottom = lineWidth / 2 - beginCornerDiv.clientWidth / 2 + "px";
  //   }
  //   beginCornerDiv.className = `corner-div arrow-begin`;

  //   let endCornerDiv = this.annotationDIV.querySelector('div[data-role="corner-end"]');
  //   if (!endCornerDiv) {
  //     endCornerDiv = document.createElement("div");
  //     endCornerDiv.setAttribute("data-id", `${this.annotationRawData.id}`);
  //     endCornerDiv.setAttribute("data-role", "corner-end");
  //     // this.annotationDIV.appendChild(endCornerDiv);
  //   }
  //   // const h2 = sourcePoint.x <= targetPoint.x ? "r" : "l";
  //   // const v2 = sourcePoint.y <= targetPoint.y ? "b" : "t";
  //   // endCornerDiv.className = `corner-div arrow-end corner-${h2}${v2}`;
  // }
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

    // const lineWidth = this.annotationRawData.lineWidth * this.viewport.scale;
    // const left2right = this.sourcePoint.x <= this.targetPoint.x;
    // const top2bottom = this.sourcePoint.y <= this.targetPoint.y;
    let width = Math.abs(this.sourcePoint.x - this.targetPoint.x);
    let height = Math.abs(this.sourcePoint.y - this.targetPoint.y);
    let arrowLength = Math.sqrt(Math.pow(width, 2) + Math.pow(height, 2));
    let angle = 0;

    if (this.sourcePoint.x <= this.targetPoint.x && this.sourcePoint.y <= this.targetPoint.y) {
      angle = (Math.acos(width / arrowLength) * 180) / Math.PI;
    } else if (this.sourcePoint.x <= this.targetPoint.x && this.sourcePoint.y > this.targetPoint.y) {
      angle = -(Math.acos(width / arrowLength) * 180) / Math.PI;
    } else if (this.sourcePoint.x > this.targetPoint.x && this.sourcePoint.y <= this.targetPoint.y) {
      angle = -(Math.asin(height / arrowLength) * 180) / Math.PI - 180;
    } else if (this.sourcePoint.x > this.targetPoint.x && this.sourcePoint.y > this.targetPoint.y) {
      angle = (Math.asin(height / arrowLength) * 180) / Math.PI - 180;
    }

    const divLeft = this.sourcePoint.x;
    const divTop = this.sourcePoint.y;

    this.annotationDIV.style.left = divLeft + "px";
    this.annotationDIV.style.top = divTop + "px";
    this.annotationDIV.style.width = arrowLength + "px";
    this.annotationDIV.style.height = 1 + "px";
    this.annotationDIV.style.transformOrigin = `left center`;
    this.annotationDIV.style.transform = `rotate(${angle}deg)`;
    // this.annotationDIV.style.backgroundColor = "rgba(0, 0, 0, 0.1)";
    this.buildCorners();
    this.drawArrow();
  }

  drawArrow() {
    const lineWidth = this.annotationRawData.lineWidth * this.viewport.scale;
    const annotationWidth = Math.abs(this.sourcePoint.x - this.targetPoint.x);
    const annotationHeight = Math.abs(this.sourcePoint.y - this.targetPoint.y);
    const arrowLength = Math.sqrt(Math.pow(annotationWidth, 2) + Math.pow(annotationHeight, 2));

    // prepare arrow head
    const capLength = arrowLength / 4;
    let lineAngle = Math.PI;
    let deltaAngle = Math.PI / 6;

    let sourceX = 0;
    let sourceY = 0;

    let targetX = arrowLength;
    let targetY = 0;

    let arrowLeftCapX = targetX + capLength * Math.cos(lineAngle + deltaAngle);
    let arrowLeftCapY = targetY + capLength * Math.sin(lineAngle + deltaAngle);
    let arrowRightCapX = targetX + capLength * Math.cos(lineAngle - deltaAngle);
    let arrowRightCapY = targetY + capLength * Math.sin(lineAngle - deltaAngle);

    let arrowWidth = Math.max(sourceX, targetX, arrowLeftCapX, arrowRightCapX);
    let arrowHeight = Math.max(sourceY, targetY, arrowLeftCapY, arrowRightCapY);

    let corrX = Math.abs(Math.min(0, sourceX, targetX, arrowLeftCapX, arrowRightCapX));
    let corrY = Math.abs(Math.min(0, sourceY, targetY, arrowLeftCapY, arrowRightCapY));

    sourceX += corrX + lineWidth / 2;
    targetX += corrX + lineWidth / 2;
    arrowLeftCapX += corrX + lineWidth / 2;
    arrowRightCapX += corrX + lineWidth / 2;

    sourceY += corrY + lineWidth / 2;
    targetY += corrY + lineWidth / 2;
    arrowLeftCapY += corrY + lineWidth / 2;
    arrowRightCapY += corrY + lineWidth / 2;

    arrowWidth += corrX + lineWidth;
    arrowHeight += corrY + lineWidth;

    const canvas = document.createElement("canvas");
    canvas.width = arrowWidth * window.devicePixelRatio;
    canvas.height = arrowHeight * window.devicePixelRatio;

    const ctx = canvas.getContext("2d");
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = hexColor2RGBA(this.annotationRawData.color);
    ctx.lineWidth = lineWidth * window.devicePixelRatio;

    ctx.beginPath();
    ctx.moveTo(sourceX * window.devicePixelRatio, sourceY * window.devicePixelRatio);
    ctx.lineTo(targetX * window.devicePixelRatio, targetY * window.devicePixelRatio);
    ctx.lineTo(arrowLeftCapX * window.devicePixelRatio, arrowLeftCapY * window.devicePixelRatio);
    ctx.lineTo(targetX * window.devicePixelRatio, targetY * window.devicePixelRatio);
    ctx.lineTo(arrowRightCapX * window.devicePixelRatio, arrowRightCapY * window.devicePixelRatio);

    ctx.stroke();
    ctx.closePath();

    this.annotationDIV.style.setProperty("--arrow-width", `${arrowWidth}px`);
    this.annotationDIV.style.setProperty("--arrow-height", `${arrowHeight}px`);
    this.annotationDIV.style.setProperty("--arrow-image", `url("${canvas.toDataURL()}")`);
  }

  // prettier-ignore
  // _render() {
  //   this.sourcePoint = fromPdfPoint(
  //     this.annotationRawData.sourcePoint,
  //     this.viewport.width,
  //     this.viewport.height
  //   );
  //   this.targetPoint = fromPdfPoint(
  //     this.annotationRawData.targetPoint,
  //     this.viewport.width,
  //     this.viewport.height
  //   );

  //   const lineWidth = this.annotationRawData.lineWidth * this.viewport.scale;
  //   const annotationWidth = Math.abs(this.sourcePoint.x - this.targetPoint.x);
  //   const annotationHeight = Math.abs(this.sourcePoint.y - this.targetPoint.y);
  //   const arrowLength = Math.sqrt(Math.pow(annotationWidth, 2) + Math.pow(annotationHeight, 2));
  //   const left2right = this.sourcePoint.x <= this.targetPoint.x;
  //   const top2bottom = this.sourcePoint.y <= this.targetPoint.y;

  //   // prepare arrow head
  //   const capLength = arrowLength / 4;
  //   let lineAngle = Math.atan2(this.sourcePoint.y - this.targetPoint.y, this.sourcePoint.x - this.targetPoint.x);
  //   let deltaAngle = Math.PI / 6;

  //   let sourceX = left2right ? 0 : annotationWidth;
  //   let sourceY = top2bottom ? 0 : annotationHeight;
  //   let targetX = left2right ? annotationWidth : 0;
  //   let targetY = top2bottom ? annotationHeight : 0;
  //   let arrowLeftCapX = targetX + capLength * Math.cos(lineAngle + deltaAngle);
  //   let arrowLeftCapY = targetY + capLength * Math.sin(lineAngle + deltaAngle);
  //   let arrowRightCapX = targetX + capLength * Math.cos(lineAngle - deltaAngle);
  //   let arrowRightCapY = targetY + capLength * Math.sin(lineAngle - deltaAngle);

  //   let arrowWidth = Math.max(sourceX, targetX, arrowLeftCapX, arrowRightCapX);
  //   let arrowHeight = Math.max(sourceY, targetY, arrowLeftCapY, arrowRightCapY);

  //   let corrX = Math.abs(Math.min(0, sourceX, targetX, arrowLeftCapX, arrowRightCapX));
  //   let corrY = Math.abs(Math.min(0, sourceY, targetY, arrowLeftCapY, arrowRightCapY));

  //   sourceX += corrX + lineWidth / 2;
  //   targetX += corrX + lineWidth / 2;
  //   arrowLeftCapX += corrX + lineWidth / 2;
  //   arrowRightCapX += corrX + lineWidth / 2;

  //   sourceY += corrY + lineWidth / 2;
  //   targetY += corrY + lineWidth / 2;
  //   arrowLeftCapY += corrY + lineWidth / 2;
  //   arrowRightCapY += corrY + lineWidth / 2;

  //   arrowWidth += corrX + lineWidth;
  //   arrowHeight += corrY + lineWidth;

  //   const canvas = document.createElement("canvas");
  //   canvas.width = arrowWidth;
  //   canvas.height = arrowHeight;

  //   const ctx = canvas.getContext("2d");
  //   ctx.lineCap = "round";
  //   ctx.lineJoin = "round";
  //   ctx.strokeStyle = hexColor2RGBA(this.annotationRawData.color);
  //   ctx.lineWidth = lineWidth;

  //   ctx.beginPath();
  //   ctx.moveTo(sourceX, sourceY);
  //   ctx.lineTo(targetX, targetY);
  //   ctx.lineTo(arrowLeftCapX, arrowLeftCapY);
  //   ctx.lineTo(targetX, targetY);
  //   ctx.lineTo(arrowRightCapX, arrowRightCapY);

  //   ctx.stroke();
  //   ctx.closePath();

  //   let image = this.annotationDIV.querySelector("img");
  //   if (!image) {
  //     image = document.createElement("img");
  //     image.style.userSelect = "none";
  //     image.setAttribute("data-id", `${this.id}`);
  //     image.setAttribute("data-role", FOLIA_LAYER_ROLES.ANNOTATION_OBJECT);
  //     image.style.backgroundColor = "rgba(255, 0, 0, 0.1)";
  //   this.annotationDIV.appendChild(image);
  //   }
  //   image.style.width = arrowWidth + "px";
  //   image.style.height = arrowHeight + "px";
  //   // image.style.marginTop = -corrY/2 + "px";
  //   image.src = canvas.toDataURL();
  //   // console.log()

  //   let left = Math.min(this.sourcePoint.x, this.targetPoint.x);
  //   let top = Math.min(this.sourcePoint.y, this.targetPoint.y);
  //   let width = arrowWidth;
  //   let height = arrowHeight;

  //   this.annotationDIV.style.left = left - corrX + "px";
  //   this.annotationDIV.style.top = top - corrY + "px";
  //   this.annotationDIV.style.width = width + "px";
  //   this.annotationDIV.style.height = height + "px";

  //   this.buildCorners();
  // }

  // __render() {
  //   this.sourcePoint = fromPdfPoint(
  //     this.annotationRawData.sourcePoint,
  //     this.viewport.width,
  //     this.viewport.height
  //   );
  //   this.targetPoint = fromPdfPoint(
  //     this.annotationRawData.targetPoint,
  //     this.viewport.width,
  //     this.viewport.height
  //   );

  //   const lineWidth = this.annotationRawData.lineWidth * this.viewport.scale;
  //   let width = Math.abs(this.sourcePoint.x - this.targetPoint.x);
  //   let height = Math.abs(this.sourcePoint.y - this.targetPoint.y);
  //   let hypotenuse = Math.sqrt(Math.pow(width, 2) + Math.pow(height, 2));
  //   let angle = 0;

  //   if (this.sourcePoint.x <= this.targetPoint.x && this.sourcePoint.y <= this.targetPoint.y) {
  //     angle = (Math.acos(width / hypotenuse) * 180) / Math.PI;
  //   } else if (this.sourcePoint.x <= this.targetPoint.x && this.sourcePoint.y > this.targetPoint.y) {
  //     angle = -(Math.acos(width / hypotenuse) * 180) / Math.PI;
  //   } else if (this.sourcePoint.x > this.targetPoint.x && this.sourcePoint.y <= this.targetPoint.y) {
  //     angle = -(Math.asin(height / hypotenuse) * 180) / Math.PI - 180;
  //   } else if (this.sourcePoint.x > this.targetPoint.x && this.sourcePoint.y > this.targetPoint.y) {
  //     angle = (Math.asin(height / hypotenuse) * 180) / Math.PI - 180;
  //   }

  //   const arrowContainerHeight = lineWidth * 3.7;

  //   this.annotationDIV.style.left = this.sourcePoint.x + "px";
  //   this.annotationDIV.style.top = this.sourcePoint.y - arrowContainerHeight / 2 + "px";
  //   this.annotationDIV.style.width = hypotenuse + "px";
  //   this.annotationDIV.style.height = arrowContainerHeight + "px";
  //   this.annotationDIV.style.transformOrigin = "left center";
  //   this.annotationDIV.style.transform = `rotate(${angle}deg)`;

  //   const canvas = document.createElement("canvas");

  //   canvas.width = this.annotationDIV.clientWidth + lineWidth;
  //   canvas.height = this.annotationDIV.clientHeight;
  //   const sourcePoint = {
  //     x: 0 + lineWidth / 2,
  //     y: canvas.height / 2,
  //   };
  //   const targetPoint = {
  //     x: canvas.width - lineWidth / 2,
  //     y: canvas.height / 2,
  //   };
  //   const ctx = canvas.getContext("2d");

  //   ctx.lineCap = "round";
  //   ctx.lineJoin = "round";
  //   ctx.strokeStyle = hexColor2RGBA(this.annotationRawData.color);
  //   ctx.lineWidth = lineWidth;

  //   const arrowheadFactor = 1.3;
  //   let dx = targetPoint.x - sourcePoint.x;
  //   let dy = targetPoint.y - sourcePoint.y;
  //   const dlen = Math.sqrt(dx * dx + dy * dy);
  //   dx = dx / dlen;
  //   dy = dy / dlen;
  //   const headLen = arrowheadFactor * lineWidth;
  //   const hpx0 = targetPoint.x + headLen * dy - headLen * dx;
  //   const hpy0 = targetPoint.y - headLen * dx - headLen * dy;
  //   const hpx1 = targetPoint.x - headLen * dy - headLen * dx;
  //   const hpy1 = targetPoint.y + headLen * dx - headLen * dy;

  //   ctx.beginPath();
  //   ctx.moveTo(sourcePoint.x, sourcePoint.y);
  //   ctx.lineTo(targetPoint.x, targetPoint.y);
  //   ctx.moveTo(hpx0, hpy0);
  //   ctx.lineTo(targetPoint.x, targetPoint.y);
  //   ctx.lineTo(hpx1, hpy1);
  //   ctx.stroke();
  //   ctx.restore();
  //   ctx.closePath();
  //   this.annotationDIV.style.backgroundImage = `url("${canvas.toDataURL()}")`;
  // }
}

export default FoliaArrowAnnotation;
