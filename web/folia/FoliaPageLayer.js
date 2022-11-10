import * as paper from "paper";
import {
  FoliaArrow,
  FoliaCircle,
  FoliaSquare
} from './annotations/folia-annotation-factory'

class FoliaPageLayer {
  _initialized = false
  _cancelled = false
  div = null
  pageNumber;
  foliaCore = null
  paperScope = null

  constructor(props) {
    // console.log('FoliaPageLayer constructor', props)
    this.viewport = {width: 0, height: 0}
    this.pageDiv = props.pageDiv
    this.pdfPage = props.pdfPage
    this.pageNumber = props.pdfPage.pageNumber - 1
    this.annotationStorage = props.annotationStorage
    this.linkService = props.linkService
    this.foliaCore = props.linkService.foliaCore
  }

  initialize() {
    if (!this.pageDiv) return
    const canvas = document.createElement('canvas')
    const canvasWidth = this.pageDiv.clientWidth
    const canvasHeight = this.pageDiv.clientHeight
    canvas.width = canvasWidth
    canvas.height = canvasHeight
    canvas.className = 'folia-layer-canvas'
    this.pageDiv.appendChild(canvas)
    this.viewport = {width: canvasWidth, height: canvasHeight}

    const paperScope = new paper.PaperScope()
    paperScope.setup(canvas)
    paperScope.settings.insertItems = false
    paperScope.project.activeLayer.onClick = (e) => {
      e.stopPropagation()
    }
    canvas.onclick = (e) => {
      console.log('OnClick on layer', e.target, this.paperScope.project.activeLayer.getItems({selected: true}))
    }
    this.paperScope = paperScope
    // console.log('FoliaPageLayer initialize', this.pageNumber, paperScope)
    this._initialized = true
  }

  async render() {
    if (!this._initialized) this.initialize()

    const annotations = await this.foliaCore.getPageAnnotations(this.pageNumber)
    const activeLayer = this.paperScope.project.activeLayer
    if (!activeLayer) return
    const paperObjects = activeLayer.getItems({})
    if (annotations.length === 0 && paperObjects.length > 0) {
      paperObjects.forEach(obj => obj.remove())
      return console.log('FoliaPageLayer clear layer', this.pageNumber, paperObjects)
    }
    console.log('FoliaPageLayer render', this.pageNumber, paperObjects)
    for (const annotation of annotations) {
      let paperObject = paperObjects.find(obj => obj.annotation.localId === annotation.localId)
      if (paperObject && annotation.deleted === 0) {
        console.log('\tFoliaPageLayer render update', paperObject)
      } else if (paperObject && annotation.deleted === 1) {
        console.log('\tFoliaPageLayer render delete', paperObject)
        paperObject.remove()
      } else if (!paperObject) {
        let item
        switch (annotation.annoType) {
          case 'arrow': {
            item = new FoliaArrow(annotation, this.viewport)
            break
          }
          case 'circle': {
            item = new FoliaCircle(annotation, this.viewport)
            break
          }
          case 'square': {
            item = new FoliaSquare(annotation, this.viewport)
            break
          }
          default: {
            item = new FoliaSquare(annotation, this.viewport)
            break
          }
        }
        if (item) activeLayer.addChild(item)
        console.log('\tFoliaPageLayer render create', annotation.annoType, this.viewport)
      }
    }
  }

  async cancel() {
    console.log('FoliaPageLayer cancel')
    this._cancelled = true;
  }

  async hide() {
    console.log('FoliaPageLayer hide')
    if (!this.div) {
      return;
    }
    this.div.hidden = true;
  }
}

export default FoliaPageLayer
