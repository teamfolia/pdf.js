class ObjectEraser {
  viewport;
  showPointer = false;

  constructor(foliaPageLayer, BuildingClass, undoRedoManager) {
    this.foliaPageLayer = foliaPageLayer;
    this.viewport = foliaPageLayer.viewport.clone({ dontFlip: true });
    const image = new Image();
    image.src = "";
    image.onload = () => {
      this.pointerImage = image;
    };
    this.resume();
  }

  resume() {
    if (!this.canvas) {
      this.canvas = document.createElement("canvas");
      this.canvas.className = "annotation-builder-container eraser off";
      this.canvas.width = this.foliaPageLayer.pageDiv.clientWidth * window.devicePixelRatio;
      this.canvas.height = this.foliaPageLayer.pageDiv.clientHeight * window.devicePixelRatio;
      this.canvas.style.width = this.foliaPageLayer.pageDiv.clientWidth + "px";
      this.canvas.style.height = this.foliaPageLayer.pageDiv.clientHeight + "px";
      this.canvas.onmousedown = this.onMouseDown.bind(this);
      this.canvas.onmousemove = this.onMouseMove.bind(this);
      this.canvas.onmouseup = this.onMouseUp.bind(this);
      this.canvas.onmouseover = this.onMouseOver.bind(this);
      this.canvas.onmouseout = this.onMouseOut.bind(this);
      this.canvas.style.backgroundColor = "rgba(0, 0, 0, 0)";
    }

    this.foliaPageLayer.pageDiv.appendChild(this.canvas);
  }

  stop() {
    this.foliaPageLayer.pageDiv
      .querySelectorAll(".annotation-builder-container")
      .forEach((el) => el.remove());
    this.canvas = null;
    this.newbieAnnotationsData = [];
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

  findOutIntersects(mouseEvent) {
    const sensitivity = 0;
    const intersected = new Set();
    const { x, y } = mouseEvent;
    for (const [annoId, anno] of this.foliaPageLayer.annotationObjects) {
      if (!anno) continue;
      if (["CommentAnnotation"].includes(anno.annotationRawData.__typename)) continue;
      if (anno.isDeleted) continue;

      const { left, top, right, bottom } = anno.annotationDIV.getBoundingClientRect();
      if (x + 12 > left && x + 5 < right && y + 21 > top && y + 21 < bottom) {
        intersected.add(anno);
      }
    }

    return intersected;
  }

  onMouseOver(e) {
    this.showPointer = true;
    this.drawPointer(e);
  }

  onMouseOut(e) {
    this.showPointer = false;
    this.drawPointer(e);
    this.foliaPageLayer.eventBus.dispatch("stop-drawing");
  }

  onMouseDown(e) {
    this.canvas.classList.replace("off", "on");
    this.startErasing = true;
    this.mouseMoved = false;
    this.drawPointer(e);
  }

  onMouseMove(e) {
    this.drawPointer(e);
    if (this.startErasing) {
      this.mouseMoved = true;
      const objects = this.findOutIntersects(e);
      objects.forEach((anno) => this.foliaPageLayer.deleteSelectedAnnotations(anno));
    }
  }

  onMouseUp(e) {
    if (!this.mouseMoved) {
      const object = Array.from(this.findOutIntersects(e)).pop();
      if (object) this.foliaPageLayer.deleteSelectedAnnotations(object);
    }
    this.startErasing = false;
    this.mouseMoved = false;
    this.drawPointer(e);
    this.canvas.classList.replace("on", "off");
  }

  drawPointer(e) {
    if (!this.canvas) return;
    const ctx = this.canvas.getContext("2d");
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    if (this.showPointer) {
      const point = this.getRelativePoint(e);
      const x = point.x * window.devicePixelRatio;
      const y = point.y * window.devicePixelRatio;
    }
  }
}

export default ObjectEraser;
