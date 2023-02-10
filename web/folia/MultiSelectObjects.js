class MultipleSelect {
  #objects = new Set();
  lastBounds;

  constructor(viewport, eventBus) {
    this.viewport = viewport;
    this.eventBus = eventBus;
  }
  getObjects() {
    return Array.from(this.#objects);
  }
  prepare2moving = (startPoint) => {
    this.#objects.forEach((obj) => {
      obj.memorizeMovingOffset(startPoint);
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
      this.deleteObject(obj);
    });
    this.lastBounds = this.bounds;
  };
  startEditMode = (annoObject) => {
    if (!this.includes(annoObject)) this.addObject(annoObject);
    annoObject.startEditMode();
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
  updateObjectsDrawingProperties(data) {
    const promises = [];
    for (const obj of this.#objects) {
      promises.push(obj.editableProperties.set(data));
    }

    return promises;
  }
  hideFloatingBar() {
    this.eventBus.dispatch("floatingbarhide");
  }
  showFloatingBar() {
    this.eventBus.dispatch("floatingbarshow", { objects: this.getObjects() });
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
