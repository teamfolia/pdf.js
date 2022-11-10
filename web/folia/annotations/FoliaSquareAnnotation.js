import * as paper from "paper";
import {
  pdfRect2viewRect, pdfPoint2viewPoint
} from '../folia-util'

class FoliaSquareAnnotation extends paper.Path.Rectangle {
  constructor(annotation, viewport) {
    const [left, top, width, height] = pdfRect2viewRect(annotation.rect, viewport)
    super({
      from: [left, top] ,
      to: [left + width, top + height],
      fillColor: 'rgba(100, 50, 0, 0.4)',
      strokeColor: 'blue',
      strokeWidth: annotation.penWidth,
    })
    console.log('FoliaCircleAnnotation->constructor', annotation, viewport)
    this.data.annotation = annotation
  }

}

export default FoliaSquareAnnotation
