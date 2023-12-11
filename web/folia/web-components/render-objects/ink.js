import BaseAnnoObject from "./base";
import { fromPdfPath, toPdfPath, fromPdfPoint, hexColor2RGBA } from "../../folia-util";
import { colord } from "colord";

class InkObject extends BaseAnnoObject {
  color;
  lineWidth;
  paths;

  constructor(annoData, viewport, eventBus) {
    super(annoData, viewport, eventBus);

    const { color, lineWidth, paths } = annoData;
    this.color = color;
    this.lineWidth = lineWidth;
    this.paths = paths;
    this.no_corners = true;
  }

  update(annoData) {
    if (super.update(annoData)) {
      const { color = this.color, lineWidth = this.lineWidth, paths = this.paths } = annoData;

      this.color = color;
      this.lineWidth = lineWidth;
      this.paths = paths;
    }
  }

  toObjectData() {
    return {
      ...super.toObjectData(),
      paths: this.paths,
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
    const paths = this.paths
      .map((path) => fromPdfPath(path, width, height))
      .map((path) =>
        path.map((point) => {
          point.x += deltaX;
          point.y += deltaY;
          return point;
        })
      );
    return { paths: paths.map((path) => toPdfPath(path, width, height)) };
  }

  _render(ctx) {
    if (!ctx) return;

    // const ctx = canvas.getContext("2d");
    const lineWidth = this.lineWidth * this.viewport.scale * window.devicePixelRatio;
    const paths = this.paths
      .map((pdfPath) => fromPdfPath(pdfPath, this.viewport.width, this.viewport.height))
      .map((path) =>
        path.map((point) => ({
          x: point.x * window.devicePixelRatio,
          y: point.y * window.devicePixelRatio,
        }))
      );

    ctx.lineJoin = "round";
    ctx.strokeStyle = hexColor2RGBA(this.color);
    ctx.fillStyle = hexColor2RGBA(this.color);
    // prettier-ignore
    paths.forEach((viewportPath) => {
      let p1 = viewportPath[0];
      let p2 = viewportPath[1];
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);

      if (viewportPath.length === 1) {
        ctx.lineWidth = 1;
        ctx.arc(p1.x, p1.y, lineWidth / 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.lineWidth = lineWidth;
        for (let i = 1, len = viewportPath.length; i < len; i++) {
          const mp = {
            x: p1.x + (p2.x - p1.x) * 0.5,
            y: p1.y + (p2.y - p1.y) * 0.5
          };
          ctx.quadraticCurveTo(p1.x, p1.y, mp.x, mp.y);
          p1 = viewportPath[i];
          p2 = viewportPath[i + 1];
        }
      }

      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();
      ctx.closePath();
    });
  }

  render(ctx) {
    if (!ctx) return;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    const alpha = colord(this.color).alpha();
    const color = colord(this.color).alpha(1).toHex();
    ctx.globalCompositeOperation = alpha < 1 ? "xor" : "source-over";
    ctx.globalAlpha = alpha;

    ctx.strokeStyle = hexColor2RGBA(color);
    ctx.fillStyle = hexColor2RGBA(color);
    const lineWidth = this.lineWidth * this.viewport.scale * window.devicePixelRatio;
    const paths = this.paths
      .map((pdfPath) => fromPdfPath(pdfPath, this.viewport.width, this.viewport.height))
      .map((path) =>
        path.map((point) => ({
          x: point.x * window.devicePixelRatio,
          y: point.y * window.devicePixelRatio,
        }))
      );

    for (const path of paths) {
      if (path.length === 1) {
        ctx.beginPath();
        ctx.lineWidth = 1;
        ctx.arc(path[0].x, path[0].y, lineWidth / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.closePath();
      } else {
        ctx.lineWidth = lineWidth;
        let p1 = path[0];
        let p2 = path[1];
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        for (let i = 1, len = path.length; i < len; i++) {
          const mp = {
            x: p1.x + (p2.x - p1.x) * 0.5,
            y: p1.y + (p2.y - p1.y) * 0.5,
          };
          ctx.quadraticCurveTo(p1.x, p1.y, mp.x, mp.y);
          p1 = path[i];
          p2 = path[i + 1];
        }
        ctx.lineTo(p1.x, p1.y);
        ctx.stroke();
        ctx.closePath();
      }
    }
    ctx.globalAlpha = 1;
  }

  getBoundingRect() {
    const { left, top, right, bottom } = [].concat.apply([], this.paths).reduce(
      (acc, path, index, arr) => {
        if (index % 2 !== 0) {
          const point = [arr[index - 1], arr[index]];
          const viewportPoint = fromPdfPoint(point, this.viewport.width, this.viewport.height);
          return {
            left: Math.min(acc.left, viewportPoint.x),
            top: Math.min(acc.top, viewportPoint.y),
            right: Math.max(acc.right, viewportPoint.x),
            bottom: Math.max(acc.bottom, viewportPoint.y),
          };
        } else {
          return acc;
        }
      },
      { left: Infinity, right: -Infinity, top: Infinity, bottom: -Infinity }
    );

    const halfOfWidth = (this.lineWidth / 2) * this.viewport.scale;

    return {
      left,
      top,
      width: right - left,
      height: bottom - top,
      right,
      bottom,
      points: [
        { x: left - halfOfWidth, y: top - halfOfWidth },
        { x: right + halfOfWidth, y: top - halfOfWidth },
        { x: right + halfOfWidth, y: bottom + halfOfWidth },
        { x: left - halfOfWidth, y: bottom + halfOfWidth },
      ],
    };
  }

  move(deltaX = 0, deltaY = 0) {
    if (!this.viewport) throw new Error("not found viewport");
    if (!this.canManage) return;

    const { width, height } = this.viewport;
    const annoData = {
      addedAt: new Date().toISOString(),
    };
    const safeArea = (this.lineWidth / 2) * this.viewport.scale;

    const { bounds, paths } = this.startPosition;
    annoData.paths = paths.map((path) => {
      const viewPortPath = path.map((point) => {
        const leftShiftPointX = Math.abs(point.x - bounds.left);
        const topShiftPointY = Math.abs(point.y - bounds.top);
        const rightShiftPointX = Math.abs(point.x - bounds.right);
        const bottomShiftPointY = Math.abs(point.y - bounds.bottom);
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
      return toPdfPath(viewPortPath, width, height);
    });

    this.changeManually(annoData, this.startPosition.objectData);
  }

  resize(deltaX, deltaY, corner) {
    if (!this.canManage) return;
    console.log("ink resize object", deltaX, deltaY, corner, this.id);
  }
}

export default InkObject;
