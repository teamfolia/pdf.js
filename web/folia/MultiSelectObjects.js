class MultipleSelect {
  viewport;
  objects = new Set();
  lastBounds;

  constructor(viewport) {
    this.viewport = viewport
  }

  prepare2moving = (startPoint) => {
    this.objects.forEach(obj => {
      obj.memorizeMovingOffset(startPoint)
    })
  }

  moveTo = (point) => {
    this.objects.forEach(obj => {
      obj.moveTo(point)
    })
  }

  resizeTo(point, corner, withShift) {
    this.objects.forEach(obj => {
      obj.resizeTo(point, corner, withShift)
    })
  }

  pointTo(point, corner, withShift) {
    this.objects.forEach(obj => {
      obj.pointTo(point, corner, withShift)
    })
  }

  checkForOutOfBounds(margin = 5, role) {
    this.objects.forEach(obj => {
      obj.snapToBounds(margin, role)
    })
  }

  isEmpty = () => {
    return this.objects.size === 0
  }
  includes = (obj) => {
    return this.objects.has(obj)
  }

  clear = () => {
    this.objects.forEach(obj => {
      obj.markAsUnselected()
    })
    this.objects.clear()
    this.lastBounds = this.bounds
  }
  startEditMode = (annoObject, shiftKey) => {
    this.clear()
    this.addObject(annoObject)
    annoObject.startEditMode(shiftKey)
  }
  toggleObject = (obj, withShift) => {
    if (withShift) {
      if (this.objects.has(obj)) {
        this.deleteObject(obj)
      } else {
        this.addObject(obj)
      }
    }
    else {
      if (this.objects.has(obj)) {
        this.clear()
      } else {
        this.clear()
        this.addObject(obj)
      }
    }
    this.lastBounds = this.bounds
  }
  addObject(obj) {
    this.objects.add(obj)
    obj.markAsSelected()
  }
  deleteObject(obj) {
    this.objects.delete(obj)
    obj.markAsUnselected()
  }
  get bounds() {
    let left = this.viewport.width,
      top = this.viewport.height,
      right = 0,
      bottom = 0;

    for (const obj of this.objects) {
      left = Math.min(left, obj.rect.left)
      top = Math.min(top, obj.rect.top)
      right = Math.max(right, obj.rect.left + obj.rect.width)
      bottom = Math.max(bottom, obj.rect.top + obj.rect.height)
    }

    return {left, top, right, bottom}
  }
}

export default MultipleSelect
