import paper from "paper";
import {
  pdfRect2viewRect, pdfPoint2viewPoint
} from '../folia-util'

class FoliaInkAnnotation extends paper.Shape.Ellipse {
  constructor(props) {
    super(props)
  }
}

export default FoliaInkAnnotation
