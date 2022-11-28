import {blob2base64, pdfColor2rgba, pdfPoint2viewPoint} from "../folia-util";
import {FOLIA_LAYER_ROLES} from "../FoliaPageLayer";
import FoliaBaseAnnotation from "./base-annotation";

class FoliaImageStampAnnotation extends FoliaBaseAnnotation {
  image;
  imageSrc;

  constructor(annotationRawData, viewport, foliaLayer) {
    super(annotationRawData, viewport, foliaLayer)
    const image = document.createElement('img')
    image.setAttribute('data-local-id', `${this.annotationRawData.localId}`)
    image.setAttribute('data-role', FOLIA_LAYER_ROLES.ANNOTATION_OBJECT)
    image.classList.add('image-stamp')
    this.image = image
    this.annotationDIV.appendChild(image)
  }

  render(viewport, annotationRawData) {
    this.updateAnnotationRawData(annotationRawData)
    this.updateDimensions(viewport)
    this.drawAnnotationData()
  }
  drawAnnotationData() {
    if (this.image && this.imageSrc) {
      this.image.src = this.imageSrc
      return;
    }

    this.image.classList.add('loading')
    this.getImageFromServer()
      .then(src => {
        this.image.classList.remove('loading')
        this.imageSrc = src
        this.image.src = this.imageSrc
      })
      .catch(console.log)
  }

  async getImageFromServer() {
    const {auth} = JSON.parse(localStorage.getItem('user'))
    const imageRef = this.annotationRawData.media_id
    const url = `https://dev.x.branchfire.com/b/media/${imageRef}/?v=8&auth=${auth}`
    const response = await fetch(url, {})
    const blob = await response.blob()
    const image = await blob2base64(blob)
    return image
  }
}

export default FoliaImageStampAnnotation
