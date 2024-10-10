import BaseAnnoObject from "./base";
import { fromPdfPath, toPdfPath, fromPdfPoint, hexColor2RGBA } from "../../folia-util";
import { ROLE_CORNER_LT, ROLE_CORNER_RT, ROLE_CORNER_RB, ROLE_CORNER_LB } from "../../constants";

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

  render(ctx) {
    if (!ctx) return;
    const paths = this.paths
      .map((pdfPath) => fromPdfPath(pdfPath, this.viewport.width, this.viewport.height))
      .map((path) =>
        path.map((point) => ({
          x: point.x * window.devicePixelRatio,
          y: point.y * window.devicePixelRatio,
        }))
      );
    const lineWidth = this.lineWidth * this.viewport.scale * window.devicePixelRatio;
    const color = hexColor2RGBA(this.color);

    InkObject._render(ctx, paths, lineWidth, color);
  }

  static _render(ctx, paths, lineWidth, color) {
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.strokeStyle = color;
    ctx.fillStyle = color;

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
  }

  getBoundingRect() {
    const paths = this.paths.map((path) => fromPdfPath(path, this.viewport.width, this.viewport.height));
    const lineWidth = this.lineWidth * this.viewport.scale;
    return InkObject._getBoundingRect(paths, lineWidth);
  }

  static _getBoundingRect(paths, lineWidth) {
    const { mleft, mtop, mright, mbottom } = [].concat.apply([], paths).reduce(
      (acc, point) => {
        return {
          mleft: Math.min(acc.mleft, point.x),
          mtop: Math.min(acc.mtop, point.y),
          mright: Math.max(acc.mright, point.x),
          mbottom: Math.max(acc.mbottom, point.y),
        };
      },
      { mleft: Infinity, mright: -Infinity, mtop: Infinity, mbottom: -Infinity }
    );

    const left = mleft - 0.5 * lineWidth;
    const top = mtop - 0.5 * lineWidth;
    const right = mright + 0.5 * lineWidth;
    const bottom = mbottom + 0.5 * lineWidth;

    return {
      left,
      top,
      width: right - left,
      height: bottom - top,
      right,
      bottom,
      points: [
        { x: left, y: top },
        { x: right, y: top },
        { x: right, y: bottom },
        { x: left, y: bottom },
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

  resize(deltaX, deltaY, corner, shiftKey = false) {
    if (!this.canManage) return;
    return;

    const { width, height } = this.viewport;
    const { paths, bounds, aspectRatioW, aspectRatioH } = this.startPosition;
    const annoData = {
      addedAt: new Date().toISOString(),
    };
    const safeArea = Math.max(10, ((this.lineWidth * this.viewport.scale) / 2) * 3);
    const isProportional = shiftKey ? !this.useFixedAspectRatio : this.useFixedAspectRatio;
    const scaleX = (bounds.width + deltaX) / bounds.width;
    const scaleY = (bounds.height + deltaY) / bounds.height;

    // console.log("ink resize object 1", paths[0].slice(-5));
    const scaledPaths = paths.map((path) =>
      path.map((point) => {
        if (corner === ROLE_CORNER_LT) {
        } else if (corner === ROLE_CORNER_RT) {
        } else if (corner === ROLE_CORNER_RB) {
          return {
            x: (point.x - bounds.left) * scaleX + bounds.left,
            y: (point.y - bounds.top) * scaleY + bounds.top,
          };
        } else if (corner === ROLE_CORNER_LB) {
        } else {
          return point;
        }
      })
    );
    // console.log("ink resize object 2", scaledPaths[0].slice(-5));

    annoData.paths = scaledPaths.map((path) => toPdfPath(path, width, height));
    // console.log("ink resize object", annoData);
    this.changeManually(annoData, this.startPosition.objectData);
  }

  // _render(ctx) {
  //   if (!ctx) return;

  //   // const ctx = canvas.getContext("2d");
  //   const lineWidth = this.lineWidth * this.viewport.scale * window.devicePixelRatio;
  //   const paths = this.paths
  //     .map((pdfPath) => fromPdfPath(pdfPath, this.viewport.width, this.viewport.height))
  //     .map((path) =>
  //       path.map((point) => ({
  //         x: point.x * window.devicePixelRatio,
  //         y: point.y * window.devicePixelRatio,
  //       }))
  //     );

  //   ctx.lineJoin = "round";
  //   ctx.strokeStyle = hexColor2RGBA(this.color);
  //   ctx.fillStyle = hexColor2RGBA(this.color);
  //   // prettier-ignore
  //   paths.forEach((viewportPath) => {
  //     let p1 = viewportPath[0];
  //     let p2 = viewportPath[1];
  //     ctx.lineCap = "round";
  //     ctx.beginPath();
  //     ctx.moveTo(p1.x, p1.y);

  //     if (viewportPath.length === 1) {
  //       ctx.lineWidth = 1;
  //       ctx.arc(p1.x, p1.y, lineWidth / 2, 0, Math.PI * 2);
  //       ctx.fill();
  //     } else {
  //       ctx.lineWidth = lineWidth;
  //       for (let i = 1, len = viewportPath.length; i < len; i++) {
  //         const mp = {
  //           x: p1.x + (p2.x - p1.x) * 0.5,
  //           y: p1.y + (p2.y - p1.y) * 0.5
  //         };
  //         ctx.quadraticCurveTo(p1.x, p1.y, mp.x, mp.y);
  //         p1 = viewportPath[i];
  //         p2 = viewportPath[i + 1];
  //       }
  //     }

  //     ctx.lineTo(p1.x, p1.y);
  //     ctx.stroke();
  //     ctx.closePath();
  //   });
  // }
}

export default InkObject;
