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
      this.canvas.width = this.foliaPageLayer.pageDiv.clientWidth;
      this.canvas.height = this.foliaPageLayer.pageDiv.clientHeight;
      this.canvas.onclick = this.onMouseClick.bind(this);
      this.canvas.onmousedown = this.onMouseDown.bind(this);
      this.canvas.onmousemove = this.onMouseMove.bind(this);
      this.canvas.onmouseup = this.onMouseUp.bind(this);
    }
    this.foliaPageLayer.pageDiv.appendChild(this.canvas);
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
        paths: anno.paths.map((path) => toPdfPath(path, this.viewport.width, this.viewport.height)),
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
      path: [point],
    };
  }
  onMouseMove(e) {
    e.preventDefault();
    e.stopPropagation();
    if (!this.drawingPath) return;

    const point = this.getRelativePoint(e);
    this.drawingPath.path.push(point);

    window.requestAnimationFrame(() => this.drawAll());
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
    this.undoRedoManager.addToolStep(prevState, newState);
    this.drawingPath = null;
    window.requestAnimationFrame(() => this.drawAll());
  }

  applyUndoRedo(paths) {
    // console.log("applyUndoRedo", paths);
    this.paths = paths.slice();
    this.path = [];
    this.drawAll();
  }

  drawSegment(color, lineWidth, path) {
    if (path.length === 0) return;
    const ctx = this.canvas.getContext("2d");
    ctx.save();
    ctx.strokeStyle = hexColor2RGBA(color);
    ctx.lineWidth = lineWidth * this.viewport.scale * 0.5;
    let p1 = path[0];
    let p2 = path[1];
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    for (let i = 1, len = path.length; i < len; i++) {
      const mp = { x: p1.x + (p2.x - p1.x) * 0.5, y: p1.y + (p2.y - p1.y) * 0.5 };
      ctx.quadraticCurveTo(p1.x, p1.y, mp.x, mp.y);
      p1 = path[i];
      p2 = path[i + 1];
    }
    ctx.lineTo(p1.x, p1.y);
    ctx.stroke();
    ctx.closePath();
  }

  drawAll() {
    const ctx = this.canvas.getContext("2d");
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.paths.forEach(({ color, lineWidth, path }) => {
      this.drawSegment(color, lineWidth, path);
    });
    if (this.drawingPath) {
      this.drawSegment(this.preset.color, this.preset.lineWidth, this.simplifyPath(this.drawingPath.path));
    }
  }
}

export default InkBuilder;
