import { hexColor2pdf, hexColor2RGBA, toPdfPath } from "../folia-util";
import BaseBuilder from "./base-builder";
import * as turf from "@turf/turf";
import { flatten } from "lodash";
import { ANNOTATION_TYPES } from "../constants";

class InkBuilder extends BaseBuilder {
  mouseIsDown = false;
  mouseIsMove = false;
  parts = [];
  path = [];

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

    // the similar parts of drawing should be saved as a single annotation
    for (const part of this.parts) {
      if (annotation) {
        if (part.color === annotation.color && part.lineWidth === annotation.lineWidth) {
          annotation.paths.push(part.path);
        } else {
          annotations.push(annotation);
          annotation = { paths: [part.path], color: part.color, lineWidth: part.lineWidth };
        }
      } else {
        annotation = { paths: [part.path], color: part.color, lineWidth: part.lineWidth };
      }
    }
    if (annotation) annotations.push(annotation);

    this.parts = [];
    this.path = [];

    return annotations.map((anno) => {
      return {
        __typename: ANNOTATION_TYPES.INK,
        lineWidth: anno.lineWidth,
        color: anno.color,
        paths: anno.paths.map((path) => toPdfPath(path, this.viewport.width, this.viewport.height)),
      };
    });
  }

  onMouseDown(e) {
    e.preventDefault();
    e.stopPropagation();
    this.mouseIsDown = true;
    this.path.push(this.getRelativePoint(e));
  }
  onMouseMove(e) {
    e.preventDefault();
    e.stopPropagation();
    if (!this.mouseIsDown) return;
    this.mouseIsMove = true;

    this.path.push(this.getRelativePoint(e));
    try {
      const line = turf.lineString(this.path.map((p) => [p.x, p.y]));
      const options = { tolerance: 0.4, highQuality: false };
      const simplified = turf.simplify(line, options);
      this.path = simplified.geometry.coordinates.map((c) => ({ x: c[0], y: c[1] }));
    } catch (e) {}

    window.requestAnimationFrame(() =>
      this.draw([
        {
          color: this.preset.color,
          lineWidth: this.preset.lineWidth,
          path: this.path,
        },
        ...this.parts,
      ])
    );
  }
  onMouseUp(e) {
    e.preventDefault();
    e.stopPropagation();
    this.mouseIsDown = false;
    this.mouseIsMove = false;
    this.parts.push({
      color: this.preset.color,
      lineWidth: this.preset.lineWidth,
      path: this.path,
    });
    window.requestAnimationFrame(() => {
      this.draw(this.parts);
      this.path = [];
    });
  }

  draw(parts = []) {
    const ctx = this.canvas.getContext("2d");
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    parts.forEach(({ color, lineWidth, path }) => {
      if (path.length === 0) return;
      ctx.save();
      ctx.strokeStyle = hexColor2RGBA(color);
      // ctx.lineWidth = lineWidth * this.foliaPageLayer.pdfViewerScale;
      ctx.lineWidth = lineWidth * this.viewport.scale;
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
    });
  }
}

export default InkBuilder;
