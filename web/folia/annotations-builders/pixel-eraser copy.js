import { colord } from "colord";
import { ANNOTATION_TYPES } from "../constants";
import { fromPdfPath, hexColor2RGBA, sortObjects, toPdfPath, toPdfPoint } from "../folia-util";
import { Bezier } from "bezier-js";

class PixelEraser {
  static ERASABLE_TYPES = [ANNOTATION_TYPES.INK];

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

      // Mobile Browsers
      this.canvas.ontouchstart = this.onMouseDown.bind(this); 
      this.canvas.ontouchmove = this.onMouseMove.bind(this);
      this.canvas.ontouchend = this.onMouseUp.bind(this); 
      this.canvas.touchcancel =  this.onMouseUp.bind(this);
      
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
            const paths = objectData.paths
              .map((path) => fromPdfPath(path, width, height))
              .map((path) =>
                path.map((point) => ({
                  x: point.x * window.devicePixelRatio,
                  y: point.y * window.devicePixelRatio,
                }))
              );

            const lineWidth = objectData.lineWidth * this.viewport.scale * window.devicePixelRatio;
            return {
              ...objectData,
              paths,
              segments: paths.map((path) => this.convertPath2Bezier(path, lineWidth)),
            };
          }
        }
      });
  }

  convertPath2Bezier(path, lineWidth) {
    const curves = [];
    if (!path || path.length === 0) return curves;

    if (path.length === 1) {
      const p = path[0];
      const curve = new Bezier(p.x, p.y, p.x, p.y, p.x, p.y);
      curve.lineWidth = lineWidth;
      curves.push(curve);
    } else {
      let p1 = path[0];
      let p2 = path[1];
      let mp = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
      let curve = new Bezier(p1, p1, mp);
      curve.lineWidth = lineWidth;
      curves.push(curve);
      let previous = mp;
      for (let i = 1; i < path.length; i++) {
        mp = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
        curve = new Bezier(previous, p1, mp);
        curve.lineWidth = lineWidth;
        curves.push(curve);
        previous = mp;
        p1 = path[i];
        p2 = path[i + 1] || p1;
      }
      mp = { x: (previous.x + p1.x) / 2, y: (previous.y + p1.y) / 2 };
      curve = new Bezier(previous, mp, p1);
      curve.lineWidth = lineWidth;
      curves.push(curve);
    }
    return curves;
  }

  convertBezier2Paths(erasableObject) {
    const paths = [];
    const path = [];
    let gap = false;
    erasableObject.segments.forEach((segment, segmentIndex) => {
      for (let i = 0; i < segment.length; i++) {
        const curve = segment[i];
        const nextCurve = segment[i + 1];

        gap =
          Boolean(nextCurve) &&
          curve.points[2].x !== nextCurve.points[0].x &&
          curve.points[2].y !== nextCurve.points[0].y;

        if (gap) {
          // the last curve before gap
          // the first curve after gap
          path.push(curve.points[0], curve.points[2]);
          paths.push(path.slice());
          path.length = 0;
        } else if (i === 0) {
          // the first curve of segment
          path.push(curve.points[0]);
        } else if (i === segment.length - 1) {
          // the last curve of segment
          path.push(curve.points[0], curve.points[2]);
        } else {
          path.push(curve.points[1]);
        }
      }

      if (path.length > 0) paths.push(path.slice());
      path.length = 0;
    });

    return paths;
  }

  updateObjectData(erasableObject) {
    const object = this.foliaPageLayer.objects.find((obj) => obj.id === erasableObject.id);
    if (!object) return console.log(`object ${erasableObject.id} not found`);

    const { width, height } = this.viewport;
    const objectData = {
      addedAt: new Date().toISOString(),
    };

    switch (erasableObject.__typename) {
      case ANNOTATION_TYPES.INK: {
        const paths = this.convertBezier2Paths(erasableObject);
        objectData.paths = paths
          .map((path) =>
            path.map((point) => ({
              x: point.x / window.devicePixelRatio,
              y: point.y / window.devicePixelRatio,
            }))
          )
          .map((path) => toPdfPath(path, width, height));
        break;
      }
      default:
        break;
    }

    object.changeManually(objectData);
  }

  toJSON() {
    return this.erasableObjects.map((object) => {
      switch (object.__typename) {
        case ANNOTATION_TYPES.INK: {
          return {
            id: object.id,
            __typename: object.__typename,
            segments: object.segments.map((segment) => {
              return segment.map((bezier) => {
                return {
                  points: bezier.points.slice(),
                };
              });
            }),
          };
          break;
        }
        default:
          break;
      }
    });
  }

  fromJSON(data) {
    if (!Array.isArray(data)) return;

    data.forEach((objectData) => {
      const erasableObject = this.erasableObjects.find((obj) => obj.id === objectData.id);
      if (!erasableObject) return;

      switch (objectData.__typename) {
        case ANNOTATION_TYPES.INK: {
          const segments = objectData.segments.map((segment) => {
            return segment.map((curve) => Bezier.quadraticFromPoints(...curve.points));
          });
          erasableObject.segments = segments;
          break;
        }
        default:
          break;
      }
    });

    // this.erasableObjects.map((object) => {
    //   switch (object.__typename) {
    //     case ANNOTATION_TYPES.INK: {
    //       return {
    //         id: object.id,
    //         segments: structuredClone(object.segments),
    //       };
    //       break;
    //     }
    //     default:
    //       break;
    //   }
    // });
  }

  applyUndoRedo(data) {
    this.fromJSON(data);
  }

  stop() {
    this.foliaPageLayer.eventBus.dispatch("reset-tool-changes");
    this.erasableObjects.forEach((erasableObject) => this.updateObjectData(erasableObject));
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
      x: (e.pageX - offset.left) * window.devicePixelRatio,
      y: (e.pageY - offset.top) * window.devicePixelRatio,
    };
  }

  /**
  computeIntersect(curves, eraseCurve) {
    let computedIntersect = null;

    for (let curveIndex = 0; curveIndex < curves.length - 1; curveIndex++) {
      const currentCurve = curves[curveIndex];
      if (!currentCurve) continue;

      const intersect = currentCurve
        .intersects(eraseCurve)
        .map((pair) => pair.split("/").map((value) => parseFloat(value))[0])
        .map((t) => currentCurve.get(t))
        .reduce(
          (acc, item, index, items) => {
            return {
              x: (acc.x + item.x) / (index < items.length - 1 ? 1 : items.length),
              y: (acc.y + item.y) / (index < items.length - 1 ? 1 : items.length),
              t: (acc.t + item.t) / (index < items.length - 1 ? 1 : items.length),
            };
          },
          { x: 0, y: 0, t: 0 }
        );

      if (intersect.x !== 0 && intersect.y !== 0) {
        computedIntersect = { intersect, curveIndex };
        break;
      }
    }

    return computedIntersect;
  }

  findOutIntersects(p1, p2) {
    const erasingCurve = new Bezier(p1.x, p1.y, (p1.x + p2.x) / 2, (p1.y + p2.y) / 2, p2.x, p2.y);

    for (const object of this.erasableObjects) {
      const segments = [];

      let segment = object.segments.shift();
      if (!segment) continue;

      do {
        const intersect = this.computeIntersect(segment, erasingCurve);
        if (intersect) {
          console.log("intersect", intersect);
          this.intersectsPoints.push(intersect.intersect);
          const curve = object.segments[intersect.curveIndex];

          segments.push(segment);
        } else {
          segments.push(segment);
        }

        segment = object.segments.shift();
      } while (segment);

      object.segments = segments;
    }
  }

  _findClosestCurvePoints(mouse) {
    const eraserWidth = this.eraserWidth * this.viewport.scale * window.devicePixelRatio;
    for (const object of this.erasableObjects) {
      const found = {
        segmentIndex: -1,
        curveIndex: -1,
        curvePoint: { x: Infinity, y: Infinity, d: Infinity },
      };

      object.segments.forEach((segment, segmentIndex) => {
        segment.forEach((curve, curveIndex) => {
          const point = curve.project(mouse);
          if (point.d < eraserWidth && point.d < found.curvePoint.d) {
            found.segmentIndex = segmentIndex;
            found.curveIndex = curveIndex;
            found.curvePoint = point;
          }
        });
      });

      if (found.curvePoint.x !== Infinity && found.curvePoint.y !== Infinity) {
        // this.intersectsPoints.push(found.curvePoint);
        const curve = object.segments[found.segmentIndex][found.curveIndex];
        const curveLenght = curve.length();
        if (curveLenght <= eraserWidth) {
          // remove curve
          object.segments[found.segmentIndex].splice(found.curveIndex, 1);
        } else {
          // split curve
          const eraserWidthT = curveLenght / 100 / eraserWidth;
          const { right } = curve.split(found.curvePoint.t + eraserWidthT / 2);
          const { left } = curve.split(found.curvePoint.t - eraserWidthT / 2);
          object.segments[found.segmentIndex].splice(found.curveIndex, 1, right, left);
        }
      }
    }
  }

  findClosestCurvePoints(mouse) {
    const eraserWidth = this.eraserWidth * this.viewport.scale * window.devicePixelRatio;
    for (const object of this.erasableObjects) {
      const found = {
        segmentIndex: -1,
        curveIndex: -1,
        curvePoint: { x: Infinity, y: Infinity, d: Infinity },
      };

      object.segments.forEach((segment, segmentIndex) => {
        segment.forEach((curve, curveIndex) => {
          const point = curve.project(mouse);
          if (point.d < eraserWidth && point.d < found.curvePoint.d) {
            found.segmentIndex = segmentIndex;
            found.curveIndex = curveIndex;
            found.curvePoint = point;
          }
        });
      });

      if (found.curvePoint.x !== Infinity && found.curvePoint.y !== Infinity) {
        // this.intersectsPoints.push(found.curvePoint);
        const curve = object.segments[found.segmentIndex][found.curveIndex];
        const curveLenght = curve.length();
        if (curveLenght <= eraserWidth) {
          // remove curve
          object.segments[found.segmentIndex].splice(found.curveIndex, 1);
        } else {
          // split curve
          const curveWidthT = curveLenght / 100 / object.lineWidth;
          const eraserWidthT = curveLenght / 100 / eraserWidth + curveWidthT / 2;
          const { right } = curve.split(found.curvePoint.t + eraserWidthT / 2);
          const { left } = curve.split(found.curvePoint.t - eraserWidthT / 2);
          object.segments[found.segmentIndex].splice(found.curveIndex, 1, right, left);
        }
      }
    }
  }
 */

  findIntersects(p1, p2) {
    if (p1.x === p2.x && p1.y === p2.y) return;
    const eraserWidth = Math.round(this.eraserWidth * this.viewport.scale * window.devicePixelRatio);
    const lineCurve = new Bezier(p1.x, p1.y, (p1.x + p2.x) / 2, (p1.y + p2.y) / 2, p2.x, p2.y);
    // console.log("point1 - 2", { p1, p2 });
    const eraserCurves = lineCurve.outline(eraserWidth);
    const eraserLines = eraserCurves.curves.map((curve) => {
      return { op1: curve.points[0], op2: curve.points[2] };
    });
    console.log("eraserCurves", eraserLines);

    for (const object of this.erasableObjects) {
      const objectSegments = [];
      object.segments.forEach((segment, segmentIndex) => {
        const segments = [];
        segment.forEach((curve, curveIndex, curves) => {
          console.log(object.id, object.segments.length, curves.length);
          // find && compute intersects
          for (const eraserLine of eraserLines) {
            const intersects = curve.intersects({ p1: eraserLine.op1, p2: eraserLine.op2 });
            if (intersects.length) {
              this.intersectsPoints.push(...intersects.map((t) => curve.get(t)));
            }
          }
          segments.push(curve);
        });
        objectSegments.push(segments);
      });
      object.segments = objectSegments;
    }
  }

  computeCurveIntersects(curve, intersects) {
    const eraserWidth = Math.round(this.eraserWidth * this.viewport.scale * window.devicePixelRatio);
    // const lineCurve = new Bezier(p1.x, p1.y, (p1.x + p2.x) / 2, (p1.y + p2.y) / 2, p2.x, p2.y);
    const curves = [];

    intersects.forEach((t, index, array_t) => {
      const length = curve.length();
      if (length <= eraserWidth) return;
      //
      curves.push(curve);
    });
    return [];
  }

  onMouseDown(e) {
    this.undoData = this.toJSON();

    this.mouseDown = true;
    this.mouseMoved = false;

    this.erasingPath = [];
    this.intersectsPoints = [];
    this.pathPoints = [];
    this.controlPoints = [];
    const point = this.getRelativePoint(e);
    this.erasingPath = [point];
    // this.findClosestCurvePoints(point);
    // const firstPoint = this.erasingPath[0];
    // const lastPoint = this.erasingPath[this.erasingPath.length - 1];
    // this.findIntersects(firstPoint, lastPoint);
  }

  thresholdFlag = false;
  thresholdTimer = null;

  onMouseMove(e) {
    const point = this.getRelativePoint(e);
    this.eraserPointer = point;
    if (!this.mouseDown) return;
    this.mouseMoved = true;
    this.erasingPath.push(point);

    if (this.thresholdFlag === true) return;
    this.thresholdFlag = true;

    clearTimeout(this.thresholdTimer);
    this.thresholdTimer = setTimeout(() => {
      // const firstPoint = this.erasingPath[0];
      // const lastPoint = this.erasingPath[this.erasingPath.length - 1];
      // this.findIntersects(firstPoint, lastPoint);
      // this.erasingPath.length = 0;

      // this.findClosestCurvePoints(point);
      this.thresholdFlag = false;
    }, 10);
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

  drawPoint(ctx, point, color = "#000000", radius = 3) {
    ctx.beginPath();
    ctx.fillStyle = color;
    ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.closePath();
  }

  drawInk(ctx, object) {
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    const alpha = colord(object.color).alpha();
    const color = colord(object.color).alpha(1).toHex();
    ctx.globalCompositeOperation = alpha < 1 ? "xor" : "source-over";
    ctx.globalAlpha = alpha;

    ctx.strokeStyle = hexColor2RGBA(color);
    ctx.lineWidth = object.lineWidth * this.viewport.scale * window.devicePixelRatio;

    for (const segment of object.segments) {
      for (const curve of segment) {
        ctx.beginPath();
        let p = curve.points;
        ctx.moveTo(p[0].x, p[0].y);
        if (p.length === 3) ctx.quadraticCurveTo(p[1].x, p[1].y, p[2].x, p[2].y);
        ctx.stroke();
        ctx.closePath();
      }
    }
    ctx.globalAlpha = 1;

    ctx.lineWidth = 4;
    ctx.strokeStyle = "red";
    for (const segment of object.segments) {
      for (const curve of segment) {
        ctx.beginPath();
        let p = curve.points;
        ctx.moveTo(p[0].x, p[0].y);
        if (p.length === 3) ctx.quadraticCurveTo(p[1].x, p[1].y, p[2].x, p[2].y);
        ctx.stroke();
        ctx.closePath();
      }
    }
  }

  drawPath(ctx, color, _lineWidth, path) {
    if (path.length === 0) return;
    this.pathPoints = this.pathPoints.concat(path.slice());

    let lineWidth = _lineWidth * this.viewport.scale * window.devicePixelRatio;
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
    } else if (path.length > 1) {
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      for (let i = 1, len = path.length; i < len; i++) {
        const mp = { x: (p2.x + p1.x) / 2, y: (p2.y + p1.y) / 2 };
        ctx.quadraticCurveTo(p1.x, p1.y, mp.x, mp.y);
        this.controlPoints.push(p1);
        this.middlePoints.push(mp);
        p1 = path[i];
        p2 = path[i + 1];
      }
      this.controlPoints.push(p1);
      ctx.lineTo(p1.x, p1.y);
    }
    ctx.stroke();
    ctx.closePath();
  }

  drawLines(ctx, color, _lineWidth, path) {
    if (!path || path.length < 2) return;

    let lineWidth = _lineWidth * this.viewport.scale * window.devicePixelRatio;
    lineWidth = 30;
    ctx.strokeStyle = hexColor2RGBA(color);
    ctx.fillStyle = hexColor2RGBA(color);
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.lineWidth = lineWidth;

    let point = path[0];
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
    for (point of path) {
      ctx.lineTo(point.x, point.y);
    }
    ctx.stroke();
    ctx.closePath();
  }

  drawEraserPointer(ctx, point) {
    if (!ctx) return;

    const radius = this.eraserWidth * this.viewport.scale * window.devicePixelRatio;

    ctx.beginPath();
    // const gradient = ctx.createRadialGradient(point.x, point.y, 10, point.x, point.y, radius);
    // gradient.addColorStop(0, "#707070FF");
    // gradient.addColorStop(1, "#FFFFFF00");

    ctx.fillStyle = "black";
    ctx.lineWidth = 2;
    ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
    // ctx.fill();
    ctx.stroke();
    ctx.closePath();
  }

  draw(ctx) {
    this.pathPoints = [];
    this.controlPoints = [];
    this.middlePoints = [];

    this.erasableObjects.forEach((object) => {
      switch (object.__typename) {
        case ANNOTATION_TYPES.INK: {
          // const paths = this.convertBezier2Paths(object);
          // paths.forEach((path) => {
          //   this.drawPath(ctx, object.color, object.lineWidth, path);
          // });
          this.drawInk(ctx, object);
          break;
        }
      }
    });

    // for (const point of this.erasingPath) {
    //   this.drawPoint(ctx, point, "green", 3);
    // }
    for (const point of this.intersectsPoints) {
      this.drawPoint(ctx, point, "red", 10);
    }

    this.drawLines(ctx, "#ffffff", this.eraserWidth, this.erasingPath);
    ctx.clip();

    // for (const point of this.pathPoints) {
    //   this.drawPoint(ctx, point, "lime", 20);
    // }
    // for (const point of this.controlPoints) {
    //   this.drawPoint(ctx, point, "green", 15);
    // }
    // for (const point of this.middlePoints) {
    //   this.drawPoint(ctx, point, "lightblue", 10);
    // }

    if (this.eraserPointer) this.drawEraserPointer(ctx, this.eraserPointer);
  }
}

export default PixelEraser;
