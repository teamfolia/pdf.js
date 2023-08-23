class MultipleSelect {
  #objects = new Set();
  lastBounds;

  constructor(viewport, eventBus, pageNumber) {
    this.viewport = viewport;
    this.eventBus = eventBus;
    this.pageNumber = pageNumber;
  }
  getObjects() {
    return Array.from(this.#objects);
  }
  prepare2moving = (startPoint) => {
    this.#objects.forEach((obj) => {
      obj.saveRectsState(startPoint);
    });
  };
  deleteFromCanvas() {
    this.#objects.forEach((obj) => {
      obj.removeFromCanvas(point);
    });
  }
  moveTo = (point) => {
    this.#objects.forEach((obj) => {
      obj.moveTo(point);
    });
  };
  resizeTo(point, corner, withAlt) {
    this.#objects.forEach((obj) => {
      obj.resizeTo(point, corner, withAlt);
    });
  }
  pointTo(point, corner, withAlt) {
    this.#objects.forEach((obj) => {
      obj.pointTo(point, corner, withAlt);
    });
  }
  checkForOutOfBounds(margin = 5, role) {
    this.#objects.forEach((obj) => {
      obj.snapToBounds(margin, role);
    });
  }
  isEmpty = () => {
    return this.#objects.size === 0;
  };
  includes = (obj) => {
    return this.#objects.has(obj);
  };
  clear = () => {
    this.#objects.forEach((obj) => {
      obj.stopEditMode();
      this.deleteObject(obj);
    });
    this.lastBounds = this.bounds;
  };
  startEditMode = (annoObject) => {
    if (!this.includes(annoObject)) this.addObject(annoObject);
    annoObject.startEditMode();
  };
  stopEditMode = (annoObject) => {
    // if (!this.includes(annoObject)) this.addObject(annoObject);
    annoObject.stopEditMode();
  };
  toggleObject = (obj, withShift) => {
    if (withShift) {
      if (this.#objects.has(obj)) {
        this.deleteObject(obj);
      } else {
        this.addObject(obj);
      }
    } else {
      if (this.#objects.has(obj)) {
        this.clear();
      } else {
        this.clear();
        this.addObject(obj);
      }
    }
    this.lastBounds = this.bounds;
  };
  addObject(obj) {
    this.#objects.add(obj);
    obj.markAsSelected();
  }
  deleteObject(obj) {
    this.#objects.delete(obj);
    obj.markAsUnselected();

    if (this.#objects.size === 0) {
      this.hideFloatingBar();
    } else {
      this.showFloatingBar();
    }
  }
  hideFloatingBar() {
    this.eventBus.dispatch("floatingbarhide");
  }
  showFloatingBar() {
    const objects = this.getObjects();
    if (objects.length === 0) return;
    this.eventBus.dispatch("floatingbarshow", { objects, pageNumber: this.pageNumber });
  }
  get bounds() {
    let left = this.viewport.width,
      top = this.viewport.height,
      right = 0,
      bottom = 0;

    for (const obj of this.#objects) {
      left = Math.min(left, obj.rect.left);
      top = Math.min(top, obj.rect.top);
      right = Math.max(right, obj.rect.left + obj.rect.width);
      bottom = Math.max(bottom, obj.rect.top + obj.rect.height);
    }

    return { left, top, right, bottom };
  }
}

export default MultipleSelect;
