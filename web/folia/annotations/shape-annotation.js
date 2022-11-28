import {pdfColor2rgba, pdfPoint2viewPoint} from "../folia-util";
import FoliaBaseAnnotation from "./base-annotation";

class FoliaShapeAnnotation extends FoliaBaseAnnotation {

  constructor(annotationRawData, viewport, foliaLayer) {
    super(annotationRawData, viewport, foliaLayer)
  }

  render(viewport, annotationRawData) {
    this.updateAnnotationRawData(annotationRawData)
    this.updateDimensions(viewport)
    this.drawAnnotationData()
  }
  updateDimensions(viewport) {
    this.viewport = viewport
    if (this.annotationRawData.annoSubType === 'circle') {
      super.updateDimensions(viewport)
    }
    else if (this.annotationRawData.annoSubType === 'square') {
      super.updateDimensions(viewport)
    }
    else if (this.annotationRawData.annoSubType === 'arrow') {

      const pdfLinePoint1 = {x: this.annotationRawData.linePoint1[0], y: this.annotationRawData.linePoint1[1]}
      const pdfLinePoint2 = {x: this.annotationRawData.linePoint2[0], y: this.annotationRawData.linePoint2[1]}
      const linePoint1 = pdfPoint2viewPoint(pdfLinePoint1, this.viewport)
      const linePoint2 = pdfPoint2viewPoint(pdfLinePoint2, this.viewport)
      const width = Math.sqrt(
        Math.pow(linePoint1.x - linePoint2.x, 2) + Math.pow(linePoint1.y - linePoint2.y, 2)
      )
      const correction = linePoint1.x > linePoint2.x && linePoint1.y > linePoint2.y ? -90
        : linePoint1.x > linePoint2.x && linePoint1.y < linePoint2.y ? 90 : 0
      const angle = Math.asin((linePoint2.y - linePoint1.y) / width) * 180 / Math.PI + correction

      const arrowWeight = this.annotationRawData.penWidth * this.viewport.scale * 5

      this.annotationDIV.style.left = `${linePoint1.x}px`
      this.annotationDIV.style.top = `${linePoint1.y - arrowWeight / 2}px`
      this.annotationDIV.style.height = `${arrowWeight}px`
      this.annotationDIV.style.width = `${width}px`
      this.annotationDIV.style.transformOrigin = 'center left'
      this.annotationDIV.style.transform = `rotate(${angle}deg)`
    }
    else {
      super.updateDimensions(viewport)
    }
  }
  drawAnnotationData() {
    this.annotationDIV.style.backgroundPosition = 'center'
    this.annotationDIV.style.backgroundSize = `${this.annotationDIV.clientWidth}px ${this.annotationDIV.clientHeight}px`
    this.annotationDIV.style.backgroundRepeat = 'no-repeat'
    if (this.annotationRawData.annoSubType === 'circle') {
      this.annotationDIV.style.backgroundImage = `url("${this.drawCircle()}")`
    } else if (this.annotationRawData.annoSubType === 'square') {
      this.annotationDIV.style.backgroundImage = `url("${this.drawSquare()}")`
    } else if (this.annotationRawData.annoSubType === 'arrow') {
      this.annotationDIV.style.backgroundImage = `url("${this.drawArrow()}")`
    }
  }

  drawCircle() {
    const canvas = document.createElement('canvas')
    canvas.width = this.annotationDIV.clientWidth
    canvas.height = this.annotationDIV.clientHeight
    const ctx = canvas.getContext('2d')
    ctx.strokeStyle = pdfColor2rgba(this.annotationRawData.color)
    ctx.lineWidth = this.annotationRawData.penWidth * this.viewport.scale
    const x = this.annotationDIV.clientWidth / 2
    const y = this.annotationDIV.clientHeight / 2
    const radiusX = x - ctx.lineWidth / 2
    const radiusY = y - ctx.lineWidth / 2
    ctx.ellipse(x, y, radiusX, radiusY, 0, 0, 180)
    ctx.stroke()
    return canvas.toDataURL('png')
  }
  drawSquare() {
    const canvas = document.createElement('canvas')
    canvas.width = this.annotationDIV.clientWidth
    canvas.height = this.annotationDIV.clientHeight
    const ctx = canvas.getContext('2d')
    ctx.strokeStyle = pdfColor2rgba(this.annotationRawData.color)
    ctx.lineWidth = this.annotationRawData.penWidth * this.viewport.scale
    ctx.strokeRect(0,0, this.annotationDIV.clientWidth, this.annotationDIV.clientHeight)
    return canvas.toDataURL('png')
  }
  drawArrow() {
    const canvas = document.createElement('canvas')
    canvas.width = this.annotationDIV.clientWidth
    canvas.height = this.annotationDIV.clientHeight
    const ctx = canvas.getContext('2d')
    ctx.strokeStyle = pdfColor2rgba(this.annotationRawData.color)
    ctx.lineWidth = this.annotationRawData.penWidth * this.viewport.scale
    ctx.lineCap='round'
    ctx.lineJoin = 'round'

    const startPoint = [ctx.lineWidth / 2, this.annotationDIV.clientHeight / 2]
    const endPoint = [this.annotationDIV.clientWidth - ctx.lineWidth / 2, this.annotationDIV.clientHeight / 2]

    var arrowheadFactor = 2.0
    var dx = endPoint[0] - startPoint[0]
    var dy = endPoint[1] - startPoint[1]
    var dlen = Math.sqrt(dx * dx + dy * dy)
    dx = dx / dlen
    dy = dy / dlen
    var headLen = arrowheadFactor * ctx.lineWidth
    var hpx0 = endPoint[0] + headLen * dy - headLen * dx
    var hpy0 = endPoint[1] - headLen * dx - headLen * dy
    var hpx1 = endPoint[0] - headLen * dy - headLen * dx
    var hpy1 = endPoint[1] + headLen * dx - headLen * dy

    ctx.beginPath();
    ctx.moveTo(startPoint[0], startPoint[1]);
    ctx.lineTo(endPoint[0], endPoint[1]);
    ctx.moveTo(hpx0, hpy0);
    ctx.lineTo(endPoint[0], endPoint[1]);
    ctx.lineTo(hpx1, hpy1);

    ctx.stroke()
    return canvas.toDataURL('png')
  }
}

export default FoliaShapeAnnotation
