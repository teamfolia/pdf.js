import {pdfColor2rgba, pdfPath2viewPath, pdfPoint2viewPoint, viewPath2pdfPath} from "../folia-util";
import {FOLIA_LAYER_ROLES} from "../FoliaPageLayer";
import FoliaBaseAnnotation from "./base-annotation";

class FoliaTypewriterAnnotation extends FoliaBaseAnnotation {
  textArea
  editable = true // should be created toggleEditMode method

  FONT_WEIGHT = {
    1: 'bold',
    4: 'normal',
  }

  TEXT_ALIGNMENT = {
    1: 'left',
    2: 'right',
    3: 'center',
  }

  constructor(annotation, viewport, foliaLayer) {
    super(annotation, viewport, foliaLayer)
    const textArea = document.createElement('textarea')
    textArea.className = 'typewriter'
    // textArea.setAttribute('disabled', '')
    textArea.setAttribute('data-local-id', `${this.annotationRawData.localId}`)
    textArea.setAttribute('data-role', FOLIA_LAYER_ROLES.ANNOTATION_OBJECT)
    textArea.style.fontSize = `${this.annotationRawData.fontSize * this.viewport.scale}px`
    textArea.style.fontFamily = this.annotationRawData.fontName
    textArea.style.fontWeight = this.FONT_WEIGHT[this.annotationRawData.fontWeight]
    textArea.style.textAlign = this.TEXT_ALIGNMENT[this.annotationRawData.alignment]
    textArea.style.color = pdfColor2rgba(this.annotationRawData.color)
    textArea.value = this.annotationRawData.contents
    this.annotationDIV.appendChild(textArea)
    this.textArea = textArea
  }

  render(viewport, annotationRawData) {
    this.updateAnnotationRawData(annotationRawData)
    this.updateDimensions(viewport)
    this.drawAnnotationData()
    this.textArea.style.fontSize = `${this.annotationRawData.fontSize * this.viewport.scale}px`
  }

  drawAnnotationData() {
    this.textArea.style.left = '0px'
    this.textArea.style.top = '0px'
    this.textArea.style.width = `${this.annotationDIV.clientWidth}px`
    this.textArea.style.height = `${this.annotationDIV.clientHeight}px`
  }
  markAsUnselected() {
    super.markAsUnselected()
    this.textArea.blur()
  }
  startEditMode(shiftKey) {
    this.textArea.focus()
  }
  get isFocused() {
    return document.activeElement === this.textArea
  }
  onInput(e) {

  }
}

export default FoliaTypewriterAnnotation
