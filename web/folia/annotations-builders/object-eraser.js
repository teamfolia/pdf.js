class ObjectEraser {
  viewport;
  showPointer = false;
  intersected = new Set();

  constructor(foliaPageLayer, BuildingClass, undoRedoManager) {
    this.foliaPageLayer = foliaPageLayer;
    this.viewport = foliaPageLayer.viewport.clone({ dontFlip: true });
    this.resume();
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

  findOutIntersects(e, onlyTopRemove = false) {
    const { x, y } = e;
    for (const [annoId, anno] of this.foliaPageLayer.annotationObjects) {
      if (["CommentAnnotation"].includes(anno?.annotationRawData?.__typename)) continue;
      const { left, top, right, bottom } = anno.annotationDIV.getBoundingClientRect();
      if (x + 15 > left && x - 15 < right && y + 15 > top && y - 15 < bottom) {
        this.intersected.add(anno);
      } else {
        this.intersected.delete(anno);
      }
    }
  }

  onMouseOver(e) {
    this.showPointer = true;
    this.drawPointer(e);
    // console.log("onMouseOver");
  }

  onMouseOut(e) {
    this.showPointer = false;
    this.drawPointer(e);
    // console.log("onMouseOut");
  }

  onMouseClick(e) {
    e.preventDefault();
    e.stopPropagation();
    this.findOutIntersects(e, true);
    const topAnno = Array.from(this.intersected).pop();
    // console.log("onMouseClick - erase", topAnno);
    if (topAnno) this.foliaPageLayer.deleteSelectedAnnotations(topAnno);
  }

  onMouseDown(e) {
    this.startErasing = true;
    this.drawPointer(e);
  }

  onMouseMove(e) {
    this.drawPointer(e);
    this.findOutIntersects(e);
    if (this.startErasing) {
      // console.log("onMouseMove - erase", Array.from(this.intersected).join(", "));
      this.intersected.forEach((anno) => this.foliaPageLayer.deleteSelectedAnnotations(anno));
    }
  }

  onMouseUp(e) {
    this.startErasing = false;
    this.intersected = new Set();
    this.drawPointer(e);
    // console.log("onMouseUp");
  }

  drawPointer(e) {
    if (!this.canvas) return;
    const ctx = this.canvas.getContext("2d");
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    if (this.showPointer) {
      const point = this.getRelativePoint(e);
      ctx.beginPath();
      ctx.arc(point.x, point.y, 15, 0, 2 * Math.PI);
      ctx.fillStyle = this.startErasing ? "rgba(0, 0, 0, 0.90)" : "rgba(0, 0, 0, 0.35)";
      ctx.fill();
      ctx.closePath();
    }
  }
}

export default ObjectEraser;
