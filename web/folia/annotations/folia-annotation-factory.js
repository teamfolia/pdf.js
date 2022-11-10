import FoliaArrowAnnotation from "./FoliaArrowAnnotation";
import FoliaCircleAnnotation from "./FoliaCircleAnnotation";
import FoliaInkAnnotation from "./FoliaInkAnnotation";
import FoliaSquareAnnotation from "./FoliaSquareAnnotation";

function foliaAnnotationFactory (AnnotationClass) {
  return class FoliaBaseAnnotation extends AnnotationClass {
    constructor(annotation, viewport) {
      super(annotation, viewport)
      console.log('FoliaBaseAnnotation', this)
      this.onMouseDown = this.#onMouseDown.bind(this)
      this.onMouseDrag = this.#onMouseDrag.bind(this)
      this.onMouseUp = this.#onMouseUp.bind(this)
      this.selectedColor = 'transparent'
    }

    #onMouseDown({delta, event, point, target, type}) {
      target.selected = true
      target.fillColor = 'rgba(100, 50, 0, 1)'
    }

    #onMouseDrag({delta, event, point, target, type}) {
      target.position.x += delta.x
      target.position.y += delta.y
    }

    #onMouseUp({delta, event, point, target, type}) {
      // target.selected = false
      target.fillColor = 'rgba(100, 50, 0, 0.4)'
    }
  }
}

export const FoliaSquare = foliaAnnotationFactory(FoliaSquareAnnotation)
export const FoliaCircle = foliaAnnotationFactory(FoliaCircleAnnotation)
export const FoliaArrow = foliaAnnotationFactory(FoliaArrowAnnotation)
export const FoliaInk = foliaAnnotationFactory(FoliaInkAnnotation)
