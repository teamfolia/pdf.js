import { hexColor2RGBA, toPdfPath } from "../folia-util";
import BaseBuilder from "./base-builder";
import * as turf from "@turf/turf";
import { ANNOTATION_TYPES } from "../constants";

class InkBuilder extends BaseBuilder {
  paths = [];
  drawingPath = null;

  static type = "InkAnnotation";

  constructor(...props) {
    super(...props);
  }

  resume() {
    if (!this.canvas) {
      this.canvas = document.createElement("canvas");
      this.canvas.className = "annotation-builder-container";
      this.canvas.width = this.foliaPageLayer.parentNode.clientWidth * window.devicePixelRatio;
      this.canvas.height = this.foliaPageLayer.parentNode.clientHeight * window.devicePixelRatio;
      this.canvas.style.width = this.foliaPageLayer.parentNode.clientWidth + "px";
      this.canvas.style.height = this.foliaPageLayer.parentNode.clientHeight + "px";
      this.canvas.onclick = this.onMouseClick.bind(this);
      this.canvas.onmousedown = this.onMouseDown.bind(this);
      this.canvas.onmousemove = this.onMouseMove.bind(this);
      this.canvas.onmouseup = this.onMouseUp.bind(this);
    }
    this.foliaPageLayer.parentNode.appendChild(this.canvas);
  }

  prepareAnnotations2save() {
    const annotations = [];
    let annotation = null;

    // the similar paths of drawing should be saved as a single annotation
    for (const part of this.paths) {
      if (annotation) {
        if (part.color === annotation.color && part.lineWidth === annotation.lineWidth) {
          annotation.paths.push(part.path);
        } else {
          annotations.push(annotation);
          annotation = {
            paths: [part.path],
            color: part.color,
            lineWidth: part.lineWidth,
            addedAt: part.addedAt,
          };
        }
      } else {
        annotation = {
          paths: [part.path],
          color: part.color,
          lineWidth: part.lineWidth,
          addedAt: part.addedAt,
        };
      }
    }
    if (annotation) annotations.push(annotation);

    this.paths = [];
    this.drawingPath = [];

    return annotations.map((anno) => {
      return {
        __typename: ANNOTATION_TYPES.INK,
        addedAt: anno.addedAt,
        lineWidth: anno.lineWidth,
        color: anno.color,
        paths: anno.paths.map((path) => {
          return toPdfPath(
            path.map((point) => ({
              x: point.x / window.devicePixelRatio,
              y: point.y / window.devicePixelRatio,
            })),
            this.viewport.width,
            this.viewport.height
          );
        }),
      };
    });
  }

  simplifyPath(path) {
    try {
      if (!path) return [];
      if (path.length < 3) return path;
      const line = turf.lineString(path.map((p) => [p.x, p.y]));
      const simplified = turf.simplify(line, { tolerance: 0.4, highQuality: false });
      return simplified.geometry.coordinates.map((c) => ({ x: c[0], y: c[1] }));
    } catch (e) {
      // console.error("turf error:", e.message);
      return path;
    }
  }

  onMouseDown(e) {
    e.preventDefault();
    e.stopPropagation();
    const point = this.getRelativePoint(e);
    this.drawingPath = {
      color: this.preset.color,
      lineWidth: this.preset.lineWidth,
      path: [{ x: point.x * window.devicePixelRatio, y: point.y * window.devicePixelRatio }],
    };
  }
  onMouseMove(e) {
    e.preventDefault();
    e.stopPropagation();
    if (!this.drawingPath) return;

    const point = this.getRelativePoint(e);
    this.drawingPath.path.push({
      x: point.x * window.devicePixelRatio,
      y: point.y * window.devicePixelRatio,
    });

    // window.requestAnimationFrame(() => this.drawAll());
    // this.drawAll();
  }
  onMouseUp(e) {
    e.preventDefault();
    e.stopPropagation();

    const prevState = { page: this.foliaPageLayer.pageNumber, data: this.paths.slice() };
    this.paths.push({
      addedAt: new Date().toISOString(),
      color: this.preset.color,
      lineWidth: this.preset.lineWidth,
      path: this.simplifyPath(this.drawingPath.path),
    });
    const newState = { page: this.foliaPageLayer.pageNumber, data: this.paths.slice() };
    this.undoRedoManager?.addToolStep(prevState, newState);
    this.drawingPath = null;
    // this.drawAll();
  }

  applyUndoRedo(paths) {
    this.paths = paths.slice();
    this.path = [];
    // this.drawAll();
  }

  drawSegment(ctx, color, _lineWidth, path) {
    if (path.length === 0) return;
    const lineWidth = _lineWidth * this.viewport.scale * window.devicePixelRatio;
    // const ctx = this.canvas.getContext("2d");
    // ctx.save();
    ctx.strokeStyle = hexColor2RGBA(color);
    ctx.fillStyle = hexColor2RGBA(color);

    ctx.lineWidth = lineWidth;
    let p1 = path[0];
    let p2 = path[1];
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);

    if (path.length === 1) {
      ctx.lineWidth = 1;
      ctx.arc(p1.x, p1.y, lineWidth / 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      for (let i = 1, len = path.length; i < len; i++) {
        const mp = { x: p1.x + (p2.x - p1.x) * 0.5, y: p1.y + (p2.y - p1.y) * 0.5 };
        ctx.quadraticCurveTo(p1.x, p1.y, mp.x, mp.y);
        p1 = path[i];
        p2 = path[i + 1];
      }
      ctx.lineTo(p1.x, p1.y);
    }
    ctx.stroke();
    ctx.closePath();
  }

  // drawAll() {}

  draw(ctx) {
    // const ctx = this.canvas.getContext("2d");
    // this.canvas.width = this.canvas.width;
    this.paths.forEach(({ color, lineWidth, path }) => {
      this.drawSegment(ctx, color, lineWidth, path);
    });
    if (this.drawingPath) {
      // console.log("PATH", this.drawingPath);
      this.drawSegment(
        ctx,
        this.preset.color,
        this.preset.lineWidth,
        this.drawingPath.path
        // this.simplifyPath(this.drawingPath.path)
      );
    }
  }
}

export default InkBuilder;
