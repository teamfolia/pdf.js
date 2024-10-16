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
      this.canvas.width = this.foliaPageLayer.parentNode.clientWidth * window.devicePixelRatio;
      this.canvas.height = this.foliaPageLayer.parentNode.clientHeight * window.devicePixelRatio;
      this.canvas.style.width = this.foliaPageLayer.parentNode.clientWidth + "px";
      this.canvas.style.height = this.foliaPageLayer.parentNode.clientHeight + "px";
      this.canvas.onmousedown = this.onMouseDown.bind(this);
      this.canvas.onmousemove = this.onMouseMove.bind(this);
      this.canvas.onmouseup = this.onMouseUp.bind(this);
      this.canvas.onmouseover = this.onMouseOver.bind(this);
      this.canvas.onmouseout = this.onMouseOut.bind(this);

      // Mobile Browsers
      this.canvas.ontouchstart = this.onMouseDown.bind(this); 
      this.canvas.ontouchmove = this.onMouseMove.bind(this);
      this.canvas.ontouchend = this.onMouseUp.bind(this); 
      this.canvas.touchcancel =  this.onMouseUp.bind(this);
      
      this.canvas.style.backgroundColor = "rgba(0, 0, 0, 0)";
    }

    this.foliaPageLayer.parentNode.appendChild(this.canvas);
  }

  stop() {
    this.foliaPageLayer.parentNode
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
    for (const annoObject of this.foliaPageLayer.objects) {
      if (!annoObject) continue;
      if (["CommentAnnotation"].includes(annoObject.__typename)) continue;
      if (annoObject.isDeleted) continue;

      const { left, top, right, bottom } = annoObject.annotationUI?.getBoundingClientRect();
      if (x + 12 > left && x + 5 < right && y + 21 > top && y + 21 < bottom) {
        intersected.add(annoObject);
      }
    }

    return intersected;
  }

  onMouseOver(e) {}

  onMouseOut(e) {}

  onMouseDown(e) {
    this.canvas.classList.replace("off", "on");
    this.startErasing = true;
    this.mouseMoved = false;
  }

  onMouseMove(e) {
    if (this.startErasing) {
      this.mouseMoved = true;
      const objects = this.findOutIntersects(e);
      objects.forEach((annoObject) => this.foliaPageLayer.deleteSelectedObjects(annoObject));
    }
  }

  onMouseUp(e) {
    if (!this.mouseMoved) {
      const annoObject = Array.from(this.findOutIntersects(e)).pop();
      if (annoObject) this.foliaPageLayer.deleteSelectedObjects(annoObject);
    }
    this.startErasing = false;
    this.mouseMoved = false;

    this.canvas.classList.replace("on", "off");
  }

  draw(ctx) {
    if (this.showPointer) {
      const point = this.getRelativePoint(e);
      const x = point.x * window.devicePixelRatio;
      const y = point.y * window.devicePixelRatio;
    }
  }

  applyPreset() {}
}

export default ObjectEraser;
