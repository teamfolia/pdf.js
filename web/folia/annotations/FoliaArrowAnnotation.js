import * as paper from "paper";
import {
  pdfRect2viewRect, pdfPoint2viewPoint
} from '../folia-util'

class FoliaArrowAnnotation extends paper.Path.Line {
  constructor(annotation, viewport) {
    const [left, top, width, height] = pdfRect2viewRect(annotation.rect, viewport)
    const fromPoint = pdfPoint2viewPoint(annotation.linePoint1, viewport)
    const toPoint = pdfPoint2viewPoint(annotation.linePoint2, viewport)
    super({
      from: fromPoint ,
      to: toPoint,
      fillColor: 'rgba(100, 50, 0, 0.4)',
      strokeColor: 'blue',
      strokeWidth: annotation.penWidth,
    })
    console.log('FoliaCircleAnnotation->constructor', annotation, viewport)
    this.strokeCap = 'round'
    this.data.annotation = annotation
  }

}

export default FoliaArrowAnnotation
