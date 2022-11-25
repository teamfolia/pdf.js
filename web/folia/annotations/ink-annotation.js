import {pdfColor2rgba, pdfPath2viewPath, pdfPoint2viewPoint, viewPath2pdfPath} from "../folia-util";
import FoliaBaseAnnotation from "./base-annotation";

class FoliaInkAnnotation extends FoliaBaseAnnotation {
  relativeInkPaths = []

  constructor(annotation, viewport, foliaLayer) {
    super(annotation, viewport, foliaLayer)
  }

  render(viewport, annotationRawData) {
    this.updateAnnotationRawData(annotationRawData)
    this.updateDimensions(viewport)
    this.drawAnnotationData()
  }

  updateDimensions(viewport) {
    const {left, top, right, bottom} = [].concat.apply([], this.annotationRawData.paths)
      .reduce((acc, path, index, arr) => {
        if (index % 2 !== 0) {
          const point = {
            x: arr[index - 1], y: arr[index]
          }
          const viewportPoint = pdfPoint2viewPoint(point, this.viewport)
          return {
            left: Math.min(acc.left, viewportPoint.x),
            top: Math.min(acc.top, viewportPoint.y),
            right: Math.max(acc.right, viewportPoint.x),
            bottom: Math.max(acc.bottom, viewportPoint.y),
          }
        } else {
          return acc
        }
      }, {left: Infinity, right: -Infinity, top: Infinity, bottom: -Infinity})

    const lineWidth = this.annotationRawData.penWidth * this.viewport.scale
    this.annotationDIV.style.left = `${left - lineWidth}px`
    this.annotationDIV.style.top = `${top - lineWidth}px`
    this.annotationDIV.style.width = `${right + lineWidth*2 - left}px`
    this.annotationDIV.style.height = `${bottom + lineWidth*2 - top}px`

    const annotationViewportOffset = {x: this.annotationDIV.offsetLeft, y: this.annotationDIV.offsetTop}
    const annotationViewport = {width: this.annotationDIV.clientWidth, height: this.annotationDIV.clientHeight}
    this.relativeInkPaths = this.annotationRawData.paths.map(path => {
      const viewportPath = pdfPath2viewPath(path, this.viewport, annotationViewportOffset)
      return viewPath2pdfPath(viewportPath, annotationViewport)
    })
  }

  drawAnnotationData() {
    const canvas = document.createElement('canvas')
    canvas.width = this.annotationDIV.clientWidth
    canvas.height = this.annotationDIV.clientHeight
    canvas.style.border = 'solid 2px red'
    const ctx = canvas.getContext('2d')
    ctx.strokeStyle = pdfColor2rgba(this.annotationRawData.color)
    ctx.lineWidth = this.annotationRawData.penWidth * this.viewport.scale
    this.relativeInkPaths.forEach(path => {
      const annotationViewport = {
        width: this.annotationDIV.clientWidth, height: this.annotationDIV.clientHeight
      }
      ctx.save()
      const viewportPath = pdfPath2viewPath(path, annotationViewport)

      let p1 = viewportPath[0];
      let p2 = viewportPath[1];
      ctx.lineCap = "round"
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      for (let i = 1, len = viewportPath.length; i < len; i++) {
        const mp = {x: p1.x + (p2.x - p1.x) * 0.5, y: p1.y + (p2.y - p1.y) * 0.5}
        ctx.quadraticCurveTo(p1.x, p1.y, mp.x, mp.y)
        p1 = viewportPath[i]
        p2 = viewportPath[i + 1]
      }
      ctx.lineTo(p1.x, p1.y)
      ctx.stroke()
    })
    this.annotationDIV.style.backgroundImage = `url("${canvas.toDataURL('png')}")`
  }
}

export default FoliaInkAnnotation
