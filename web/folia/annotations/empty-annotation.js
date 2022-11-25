import FoliaBaseAnnotation from "./base-annotation";

class FoliaEmptyAnnotation extends FoliaBaseAnnotation {

  constructor(annotationRawData, viewport, foliaLayer) {
    super(annotationRawData, viewport, foliaLayer)
  }

  render(viewport, annotationRawData) {
    this.updateAnnotationRawData(annotationRawData)
    this.updateDimensions(viewport)
    this.drawAnnotationData()
  }
  drawAnnotationData() {
    this.annotationDIV.style.backgroundPosition = 'center'
    this.annotationDIV.style.backgroundSize = `${this.annotationDIV.clientWidth}px ${this.annotationDIV.clientHeight}px`
    this.annotationDIV.style.backgroundRepeat = 'no-repeat'
    this.annotationDIV.style.backgroundImage = 'url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAABmJLR0QAAAAAAAD5Q7t/AAAACXBIWXMAAABgAAAAYADwa0LPAAABDElEQVRIx92UTQ4BQRCFv4TdHEAcQMQNRGJPLCQicQqcQMQS9+AONi4xJ2ASW6ywwEKNn4nWVRMbXtKL6X71Xnf1vIZ/QgOIgIuMNVBX1gZAx0daP4nHY6U0mAl/8IkUi7q+XegLbw+Uvm1QBo7AGWj7dnJxDBdyPO5srOmjxSADLGR9CWQtBpoWTWVtA+Q14haDJreen4CqVlxrUAC2Mt+1iGsMAiCUublVXIM4TKGYJTeS5gW4oyfFO6DoOHmaFwDwhyntCwC8hmni4LwzOGjEs9xC5AtTsj0HYKgxmEhBJCdxIWlwBEY+8RaPMFU8XHOLrGEyX/JACDNNH0n5m3Z4DZPFYAXUlLU/gCuhHYwSk2Ap1AAAACV0RVh0ZGF0ZTpjcmVhdGUAMjAyMi0xMS0yMVQxMzo0ODoxMCswMDowMKV8q2oAAAAldEVYdGRhdGU6bW9kaWZ5ADIwMjItMTEtMjFUMTM6NDg6MTArMDA6MDDUIRPWAAAAAElFTkSuQmCC")'
    // this.annotationDIV.style.backgroundImage = 'url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZD0iTTQgMkEyIDIgMCAwIDAgMiA0VjEySDRWOEg2VjEySDhWNEEyIDIgMCAwIDAgNiAySDRNNCA0SDZWNkg0TTIyIDE1LjVWMTRBMiAyIDAgMCAwIDIwIDEySDE2VjIySDIwQTIgMiAwIDAgMCAyMiAyMFYxOC41QTEuNTQgMS41NCAwIDAgMCAyMC41IDE3QTEuNTQgMS41NCAwIDAgMCAyMiAxNS41TTIwIDIwSDE4VjE4SDIwVjIwTTIwIDE2SDE4VjE0SDIwTTUuNzkgMjEuNjFMNC4yMSAyMC4zOUwxOC4yMSAyLjM5TDE5Ljc5IDMuNjFaIiAvPjwvc3ZnPg==")'
  }
}

export default FoliaEmptyAnnotation
