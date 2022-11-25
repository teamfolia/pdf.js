import PDFJSDev from './PDFJSDev'
import {
  AnnotationMode, getDocument,
} from "pdfjs-lib";
import {EventBus} from "../event_utils"
import {PDFFindController} from "../pdf_find_controller";
import {PDFHistory} from "../pdf_history";
import {PDFLinkService} from "../pdf_link_service";
import {PDFRenderingQueue} from "../pdf_rendering_queue"
import {PDFViewer} from "../pdf_viewer";
import {ViewHistory} from "../view_history";
import {
  animationStarted, DEFAULT_SCALE_VALUE,
  isValidRotation, isValidScrollMode, isValidSpreadMode
} from "../ui_utils";

import './css/folia.css'

const DISABLE_AUTO_FETCH_LOADING_BAR_TIMEOUT = 5000; // ms
const FORCE_PAGES_LOADED_TIMEOUT = 10000; // ms
const WHEEL_ZOOM_DISABLED_TIMEOUT = 1000; // ms

const promisedTimeout = (timeout) => {
  return new Promise(resolve => setTimeout(resolve, timeout))
}

class FoliaPDFViewerApp {
  foliaAPI;
  uiConfig;
  eventBus;
  pdfRenderingQueue;
  pdfLinkService;
  findController;
  pdfHistory;
  pdfViewer;
  pdfDocument;
  pdfLoadingTask;

  constructor() {
    window.PDFJSDev = new PDFJSDev()
  }
  async init(ui, foliaAPI) {
    window.pdfjsWorker = await import("pdfjs-worker")

    this.eventBus = new EventBus()

    this.foliaAPI = foliaAPI
    this.uiConfig = ui
    this.foliaAPI.connectEventBus(this.eventBus)

    this.pdfRenderingQueue = new PDFRenderingQueue()
    this.pdfRenderingQueue.onIdle = this._cleanup.bind(this);

    this.pdfLinkService = new PDFLinkService({
      foliaAPI: this.foliaAPI,
      eventBus: this.eventBus,
      externalLinkTarget: 0,
      externalLinkRel: "noopener noreferrer nofollow",
      ignoreDestinationZoom: false,
    })

    this.findController = new PDFFindController({
      linkService: this.pdfLinkService,
      eventBus: this.eventBus,
    })

    this.pdfViewer = new PDFViewer({
      container: this.uiConfig.container,
      viewer: this.uiConfig.viewer,
      eventBus: this.eventBus,
      renderingQueue: this.pdfRenderingQueue,
      linkService: this.pdfLinkService,
      downloadManager: null,
      findController: this.findController,
      scriptingManager: null,
      renderer: null,
      l10n: null,
      annotationEditorMode: 0,
      textLayerMode: 1,
      annotationMode: AnnotationMode.DISABLE,
      imageResourcesPath: "./images/",
      enablePrintAutoRotate: true,
      useOnlyCssZoom: false,
      maxCanvasPixels: 16777216,
      enablePermissions: false,
      pageColors: null,
    })

    this.pdfRenderingQueue.setViewer(this.pdfViewer)
    this.pdfLinkService.setViewer(this.pdfViewer)

    this.pdfHistory = new PDFHistory({
      linkService: this.pdfLinkService,
      eventBus: this.eventBus
    })

    this.#addEventBusListener()
    console.log('initialized')
  }
  #addEventBusListener() {
    const events = [
      "documentloaded", "resize", "hashchange", "pagerendered", "updateviewarea",
      "pagechanging", "scalechanging", "rotationchanging", "sidebarviewchanged",
      "pagemode", "namedaction", "presentationmodechanged", "presentationmode",
      "firstpage", "lastpage", "nextpage", "previouspage", "pagerendered", "pagechanging",
      "zoomin", "zoomout", "zoomreset", "scalechanged", "foliapagelayerrendered",
      "pagenumberchanged", "switchscrollmode", "scrollmodechanged",
      "documentproperties",
      "findfromurlhash", "updatefindmatchescount", "updatefindcontrolstate",
    ]

    for (const event of events) {
      this.eventBus.on(event, this.eventBusHandler.bind(this, event))
    }
  }
  eventBusHandler() {
    const args = Array.from(arguments)
    const eventName = args[0]
    const eventData = args[1]
    // console.log('-->', eventName)
    switch (eventName) {
      case 'folia:has_changes': {
        console.log('-->', eventName, eventData)
        break
      }
      case 'pagechanging': {
        break
      }
      default: break
    }
  }
  _cleanup() {
    this.pdfViewer.cleanup()
    this.pdfDocument.cleanup()
  }
  forceRendering() {
    this.pdfRenderingQueue.printing = false
    this.pdfRenderingQueue.renderHighestPriority();
  }
  async open(documentBlob, foliaDocumentIds) {
    console.log('open', documentBlob, foliaDocumentIds)

    if (this.pdfLoadingTask) {
      await this.close();
    }
    const parameters = {url: URL.createObjectURL(documentBlob)}
    const loadingTask = getDocument(parameters);
    this.pdfLoadingTask = loadingTask;

    loadingTask.onPassword = (updateCallback, reason) => {
      console.log(`TODO: implement password support`)
      // this.pdfLinkService.externalLinkEnabled = false;
      // this.passwordPrompt.setUpdateCallback(updateCallback, reason);
      // this.passwordPrompt.open();
    };
    loadingTask.onProgress = ({ loaded, total }) => {
      console.log(`TODO: implement progress bar support if needed`)
      // console.log(`onProgress: ${loaded}/${total}`)
      // this.progress(loaded / total);
    };

    const pdfDocument = await loadingTask.promise
    pdfDocument.foliaDocumentIds = foliaDocumentIds
    this.pdfDocument = pdfDocument
    this.pdfViewer.setDocument(pdfDocument)
    this.pdfLinkService.setDocument(pdfDocument)
    const {length} = await pdfDocument.getDownloadInfo()
    this._contentLength = length // Ensure that the correct length is used.
    this.downloadComplete = true

    const { firstPagePromise, onePageRendered, pagesPromise } = this.pdfViewer

    firstPagePromise.then(() => {
      this.eventBus.dispatch("documentloaded", { source: this })
    })

    const storedPromise = (this.store = new ViewHistory(pdfDocument.fingerprints[0]))
      .getMultiple({page: 1, zoom: DEFAULT_SCALE_VALUE, scrollLeft: "-0", scrollTop: "0", rotation: 0})
      .catch(() => Object.create(null))

    firstPagePromise.then(pdfPage => {
      Promise.all([animationStarted, storedPromise])
        .then(async ([timeStamp, stored, pageLayout, pageMode, openAction]) => {
          const hash = `page=${stored.page}&zoom=${stored.zoom},${stored.scrollLeft},${stored.scrollTop}`
          this.setInitialView(hash, {rotation: 0, sidebarView: null, scrollMode: null, spreadMode: null});
          this.eventBus.dispatch("documentinit", { source: this });
          this.pdfViewer.focus()
          await Promise.race([pagesPromise, promisedTimeout(FORCE_PAGES_LOADED_TIMEOUT)]);
          if (this.pdfViewer.hasEqualPageSizes) return;
          // eslint-disable-next-line no-self-assign
          this.pdfViewer.currentScaleValue = this.pdfViewer.currentScaleValue;
          this.setInitialView(hash);
        })
        .catch((err) => {
          console.error(err)
          this.setInitialView()
        })
        .then(() => this.pdfViewer.update());
    })
    pagesPromise.then(() => this._unblockDocumentLoadEvent(), console.error)
    await this._initializePageLabels(pdfDocument)
  }
  setInitialView(storedHash, props = {}) {
    const {rotation = 0, sidebarView, scrollMode = 0, spreadMode = 0} = props
    this.isInitialViewSet = true;
    if (isValidScrollMode(scrollMode)) this.pdfViewer.scrollMode = scrollMode
    if (isValidSpreadMode(spreadMode)) this.pdfViewer.spreadMode = spreadMode
    if (isValidRotation(rotation)) this.pdfViewer.pagesRotation = rotation
    console.log({storedHash})
    this.pdfLinkService.setHash(storedHash);
    this.pdfLinkService.page = 1
    // setTimeout(() => {
    //   this.pdfLinkService.page = 3
    // }, 3000)
    if (!this.pdfViewer.currentScaleValue) {
      this.pdfViewer.currentScaleValue = DEFAULT_SCALE_VALUE;
    }
  }
  async _initializePageLabels(pdfDocument) {
    const labels = await pdfDocument.getPageLabels();
    if (pdfDocument !== this.pdfDocument) {
      return; // The document was closed while the page labels resolved.
    }
    if (!labels) return;
    const numLabels = labels.length;
    // Ignore page labels that correspond to standard page numbering,
    // or page labels that are all empty.
    let standardLabels = 0,
      emptyLabels = 0;
    for (let i = 0; i < numLabels; i++) {
      const label = labels[i];
      if (label === (i + 1).toString()) {
        standardLabels++;
      } else if (label === "") {
        emptyLabels++;
      } else {
        break;
      }
    }
    if (standardLabels >= numLabels || emptyLabels >= numLabels) {
      return;
    }
    const { pdfViewer, pdfThumbnailViewer, toolbar } = this;

    pdfViewer.setPageLabels(labels);

    toolbar.setPagesCount(numLabels, true);
    toolbar.setPageNumber(
      pdfViewer.currentPageNumber,
      pdfViewer.currentPageLabel
    );
  }
  _unblockDocumentLoadEvent() {
    document.blockUnblockOnload?.(false);
    this._unblockDocumentLoadEvent = () => {};
  }
  setTitle(title = this._title) { this._title = title }
  async close() {
    this._unblockDocumentLoadEvent();
    // this._hideViewBookmark();

    if (!this.pdfLoadingTask) return
    const promises = [];
    promises.push(this.pdfLoadingTask.destroy());
    this.pdfLoadingTask = null;

    if (this.pdfDocument) {
      this.pdfDocument = null;

      this.pdfViewer.setDocument(null);
      this.pdfLinkService.setDocument(null);
      // this.pdfDocumentProperties.setDocument(null);
    }
    this.pdfLinkService.externalLinkEnabled = true;
    this.store = null;
    this.isInitialViewSet = false;
    this.downloadComplete = false;
    this.url = "";
    this.baseUrl = "";
    this._downloadUrl = "";
    this.documentInfo = null;
    this.metadata = null;
    this._contentDispositionFilename = null;
    this._contentLength = null;
    this._saveInProgress = false;
    this._docStats = null;
    this._hasAnnotationEditors = false;

    await Promise.all(promises);
  }
  zoomIn() {
    this.pdfViewer.increaseScale()
    this.pdfViewer.update()
  }
  zoomOut() {
    this.pdfViewer.decreaseScale()
    this.pdfViewer.update()
  }
  zoomReset() {
    // this.pdfViewer.update()
    this.pdfViewer.currentScaleValue = DEFAULT_SCALE_VALUE
  }
  get zoom() {
    return Number(this.pdfViewer._currentScale * 100).toFixed(0)
  }
  get pagesCount() {
    return this.pdfDocument ? this.pdfDocument.numPages : 0;
  }
  get page() {
    return this.pdfViewer.currentPageNumber || 777;
  }
  set page(val) {
    this.pdfViewer.currentPageNumber = val;
  }
  get eventBus() {
    return this.eventBus
  }
}

export default FoliaPDFViewerApp
