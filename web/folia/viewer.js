import FoliaPDFViewerApp from "./folia_app.js";
import PDFJSDev from './PDFJSDev'
import FoliaAPI from './folia_api'

import '../pdf_viewer.css'


document.addEventListener("DOMContentLoaded", function () {
  window.PDFJSDev = new PDFJSDev()
  const config = {
    mainContainer: document.querySelector('#viewerContainer'),
    viewerContainer: document.querySelector('#viewer.pdfViewer'),
  }
  const foliaAPI = new FoliaAPI()
  const foliaPDFViewerApp = new FoliaPDFViewerApp(config, foliaAPI)
  foliaAPI.retrieveDocument('vitalii@folia.com', 'pass2002', 'lUgpF520', 7)
    .then(data => {
      if (!data) return
      const {pdfBlob, annotations} = data
      console.log(data)
      return foliaPDFViewerApp.open(pdfBlob, annotations)
    })
    .then(() => {
      addAppListeners(foliaPDFViewerApp)
      addUIListeners(foliaPDFViewerApp)
    })
    .catch(console.error)
  // console.log('DOMContentLoaded', config, foliaPDFViewerApp)
}, true)

function addAppListeners(app) {
  app.eventBus.on('scalechanging', () => {
    document.querySelector('#zoom-value').innerHTML = app.zoom
  })
  app.eventBus.on('pagechanging', () => {
    document.querySelector('#current-page').innerHTML = app.page
  })
  app.eventBus.on('documentloaded', () => {
    document.querySelector('#current-page').innerHTML = app.page
    document.querySelector('#total-pages').innerHTML = app.pagesCount
  })
}

function addUIListeners(app) {
  document.querySelector('#zoomInBtn').addEventListener('click', () => {
    console.log('zoomInBtn')
    app.zoomIn()
  })
  document.querySelector('#zoomOutBtn').addEventListener('click', () => {
    console.log('zoomOutBtn')
    app.zoomOut()
  })
  document.querySelector('#zoomResetBtn').addEventListener('click', () => {
    console.log('zoomResetBtn')
    app.zoomReset()
  })
}
