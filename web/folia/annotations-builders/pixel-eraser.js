import { ANNOTATION_TYPES } from "../constants";
import { fromPdfPath, hexColor2RGBA, isPointInRect, sortObjects, toPdfPath } from "../folia-util";

class PixelEraser {
  static ERASABLE_TYPES = [ANNOTATION_TYPES.INK];
  static INTERSECTION_BEGIN = "INTERSECTION_BEGIN";
  static INTERSECTION_END = "INTERSECTION_END";

  viewport;
  eraserPointer = null;
  erasableObjects = [];
  erasingPath = [];
  eraserWidth = 1;

  intersectsPoints = [];
  pathPoints = [];
  controlPoints = [];
  middlePoints = [];

  constructor(foliaPageLayer, BuildingClass, undoRedoManager) {
    this.foliaPageLayer = foliaPageLayer;
    this.viewport = foliaPageLayer.viewport.clone({ dontFlip: true });
    this.applyPreset(BuildingClass.initialPreset);
    this.resume();
  }

  resume() {
    if (!this.canvas) {
      this.canvas = document.createElement("canvas");
      this.canvas.className = "annotation-builder-container pixel-eraser";
      this.canvas.width = this.foliaPageLayer.parentNode.clientWidth * window.devicePixelRatio;
      this.canvas.height = this.foliaPageLayer.parentNode.clientHeight * window.devicePixelRatio;
      this.canvas.style.width = this.foliaPageLayer.parentNode.clientWidth + "px";
      this.canvas.style.height = this.foliaPageLayer.parentNode.clientHeight + "px";
      this.canvas.onmousedown = this.onMouseDown.bind(this);
      this.canvas.onmousemove = this.onMouseMove.bind(this);
      this.canvas.onmouseup = this.onMouseUp.bind(this);
      this.canvas.style.backgroundColor = "rgba(0, 90, 90, 0)";
    }
    this.foliaPageLayer.parentNode.appendChild(this.canvas);

    try {
      this.useObjectsData();
    } catch (error) {
      console.error(error);
      this.foliaPageLayer.eventBus.dispatch("stop-drawing");
    }
  }

  useObjectsData() {
    const { width, height } = this.viewport;
    this.erasableObjects = this.foliaPageLayer.objects
      .filter((objectData) => {
        if (objectData.isDeleted) return false;
        return PixelEraser.ERASABLE_TYPES.includes(objectData.__typename);
      })
      .sort(sortObjects)
      .map((objectData) => {
        switch (objectData.__typename) {
          case ANNOTATION_TYPES.INK: {
            const paths = objectData.paths.map((path) => fromPdfPath(path, width, height));
            const rect = objectData.getBoundingRect();
            return { ...objectData, rect, paths };
          }
        }
      });
  }

  toJSON() {
    return this.erasableObjects.map((object) => {
      return {
        __typename: object.__typename,
        id: object.id,
        addedAt: object.addedAt,
        paths: structuredClone(object.paths),
      };
    });
  }

  fromJSON(data) {
    if (!Array.isArray(data)) return;

    data.forEach((objectData) => {
      const erasableObject = this.erasableObjects.find((obj) => obj.id === objectData.id);
      if (!erasableObject) return;
      if ("paths" in objectData) {
        erasableObject.paths = structuredClone(objectData.paths);
        erasableObject.addedAt = new Date().toISOString();
      }
    });
  }

  applyUndoRedo(data) {
    this.fromJSON(data);
  }

  stop() {
    const { width, height } = this.viewport;
    this.erasableObjects.forEach((erasableObject) => {
      const object = this.foliaPageLayer.objects.find((obj) => obj.id === erasableObject.id);
      if (!object) return;
      const objectAddedAt = new Date(object.addedAt).getTime();
      const erasableObjectAddedAt = new Date(erasableObject.addedAt).getTime();
      if (objectAddedAt >= erasableObjectAddedAt) return;
      switch (object.__typename) {
        case ANNOTATION_TYPES.INK: {
          if (erasableObject.paths.length === 0) {
            object.changeManually({
              deletedAt: erasableObject.addedAt,
            });
          } else {
            object.changeManually({
              addedAt: erasableObject.addedAt,
              paths: erasableObject.paths.map((path) => toPdfPath(path, width, height)),
            });
          }
          break;
        }
        default:
          break;
      }
    });

    this.foliaPageLayer.eventBus.dispatch("reset-tool-changes");
    this.foliaPageLayer.parentNode
      .querySelectorAll(".annotation-builder-container")
      .forEach((el) => el.remove());
    this.canvas = null;
    this.newbieAnnotationsData = [];
  }

  applyPreset(preset) {
    console.log("preset", { preset });
    if ("lineWidth" in preset) {
      this.eraserWidth = parseInt(preset.lineWidth, 10);
    }
  }

  getRelativePoint(e) {
    let reference;
    const offset = {
      left: e.currentTarget.offsetLeft,
      top: e.currentTarget.offsetTop,
    };
    reference = e.currentTarget.offsetParent;
    do {
      offset.left += reference.offsetLeft;
      offset.top += reference.offsetTop - reference.scrollTop;
      reference = reference.offsetParent;
    } while (reference);

    return {
      x: e.pageX - offset.left,
      y: e.pageY - offset.top,
    };
  }

  findIntersects() {
    if (this.erasingPath.length < 2) return;

    let x1 = this.erasingPath[0].x;
    let y1 = this.erasingPath[0].y;
    let x2 = this.erasingPath[1].x;
    let y2 = this.erasingPath[1].y;
    for (let o = 1; o < this.erasingPath.length; o++) {
      for (const object of this.erasableObjects) {
        if (!isPointInRect({ x: x1, y: y1 }, object.rect) && !isPointInRect({ x: x2, y: y2 }, object.rect))
          continue;
        for (let p = 0; p < object.paths.length; p++) {
          const path = object.paths[p];
          if (path.length < 2) continue;
          let x3 = path[0].x;
          let y3 = path[0].y;
          let x4 = path[1].x;
          let y4 = path[1].y;
          let intersect;

          for (let i = 1; i < path.length; i++) {
            //
            const denom = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
            const t1 = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denom;
            const t2 = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denom;
            if (t1 >= 0 && t1 <= 1 && t2 >= 0 && t2 <= 1) {
              const x = x1 + t1 * (x2 - x1);
              const y = y1 + t1 * (y2 - y1);
              //
              intersect = { x, y, t2, i };
              break;
            }
            //
            x3 = path[i]?.x;
            y3 = path[i]?.y;
            x4 = path[i + 1]?.x;
            y4 = path[i + 1]?.y;
          }

          if (intersect) {
            object.addedAt = new Date().toISOString();
            const lineWidth = object.lineWidth;
            const { x, y, i } = intersect;
            const parts = this.splitArray(path, { x, y }, i, lineWidth);
            object.paths.splice(p, 1, ...parts);
            break;
          }
        }
      }

      x1 = this.erasingPath[o].x;
      y1 = this.erasingPath[o].y;
      x2 = this.erasingPath[o + 1]?.x;
      y2 = this.erasingPath[o + 1]?.y;
    }
  }

  splitArray(path, p, i, _lineWidth) {
    const lineWidth = _lineWidth * this.viewport.scale;
    const eraserWidth = this.eraserWidth * this.viewport.scale;
    const holeRadius = eraserWidth + lineWidth / 2;
    const part1 = path.slice(0, i);
    const part2 = path.slice(i);
    const lastPoint = this.getCoords(p, part1[part1.length - 1], holeRadius);
    const firstPoint = this.getCoords(p, part2[0], holeRadius);
    part1.push(p);
    part2.unshift(p);

    const rest1 = [];
    const rest2 = [];

    // ------- part before intersection
    let p0 = part1[part1.length - 1];
    let p1 = part1[part1.length - 2];
    let summ = 0;
    let segmentLength = Math.sqrt(Math.abs(p1.x - p0.x) ** 2 + Math.abs(p1.y - p0.y) ** 2);
    for (let i = part1.length - 2; i >= 0; i--) {
      if (summ < holeRadius && summ + segmentLength > holeRadius) {
        rest1.push(lastPoint);
        rest1.push(p1);
      } else if (summ > holeRadius) {
        rest1.push(p1);
      }
      summ += segmentLength;
      p0 = part1[i];
      p1 = part1[i - 1];
      if (p0 && p1) {
        segmentLength = Math.sqrt(Math.abs(p1.x - p0.x) ** 2 + Math.abs(p1.y - p0.y) ** 2);
      }
    }

    // ------- part after intersection
    p0 = part2[0];
    p1 = part2[1];
    summ = 0;
    segmentLength = Math.sqrt(Math.abs(p1.x - p0.x) ** 2 + Math.abs(p1.y - p0.y) ** 2);
    for (let i = 1; i < part2.length; i++) {
      if (summ < holeRadius && summ + segmentLength > holeRadius) {
        rest2.unshift(firstPoint);
        rest2.unshift(p1);
      } else if (summ > holeRadius) {
        rest2.unshift(p1);
      }
      summ += segmentLength;
      p0 = part2[i];
      p1 = part2[i + 1];
      if (p0 && p1) {
        segmentLength = Math.sqrt(Math.abs(p1.x - p0.x) ** 2 + Math.abs(p1.y - p0.y) ** 2);
      }
    }

    return [rest1, rest2].filter((arr) => arr.length > 0);
  }

  getCoords(p1, p2, partLength) {
    const segmentLength = Math.sqrt(Math.abs(p2.x - p1.x) ** 2 + Math.abs(p2.y - p1.y) ** 2);
    const ratio = partLength / segmentLength;
    const x = p1.x + ratio * (p2.x - p1.x);
    const y = p1.y + ratio * (p2.y - p1.y);
    return { x, y };
  }

  lineLength(x1, y1, x2, y2) {
    return Math.sqrt(Math.pow(Math.abs(x1 - x2), 2) + Math.pow(Math.abs(y1 - y2), 2));
  }

  crossedLines = [];
  onMouseDown(e) {
    this.undoData = this.toJSON();

    this.mouseDown = true;
    this.mouseMoved = false;

    const point = this.getRelativePoint(e);
    this.intersectsPoints = [];
    this.crossedLines = [];
    this.erasingPath = [point];
  }

  thresholdFlag = false;
  thresholdTimer = null;
  onMouseMove(e) {
    const point = this.getRelativePoint(e);
    this.eraserPointer = point;
    if (!this.mouseDown) return;
    this.mouseMoved = true;

    if (this.thresholdFlag === true) return;
    this.thresholdFlag = true;
    this.erasingPath.push(point);

    clearTimeout(this.thresholdTimer);
    this.thresholdTimer = setTimeout(() => {
      this.findIntersects();
      this.erasingPath = [point];
      this.thresholdFlag = false;
    }, 20);
  }

  onMouseUp(e) {
    this.mouseDown = false;
    this.mouseMoved = false;
    const undoRedoData = {
      action: "tool-changes",
      previousState: {
        page: this.foliaPageLayer.pageNumber,
        data: this.undoData,
      },
      currentState: {
        page: this.foliaPageLayer.pageNumber,
        data: this.toJSON(),
      },
    };

    this.foliaPageLayer.eventBus.dispatch("undo-redo-collect", undoRedoData);
  }

  drawPoint(ctx, color = "#000000", _radius = 3, point) {
    const radius = _radius * this.viewport.scale * window.devicePixelRatio;
    ctx.beginPath();
    ctx.fillStyle = color;
    ctx.arc(point.x * window.devicePixelRatio, point.y * window.devicePixelRatio, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.closePath();
  }

  prev_drawPaths(ctx, color, _lineWidth, paths) {
    paths.forEach((path) => {
      if (path.length === 0) return;

      let lineWidth = _lineWidth * this.viewport.scale * window.devicePixelRatio;
      ctx.strokeStyle = hexColor2RGBA(color);
      ctx.fillStyle = hexColor2RGBA(color);

      ctx.lineWidth = lineWidth;
      let p1 = path[0];
      let p2 = path[1];
      ctx.beginPath();
      ctx.moveTo(p1.x * window.devicePixelRatio, p1.y * window.devicePixelRatio);

      if (path.length === 1) {
        ctx.lineWidth = 1;
        ctx.arc(
          p1.x * window.devicePixelRatio,
          p1.y * window.devicePixelRatio,
          lineWidth / 2,
          0,
          Math.PI * 2
        );
        ctx.fill();
      } else if (path.length > 1) {
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        for (let i = 1, len = path.length; i < len; i++) {
          const mp = { x: (p2.x + p1.x) / 2, y: (p2.y + p1.y) / 2 };
          ctx.quadraticCurveTo(
            p1.x * window.devicePixelRatio,
            p1.y * window.devicePixelRatio,
            mp.x * window.devicePixelRatio,
            mp.y * window.devicePixelRatio
          );
          this.controlPoints.push(p1);
          this.middlePoints.push(mp);
          p1 = path[i];
          p2 = path[i + 1];
        }
        this.controlPoints.push(p1);
        ctx.lineTo(p1.x * window.devicePixelRatio, p1.y * window.devicePixelRatio);
      }
      ctx.stroke();
      ctx.closePath();
    });
  }

  drawPaths(ctx, color, _lineWidth, paths) {
    paths.forEach((path) => {
      if (path.length === 0) return;

      let lineWidth = _lineWidth * this.viewport.scale * window.devicePixelRatio;
      ctx.strokeStyle = hexColor2RGBA(color);
      ctx.fillStyle = hexColor2RGBA(color);

      ctx.lineWidth = lineWidth;
      let p1 = path[0];
      let p2 = path[1];
      ctx.beginPath();
      ctx.moveTo(p1.x * window.devicePixelRatio, p1.y * window.devicePixelRatio);

      if (path.length === 1) {
        ctx.lineWidth = 1;
        ctx.arc(
          p1.x * window.devicePixelRatio,
          p1.y * window.devicePixelRatio,
          lineWidth / 2,
          0,
          Math.PI * 2
        );
        ctx.fill();
      } else if (path.length > 1) {
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        for (let i = 1, len = path.length; i < len; i++) {
          const mp = {
            x: p1.x + (p2.x - p1.x) * 0.5,
            y: p1.y + (p2.y - p1.y) * 0.5,
          };
          ctx.quadraticCurveTo(
            p1.x * window.devicePixelRatio,
            p1.y * window.devicePixelRatio,
            mp.x * window.devicePixelRatio,
            mp.y * window.devicePixelRatio
          );
          p1 = path[i];
          p2 = path[i + 1];
        }
        ctx.lineTo(p1.x * window.devicePixelRatio, p1.y * window.devicePixelRatio);
      }
      ctx.stroke();
      ctx.closePath();
    });
  }

  drawLine(ctx, color, _lineWidth, line = []) {
    if (!Array.isArray(line) || line.length === 0) return;
    ctx.strokeStyle = color || line[0].color;
    ctx.fillStyle = color || line[0].color;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.lineWidth = _lineWidth * this.viewport.scale * window.devicePixelRatio;
    ctx.beginPath();

    let p0 = line[0];
    let p1 = line[1];
    ctx.moveTo(p0.x * window.devicePixelRatio, p0.y * window.devicePixelRatio);
    this.drawPoint(ctx, color, _lineWidth / 2, p0);

    for (let i = 1; i < line.length; i++) {
      if (!p1) continue;
      ctx.lineTo(p1.x * window.devicePixelRatio, p1.y * window.devicePixelRatio);
      ctx.stroke();
      p1 = line[i];
    }
    ctx.closePath();
  }

  drawEraserPointer(ctx, point) {
    if (!ctx) return;
    ctx.save();
    const radius = this.eraserWidth * this.viewport.scale * window.devicePixelRatio;
    ctx.beginPath();
    ctx.strokeStyle = "silver";
    ctx.lineWidth = 2;
    ctx.arc(point.x * window.devicePixelRatio, point.y * window.devicePixelRatio, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.closePath();
    ctx.restore();
  }

  draw(ctx) {
    this.pathPoints = [];
    this.controlPoints = [];
    this.middlePoints = [];

    this.erasableObjects.forEach((object) => {
      switch (object.__typename) {
        case ANNOTATION_TYPES.INK: {
          this.drawPaths(ctx, object.color, object.lineWidth, object.paths);
          // this.drawPaths(ctx, "#a0a0a0", 1, object.paths);
          // object.paths.forEach((path) => {
          //   path.forEach((point) => this.drawPoint(ctx, "green", 3, point));
          // });
          break;
        }
      }
    });

    // this.drawLine(ctx, "#c0c0c0", 1, this.erasingPath);

    // this.crossedLines.forEach((line) => this.drawLine(ctx, null, 1, line));
    // this.intersectsPoints.forEach((point) => this.drawPoint(ctx, "red", 3, point));

    if (this.eraserPointer) this.drawEraserPointer(ctx, this.eraserPointer);
  }
}

export default PixelEraser;
