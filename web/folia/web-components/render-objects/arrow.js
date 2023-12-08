import BaseAnnoObject from "./base";
import { fromPdfPoint, toPdfPoint, hexColor2RGBA } from "../../folia-util";
import { ROLE_ARROW_SOURCE, ROLE_ARROW_TARGET, ROLE_OBJECT } from "../../constants";

class ArrowObject extends BaseAnnoObject {
  color;
  lineWidth;
  sourcePoint;
  targetPoint;

  constructor(annoData, viewport, eventBus) {
    super(annoData, viewport, eventBus);

    const { color, lineWidth, sourcePoint, targetPoint } = annoData;
    this.color = color;
    this.lineWidth = lineWidth;
    this.sourcePoint = sourcePoint;
    this.targetPoint = targetPoint;
    this.no_corners = true;
  }

  update(annoData) {
    if (super.update(annoData)) {
      const {
        color = this.color,
        lineWidth = this.lineWidth,
        sourcePoint = this.sourcePoint,
        targetPoint = this.targetPoint,
      } = annoData;

      this.color = color;
      this.lineWidth = lineWidth;
      this.sourcePoint = sourcePoint;
      this.targetPoint = targetPoint;
    }
  }

  toObjectData() {
    return {
      ...super.toObjectData(),
      sourcePoint: this.sourcePoint,
      targetPoint: this.targetPoint,
      lineWidth: this.lineWidth,
      color: this.color,
    };
  }

  toFloatingBarData() {
    return {
      ...super.toFloatingBarData(),
      bounds: this.getBoundingRect(),
      lineWidth: this.lineWidth,
      color: this.color,
    };
  }

  shiftObjectPosition(deltaX, deltaY) {
    const { width, height } = this.viewport;
    const sourcePoint = fromPdfPoint(this.sourcePoint, width, height);
    const targetPoint = fromPdfPoint(this.targetPoint, width, height);
    sourcePoint.x += deltaX;
    sourcePoint.y += deltaY;

    targetPoint.x += deltaX;
    targetPoint.y += deltaY;
    return {
      sourcePoint: toPdfPoint(sourcePoint, width, height),
      targetPoint: toPdfPoint(targetPoint, width, height),
    };
  }

  render(ctx) {
    if (!ctx) return;

    const sourcePoint = fromPdfPoint(this.sourcePoint, this.viewport.width, this.viewport.height);
    const targetPoint = fromPdfPoint(this.targetPoint, this.viewport.width, this.viewport.height);
    const lineWidth = this.lineWidth * this.viewport.scale * window.devicePixelRatio;
    const color = hexColor2RGBA(this.color);

    const sourceX = sourcePoint.x * window.devicePixelRatio;
    const sourceY = sourcePoint.y * window.devicePixelRatio;
    const targetX = targetPoint.x * window.devicePixelRatio;
    const targetY = targetPoint.y * window.devicePixelRatio;
    const annotationWidth = Math.abs(targetX - sourceX);
    const annotationHeight = Math.abs(targetY - sourceY);
    const annotationAgle = Math.atan(annotationHeight / annotationWidth);
    const arrowLength = Math.sqrt(Math.pow(annotationWidth, 2) + Math.pow(annotationHeight, 2));

    // arrow cap calc
    const lineFactor = Math.max(lineWidth, 5);
    const arrowHeight = lineFactor * 3.7;
    const arrowLeavesHeight = arrowHeight / 6.5;
    const arrowAngle = (63 * Math.PI) / 180;
    const cornersRadius = lineFactor / 6;

    const outSideLine = arrowHeight / Math.cos(arrowAngle / 2);
    const x1 =
      sourceX <= targetX
        ? targetX - outSideLine * Math.cos(annotationAgle - arrowAngle / 2)
        : targetX + outSideLine * Math.cos(annotationAgle - arrowAngle / 2);

    const y1 =
      sourceY <= targetY
        ? targetY - outSideLine * Math.sin(annotationAgle - arrowAngle / 2)
        : targetY + outSideLine * Math.sin(annotationAgle - arrowAngle / 2);

    const x2 =
      sourceX <= targetX
        ? targetX - outSideLine * Math.cos(annotationAgle + arrowAngle / 2)
        : targetX + outSideLine * Math.cos(annotationAgle + arrowAngle / 2);

    const y2 =
      sourceY <= targetY
        ? targetY - outSideLine * Math.sin(annotationAgle + arrowAngle / 2)
        : targetY + outSideLine * Math.sin(annotationAgle + arrowAngle / 2);

    const x3 =
      sourceX <= targetX
        ? targetX - (arrowHeight - arrowLeavesHeight) * Math.cos(annotationAgle)
        : targetX + (arrowHeight - arrowLeavesHeight) * Math.cos(annotationAgle);

    const y3 =
      sourceY <= targetY
        ? targetY - (arrowHeight - arrowLeavesHeight) * Math.sin(annotationAgle)
        : targetY + (arrowHeight - arrowLeavesHeight) * Math.sin(annotationAgle);

    // ctx.save();

    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = lineWidth;

    ctx.beginPath();
    ctx.moveTo(x3, y3);
    ctx.arcTo(x2, y2, targetX, targetY, cornersRadius);
    ctx.arcTo(targetX, targetY, x1, y1, cornersRadius);
    ctx.arcTo(x1, y1, x3, y3, cornersRadius);
    ctx.closePath();
    ctx.fill();

    if (arrowLength >= arrowHeight - arrowLeavesHeight) {
      // arrow annotation foot calc
      const t1x =
        sourceX <= targetX
          ? sourceX - (lineWidth / 2) * Math.cos(annotationAgle + (90 * Math.PI) / 180)
          : sourceX + (lineWidth / 2) * Math.cos(annotationAgle + (90 * Math.PI) / 180);

      const t1y =
        sourceY <= targetY
          ? sourceY - (lineWidth / 2) * Math.sin(annotationAgle + (90 * Math.PI) / 180)
          : sourceY + (lineWidth / 2) * Math.sin(annotationAgle + (90 * Math.PI) / 180);

      const t2x =
        sourceX <= targetX
          ? sourceX - (lineWidth / 2) * Math.cos(annotationAgle - (90 * Math.PI) / 180)
          : sourceX + (lineWidth / 2) * Math.cos(annotationAgle - (90 * Math.PI) / 180);

      const t2y =
        sourceY <= targetY
          ? sourceY - (lineWidth / 2) * Math.sin(annotationAgle - (90 * Math.PI) / 180)
          : sourceY + (lineWidth / 2) * Math.sin(annotationAgle - (90 * Math.PI) / 180);

      const arrowBaseAngle = Math.asin(
        arrowLeavesHeight / Math.sqrt(Math.pow(Math.abs(x3 - x1), 2) + Math.pow(Math.abs(y3 - y1), 2))
      );

      const tHeigth = (lineWidth / 2) * Math.tan(arrowBaseAngle);
      const tLen = Math.sqrt(Math.pow(lineWidth / 2, 2) + Math.pow(tHeigth, 2));
      const t3x =
        sourceX <= targetX
          ? x3 - tLen * Math.cos(annotationAgle - arrowBaseAngle + (90 * Math.PI) / 180)
          : x3 + tLen * Math.cos(annotationAgle - arrowBaseAngle + (90 * Math.PI) / 180);
      const t3y =
        sourceY <= targetY
          ? y3 - tLen * Math.sin(annotationAgle - arrowBaseAngle + (90 * Math.PI) / 180)
          : y3 + tLen * Math.sin(annotationAgle - arrowBaseAngle + (90 * Math.PI) / 180);
      const t4x =
        sourceX <= targetX
          ? x3 - tLen * Math.cos(annotationAgle + arrowBaseAngle - (90 * Math.PI) / 180)
          : x3 + tLen * Math.cos(annotationAgle + arrowBaseAngle - (90 * Math.PI) / 180);
      const t4y =
        sourceY <= targetY
          ? y3 - tLen * Math.sin(annotationAgle + arrowBaseAngle - (90 * Math.PI) / 180)
          : y3 + tLen * Math.sin(annotationAgle + arrowBaseAngle - (90 * Math.PI) / 180);

      ctx.beginPath();
      ctx.moveTo(x3, y3);
      ctx.lineTo(t3x, t3y);
      ctx.lineTo(t1x, t1y);
      ctx.lineTo(t2x, t2y);
      ctx.lineTo(t4x, t4y);
      ctx.fill();
      ctx.closePath();
    }
    // ctx.restore();

    const arrowBase = Math.sqrt(Math.pow(outSideLine, 2) - Math.pow(arrowHeight, 2));
    this.arrowDimensions = {
      annotationAgle,
      arrowBase,
      arrowLength: arrowLength / window.devicePixelRatio,
      minArrowLength: (arrowHeight - arrowLeavesHeight) / window.devicePixelRatio,
    };
  }

  renderUI(uiContainer) {
    let annotationUI = uiContainer.querySelector(`[id="${this.id}"]`);
    if (!annotationUI) {
      annotationUI = document.createElement("div");
      annotationUI.setAttribute("id", this.id);
      annotationUI.setAttribute("data-role", ROLE_OBJECT);
      annotationUI.className = `annotation ${this.__typename}`;
      annotationUI.onmousedown = this.onMouseDownBinded;

      const sourcePointEl = document.createElement("div");
      sourcePointEl.setAttribute("id", this.id);
      sourcePointEl.setAttribute("data-role", ROLE_ARROW_SOURCE);
      sourcePointEl.className = `corner-div source-point`;
      sourcePointEl.onmousedown = this.onMouseDownBinded;
      this.source_arrow = annotationUI.appendChild(sourcePointEl);

      const targetPointEl = document.createElement("div");
      targetPointEl.setAttribute("id", this.id);
      targetPointEl.setAttribute("data-role", ROLE_ARROW_TARGET);
      targetPointEl.className = `corner-div target-point`;
      targetPointEl.onmousedown = this.onMouseDownBinded;
      this.target_arrow = annotationUI.appendChild(targetPointEl);

      this.annotationUI = uiContainer.appendChild(annotationUI);
      // console.log(this.id, annotationUI, this.annotationUI);
    }

    const sourcePoint = fromPdfPoint(this.sourcePoint, this.viewport.width, this.viewport.height);
    const targetPoint = fromPdfPoint(this.targetPoint, this.viewport.width, this.viewport.height);
    const directionX = targetPoint.x > sourcePoint.x;
    const directionY = targetPoint.y > sourcePoint.y;
    const { annotationAgle, arrowLength, arrowBase } = this.arrowDimensions;

    annotationUI.style.left = sourcePoint.x + "px";
    annotationUI.style.top = sourcePoint.y - arrowBase / 2 + "px";
    annotationUI.style.width = arrowLength + "px";
    annotationUI.style.height = arrowBase + "px";
    annotationUI.style.transformOrigin = `left center`;
    if (directionX === true && directionY === true) {
      annotationUI.style.transform = `rotate(${annotationAgle}rad)`;
    } else if (directionX === true && directionY === false) {
      annotationUI.style.transform = `rotate(${-annotationAgle}rad)`;
    } else if (directionX === false && directionY === true) {
      annotationUI.style.transform = `rotate(${Math.PI - annotationAgle}rad)`;
    } else if (directionX === false && directionY === false) {
      annotationUI.style.transform = `rotate(${Math.PI + annotationAgle}rad)`;
    }
    annotationUI.style.setProperty("--arrow-width", `${arrowLength}px`);
    annotationUI.style.setProperty("--arrow-height", `${arrowBase}px`);

    if (this.error) {
      this.annotationUI.classList.toggle("error", Boolean(this.error));
    }
  }

  getBoundingRect() {
    const sourcePoint = fromPdfPoint(this.sourcePoint, this.viewport.width, this.viewport.height);
    const targetPoint = fromPdfPoint(this.targetPoint, this.viewport.width, this.viewport.height);

    const annotationWidth = Math.abs(targetPoint.x - sourcePoint.x);
    const annotationHeight = Math.abs(targetPoint.y - sourcePoint.y);
    const annotationAgle = Math.atan(annotationHeight / annotationWidth);
    const arrowLength = Math.sqrt(Math.pow(annotationWidth, 2) + Math.pow(annotationHeight, 2));
    const lineWidth = this.lineWidth * this.viewport.scale * window.devicePixelRatio;
    const lineFactor = Math.max(lineWidth, 5);
    const arrowHeight = lineFactor * 3.7;
    const arrowLeavesHeight = arrowHeight / 6.5;
    const cornersRadius = lineFactor / 6;
    const arrowAngle = (63 * Math.PI) / 180;
    const outSideLine = arrowHeight / Math.cos(arrowAngle / 2);
    const halfOfArrowBase = Math.sqrt(Math.pow(outSideLine, 2) - Math.pow(arrowHeight, 2)) / 2;

    let source1, target1, target2, source2;
    if (sourcePoint.x <= targetPoint.x && sourcePoint.y <= targetPoint.y) {
      source1 = {
        x: Math.round(sourcePoint.x + halfOfArrowBase * Math.sin(annotationAgle)),
        y: Math.round(sourcePoint.y - halfOfArrowBase * Math.cos(annotationAgle)),
      };
      target1 = {
        x: Math.round(targetPoint.x + halfOfArrowBase * Math.sin(annotationAgle)),
        y: Math.round(targetPoint.y - halfOfArrowBase * Math.cos(annotationAgle)),
      };
      target2 = {
        x: Math.round(targetPoint.x - halfOfArrowBase * Math.sin(annotationAgle)),
        y: Math.round(targetPoint.y + halfOfArrowBase * Math.cos(annotationAgle)),
      };
      source2 = {
        x: Math.round(sourcePoint.x - halfOfArrowBase * Math.sin(annotationAgle)),
        y: Math.round(sourcePoint.y + halfOfArrowBase * Math.cos(annotationAgle)),
      };
    } else if (sourcePoint.x <= targetPoint.x && sourcePoint.y >= targetPoint.y) {
      source1 = {
        x: Math.round(sourcePoint.x - halfOfArrowBase * Math.sin(annotationAgle)),
        y: Math.round(sourcePoint.y - halfOfArrowBase * Math.cos(annotationAgle)),
      };
      target1 = {
        x: Math.round(targetPoint.x - halfOfArrowBase * Math.sin(annotationAgle)),
        y: Math.round(targetPoint.y - halfOfArrowBase * Math.cos(annotationAgle)),
      };
      target2 = {
        x: Math.round(targetPoint.x + halfOfArrowBase * Math.sin(annotationAgle)),
        y: Math.round(targetPoint.y + halfOfArrowBase * Math.cos(annotationAgle)),
      };
      source2 = {
        x: Math.round(sourcePoint.x + halfOfArrowBase * Math.sin(annotationAgle)),
        y: Math.round(sourcePoint.y + halfOfArrowBase * Math.cos(annotationAgle)),
      };
    } else if (sourcePoint.x >= targetPoint.x && sourcePoint.y <= targetPoint.y) {
      source1 = {
        x: Math.round(sourcePoint.x + halfOfArrowBase * Math.sin(annotationAgle)),
        y: Math.round(sourcePoint.y + halfOfArrowBase * Math.cos(annotationAgle)),
      };
      target1 = {
        x: Math.round(targetPoint.x + halfOfArrowBase * Math.sin(annotationAgle)),
        y: Math.round(targetPoint.y + halfOfArrowBase * Math.cos(annotationAgle)),
      };
      target2 = {
        x: Math.round(targetPoint.x - halfOfArrowBase * Math.sin(annotationAgle)),
        y: Math.round(targetPoint.y - halfOfArrowBase * Math.cos(annotationAgle)),
      };
      source2 = {
        x: Math.round(sourcePoint.x - halfOfArrowBase * Math.sin(annotationAgle)),
        y: Math.round(sourcePoint.y - halfOfArrowBase * Math.cos(annotationAgle)),
      };
    } else if (sourcePoint.x >= targetPoint.x && sourcePoint.y >= targetPoint.y) {
      source1 = {
        x: Math.round(sourcePoint.x - halfOfArrowBase * Math.sin(annotationAgle)),
        y: Math.round(sourcePoint.y + halfOfArrowBase * Math.cos(annotationAgle)),
      };
      target1 = {
        x: Math.round(targetPoint.x - halfOfArrowBase * Math.sin(annotationAgle)),
        y: Math.round(targetPoint.y + halfOfArrowBase * Math.cos(annotationAgle)),
      };
      target2 = {
        x: Math.round(targetPoint.x + halfOfArrowBase * Math.sin(annotationAgle)),
        y: Math.round(targetPoint.y - halfOfArrowBase * Math.cos(annotationAgle)),
      };
      source2 = {
        x: Math.round(sourcePoint.x + halfOfArrowBase * Math.sin(annotationAgle)),
        y: Math.round(sourcePoint.y - halfOfArrowBase * Math.cos(annotationAgle)),
      };
    }

    const left = Math.min(source1.x, source2.x, target1.x, target2.x);
    const top = Math.min(source1.y, source2.y, target1.y, target2.y);
    const right = Math.max(source1.x, source2.x, target1.x, target2.x);
    const bottom = Math.max(source1.y, source2.y, target1.y, target2.y);

    return {
      left,
      top,
      right,
      bottom,
      width: right - left,
      height: bottom - top,
      points: [source1, target1, target2, source2],
    };
  }

  move(deltaX = 0, deltaY = 0) {
    if (!this.viewport) throw new Error("not found viewport");
    if (!this.canManage) return;

    const { width, height } = this.viewport;
    const left = Math.min(this.startPosition.sourcePoint.x, this.startPosition.targetPoint.x);
    const top = Math.min(this.startPosition.sourcePoint.y, this.startPosition.targetPoint.y);
    const right = Math.max(this.startPosition.sourcePoint.x, this.startPosition.targetPoint.x);
    const bottom = Math.max(this.startPosition.sourcePoint.y, this.startPosition.targetPoint.y);

    const safeArea = (this.lineWidth * this.viewport.scale) / 2;
    const startPoints = [this.startPosition.sourcePoint, this.startPosition.targetPoint];

    const [sourcePoint, targetPoint] = startPoints.map((point) => {
      const leftShiftPointX = Math.abs(point.x - left);
      const topShiftPointY = Math.abs(point.y - top);
      const rightShiftPointX = Math.abs(point.x - right);
      const bottomShiftPointY = Math.abs(point.y - bottom);
      return {
        x: Math.min(
          width - safeArea - rightShiftPointX,
          Math.max(point.x + deltaX, safeArea + leftShiftPointX)
        ),
        y: Math.min(
          height - safeArea - bottomShiftPointY,
          Math.max(point.y + deltaY, safeArea + topShiftPointY)
        ),
      };
    });

    const annoData = {
      addedAt: new Date().toISOString(),
      sourcePoint: toPdfPoint(sourcePoint, width, height),
      targetPoint: toPdfPoint(targetPoint, width, height),
    };

    this.startPosition.sourcePoint && this.startPosition.targetPoint;

    this.changeManually(annoData, this.startPosition.objectData);
  }

  resize(deltaX, deltaY, arrowPoint) {
    if (!this.viewport) throw new Error("not found viewport");
    if (!this.canManage) return;

    const { width, height } = this.viewport;
    const { sourcePoint, targetPoint } = this.startPosition;
    const { minArrowLength, annotationAgle } = this.arrowDimensions;
    const annoData = {
      addedAt: new Date().toISOString(),
    };
    const safeArea = Math.max(10, (this.lineWidth * this.viewport.scale) / 2);

    // console.log("resize arrow", deltaX, deltaY, arrowPoint);
    switch (arrowPoint) {
      case ROLE_ARROW_SOURCE: {
        annoData.sourcePoint = toPdfPoint(
          {
            x: Math.min(Math.max(sourcePoint.x + deltaX, safeArea), width - safeArea),
            y: Math.min(Math.max(sourcePoint.y + deltaY, safeArea), height - safeArea),
          },
          width,
          height
        );
        break;
      }
      case ROLE_ARROW_TARGET: {
        annoData.targetPoint = toPdfPoint(
          {
            x: Math.min(Math.max(targetPoint.x + deltaX, safeArea), width - safeArea),
            y: Math.min(Math.max(targetPoint.y + deltaY, safeArea), height - safeArea),
          },
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
}

export default ArrowObject;
