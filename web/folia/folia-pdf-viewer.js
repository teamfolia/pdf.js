import { cloneDeep } from "lodash";
import PDFJSDev from "./PDFJSDev";
import { AnnotationMode, getDocument } from "pdfjs-lib";
import { EventBus } from "../event_utils";
import { PDFFindController } from "../pdf_find_controller";
import { PDFHistory } from "../pdf_history";
import { PDFLinkService } from "../pdf_link_service";
import { PDFRenderingQueue } from "../pdf_rendering_queue";
import { PDFViewer } from "../pdf_viewer";
import { ViewHistory } from "../view_history";
import {
  animationStarted,
  DEFAULT_SCALE_VALUE,
  isValidRotation,
  isValidScrollMode,
  isValidSpreadMode,
} from "../ui_utils";
import { TOOLS } from "./constants";
import ArrowBuilder from "./annotations-builders/arrow-builder";
import BaseBuilder from "./annotations-builders/base-builder";
import CircleBuilder from "./annotations-builders/circle-builder";
import InkBuilder from "./annotations-builders/ink-builder";
import SquareBuilder from "./annotations-builders/square-builder";
import HighlightBuilder from "./annotations-builders/highlight-builder";
import ImageBuilder from "./annotations-builders/image-builder";
import TextBoxBuilder from "./annotations-builders/text-box-builder";
import "./css/folia.css";

const DISABLE_AUTO_FETCH_LOADING_BAR_TIMEOUT = 5000; // ms
const FORCE_PAGES_LOADED_TIMEOUT = 10000; // ms
const WHEEL_ZOOM_DISABLED_TIMEOUT = 1000; // ms

const promisedTimeout = (timeout) => {
  return new Promise((resolve) => setTimeout(resolve, timeout));
};

function onClickHandler(e) {
  if (e.target.id === "viewer") {
    // console.log('onClickHandler', e.target)
    this.pdfViewer._pages.map((_page) => {
      if (!_page.foliaPageLayer) return;
      _page.foliaPageLayer.clickByViewerContainer();
    });
  }
}
function keyDownHandler(e) {
  const { key, keyCode, altKey, ctrlKey, metaKey, shiftKey, target, currentTarget } = e;
  // console.log('keyDownHandler', target.nodeName)
  if (target.nodeName === "TEXTAREA") return;
  if (target.nodeName === "DIV" && target.hasAttribute("contenteditable")) return;
  switch (key) {
    case "Backspace": {
      e.preventDefault();
      e.stopPropagation();
      this.deleteSelectedAnnotations();
      break;
    }
    default:
      break;
  }
}

// export const foliaUtils = _foliaUtils;
export class FoliaPDFViewer {
  uiConfig;
  eventBus;
  pdfRenderingQueue;
  pdfLinkService;
  findController;
  pdfHistory;
  pdfViewer;
  pdfDocument;
  pdfLoadingTask;

  // #workspaceId;
  // #documentId;
  #AnnotationBuilderClass;

  constructor() {
    window.PDFJSDev = new PDFJSDev();
    this.keyDownHandler = keyDownHandler.bind(this);
    this.onClickHandler = onClickHandler.bind(this);
  }

  async init(uiConfig, dataProxy) {
    window.pdfjsWorker = await import("pdfjs-worker");

    this.dataProxy = dataProxy;
    this.uiConfig = uiConfig;

    this.eventBus = new EventBus();
    this.pdfRenderingQueue = new PDFRenderingQueue();
    this.pdfRenderingQueue.onIdle = this._cleanup.bind(this);

    this.pdfLinkService = new PDFLinkService({
      eventBus: this.eventBus,
      externalLinkTarget: 0,
      externalLinkRel: "noopener noreferrer nofollow",
      ignoreDestinationZoom: false,
    });

    this.findController = new PDFFindController({
      linkService: this.pdfLinkService,
      eventBus: this.eventBus,
    });

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
      maxCanvasPixels: -1,
      enablePermissions: false,
      pageColors: null,
      dataProxy,
    });

    this.pdfRenderingQueue.setViewer(this.pdfViewer);
    this.pdfLinkService.setViewer(this.pdfViewer);

    // this.pdfHistory = new PDFHistory({
    //   linkService: this.pdfLinkService,
    //   eventBus: this.eventBus,
    // });

    this.eventBus.on("updateviewarea", this.webViewerUpdateViewarea.bind(this));

    window.addEventListener("keydown", this.keyDownHandler, true);
    window.addEventListener("click", this.onClickHandler, true);

    console.log("foliaPdfViewer has been initialized");
  }

  deinit() {
    window.removeEventListener("keydown", this.keyDownHandler, true);
    window.removeEventListener("click", this.onClickHandler, true);
  }

  webViewerUpdateViewarea({ location }) {
    if (this.isInitialViewSet) {
      // Only update the storage when the document has been loaded *and* rendered.
      this.store
        ?.setMultiple({
          page: location.pageNumber,
          zoom: location.scale,
          scrollLeft: location.left,
          scrollTop: location.top,
          rotation: location.rotation,
        })
        .catch(() => {
          // Unable to write to storage.
        });
    }
  }

  _cleanup() {
    this.pdfViewer && this.pdfViewer.cleanup();
    this.pdfDocument && this.pdfDocument.cleanup();
  }
  _unblockDocumentLoadEvent() {
    document.blockUnblockOnload?.(false);
    this._unblockDocumentLoadEvent = () => {};
  }
  setTitle(title = this._title) {
    this._title = title;
  }
  setInitialView(storedHash, props = {}) {
    const { rotation = 0, sidebarView, scrollMode = 0, spreadMode = 0 } = props;
    this.isInitialViewSet = true;
    if (isValidScrollMode(scrollMode)) this.pdfViewer.scrollMode = scrollMode;
    if (isValidSpreadMode(spreadMode)) this.pdfViewer.spreadMode = spreadMode;
    if (isValidRotation(rotation)) this.pdfViewer.pagesRotation = rotation;
    // console.log({ storedHash });
    this.pdfLinkService.setHash(storedHash);
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
    toolbar.setPageNumber(pdfViewer.currentPageNumber, pdfViewer.currentPageLabel);
  }
  forceRendering() {
    this.pdfRenderingQueue.printing = false;
    this.pdfRenderingQueue.renderHighestPriority();
  }

  get zoom() {
    return Number(this.pdfViewer._currentScale * 100).toFixed(0);
  }
  get pagesCount() {
    return this.pdfDocument ? this.pdfDocument.numPages : 0;
  }
  get page() {
    return this.pdfViewer.currentPageNumber || 1;
  }
  set page(val) {
    this.pdfViewer.currentPageNumber = val;
  }
  get eventBus() {
    return this.eventBus;
  }

  async open(content) {
    if (this.pdfLoadingTask) await this.close();

    const parameters = { url: content };
    const loadingTask = getDocument(parameters);
    this.pdfLoadingTask = loadingTask;

    loadingTask.onPassword = (updateCallback, reason) => {
      // console.log(`TODO: implement password support`)
      // this.pdfLinkService.externalLinkEnabled = false;
      // this.passwordPrompt.setUpdateCallback(updateCallback, reason);
      // this.passwordPrompt.open();
    };
    loadingTask.onProgress = ({ loaded, total }) => {
      // console.log(`TODO: implement progress bar support if needed`)
      // console.log(`onProgress: ${loaded}/${total}`)
      // this.progress(loaded / total);
    };

    const pdfDocument = await loadingTask.promise;
    this.pdfDocument = pdfDocument;
    this.pdfViewer.setDocument(pdfDocument);
    this.pdfLinkService.setDocument(pdfDocument);
    const { length } = await pdfDocument.getDownloadInfo();
    this._contentLength = length; // Ensure that the correct length is used.
    this.downloadComplete = true;

    const { firstPagePromise, onePageRendered, pagesPromise } = this.pdfViewer;

    firstPagePromise.then(() => {
      this.eventBus.dispatch("documentloaded", { source: this });
    });

    this.store = new ViewHistory(this.dataProxy.documentId);
    const storedPromise = this.store
      .getMultiple({
        page: 1,
        zoom: DEFAULT_SCALE_VALUE,
        scrollLeft: "-0",
        scrollTop: "0",
        rotation: 0,
      })
      .catch(() => Object.create(null));

    firstPagePromise.then((pdfPage) => {
      Promise.all([animationStarted, storedPromise])
        .then(async ([timeStamp, stored, pageLayout, pageMode, openAction]) => {
          const hash = `page=${stored.page}&zoom=${stored.zoom},${stored.scrollLeft},${stored.scrollTop}`;
          this.setInitialView(hash, {
            rotation: 0,
            sidebarView: null,
            scrollMode: null,
            spreadMode: null,
          });
          this.eventBus.dispatch("documentinit", { source: this });
          this.pdfViewer.focus();
          await Promise.race([pagesPromise, promisedTimeout(FORCE_PAGES_LOADED_TIMEOUT)]);
          if (this.pdfViewer.hasEqualPageSizes) return;
          // eslint-disable-next-line no-self-assign
          this.pdfViewer.currentScaleValue = this.pdfViewer.currentScaleValue;
          this.setInitialView(hash);
        })
        .catch((err) => {
          console.error(err);
          this.setInitialView();
        })
        .then(() => this.pdfViewer.update());
    });
    pagesPromise.then(() => this._unblockDocumentLoadEvent(), console.error);
    await this._initializePageLabels(pdfDocument);
  }
  async close() {
    this._unblockDocumentLoadEvent();
    // this._hideViewBookmark();

    if (!this.pdfLoadingTask) return;
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
    this.pdfViewer.increaseScale();
    this.pdfViewer.update();
  }
  zoomOut() {
    this.pdfViewer.decreaseScale();
    this.pdfViewer.update();
  }
  zoomReset() {
    this.pdfViewer.currentScaleValue = DEFAULT_SCALE_VALUE;
    this.pdfViewer.update();
  }
  updateToolDrawingProperties(properties) {
    if (!this.#AnnotationBuilderClass) return;
    const data = Object.assign(this.#AnnotationBuilderClass.initialPreset, properties);
    this.pdfViewer._pages.map((page) => {
      if (!page.foliaPageLayer) return;
      page.foliaPageLayer.updateToolDrawingProperties(data);
    });
  }
  updateObjectsDrawingProperties(properties) {
    const promises = [];
    this.pdfViewer._pages.map((page) => {
      if (!page.foliaPageLayer) return;
      promises.concat(page.foliaPageLayer.updateObjectsDrawingProperties(properties));
    });

    return Promise.allSettled(promises);
  }

  refreshFoliaLayers() {
    this.pdfViewer._pages.map((page) => {
      if (!page.foliaPageLayer) return;
      page.foliaPageLayer.refresh();
    });
  }
  loadImageAsset(completeCallback) {
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "image/*";
    fileInput.onchange = (fileInputEvent) => {
      const file = fileInputEvent.target.files[0];
      completeCallback(file);
    };
    fileInput.click();
  }

  startDrawing(toolType, preset) {
    // console.log('startDrawing 1', {annotationType, preset})
    const promises = [];
    if (toolType === TOOLS.INK) {
      this.continueStartDrawing(InkBuilder, preset);
    } else if (toolType === TOOLS.ARROW) {
      this.continueStartDrawing(ArrowBuilder, preset);
    } else if (toolType === TOOLS.CIRCLE) {
      this.continueStartDrawing(CircleBuilder, preset);
    } else if (toolType === TOOLS.SQUARE) {
      this.continueStartDrawing(SquareBuilder, preset);
    } else if (toolType === TOOLS.COMMENT) {
      this.continueStartDrawing(BaseBuilder, preset);
    } else if (toolType === TOOLS.TEXT_BOX) {
      this.continueStartDrawing(TextBoxBuilder, preset);
    } else if (toolType === TOOLS.IMAGE) {
      this.loadImageAsset((asset) => {
        const BuilderClass = ImageBuilder;
        this.continueStartDrawing(ImageBuilder, preset, asset);
      });
    } else if (toolType === TOOLS.MARKER || toolType === TOOLS.UNDERLINE || toolType === TOOLS.CROSSLINE) {
      const BuilderClass = HighlightBuilder;
      BuilderClass.kind = toolType;
      this.continueStartDrawing(BuilderClass, preset);
    } else {
      console.warn(`${toolType} does not exist yet`);
    }
  }
  continueStartDrawing(BuilderClass, preset, asset) {
    BuilderClass.initialPreset = cloneDeep(preset);
    BuilderClass.asset = asset;
    this.#AnnotationBuilderClass = BuilderClass;

    this.pdfViewer._pages.map((page) => {
      if (!page.foliaPageLayer) return;
      page.foliaPageLayer.startDrawing(this.#AnnotationBuilderClass);
    });
  }
  stopDrawing() {
    this.#AnnotationBuilderClass = null;
    this.pdfViewer._pages.map((page) => {
      if (!page.foliaPageLayer) return;
      page.foliaPageLayer.stopDrawing();
    });
  }

  resetObjectsSeletion() {
    this.pdfViewer._pages.map((page) => {
      if (!page.foliaPageLayer) return;
      page.foliaPageLayer.resetObjectsSeletion();
    });
  }
  deleteSelectedAnnotations() {
    this.pdfViewer._pages.map((page) => {
      if (!page.foliaPageLayer) return;
      page.foliaPageLayer.deleteSelectedAnnotations();
    });
  }
  // changeEditableProperties(propName, propValue) {
  //   this.pdfViewer._pages.map((_page) => {
  //     if (!_page.foliaPageLayer) return;
  //     _page.foliaPageLayer.changeEditableProperties(propName, propValue);
  //   });
  // }
  selectAnnotationObject(annoPageNumber, localId) {
    console.log(annoPageNumber, localId);
    const page = this.pdfViewer._pages[annoPageNumber];
    if (page.foliaPageLayer) {
      this.pdfViewer.currentPageNumber = annoPageNumber + 1;
      setTimeout(() => page.foliaPageLayer.selectAnnotationById(localId), 100);
      return;
    }

    const timeout = setTimeout(() => {
      this.eventBus.off("foliapagelayerrendered", evenListener);
      console.warn(`the page ${annoPageNumber} cannot be rendered`);
    }, 3000);

    const evenListener = (event) => {
      const { error, pageNumber, source } = event;
      if (pageNumber === annoPageNumber + 1) {
        // console.log("event", annoPageNumber + 1, pageNumber, source);
        clearTimeout(timeout);
        if (error) return console.warn("error", error);
        this.eventBus.off("foliapagelayerrendered", evenListener);
        setTimeout(() => source.foliaPageLayer.selectAnnotationById(localId), 100);
      }
    };

    this.eventBus.on("foliapagelayerrendered", evenListener);
    this.pdfViewer.currentPageNumber = annoPageNumber + 1;
  }

  // get foliaDataStorageProxy() {
  //   const that = this
  //   return {
  //     getObjects(pageNumber) {
  //       return []
  //     }
  //   }
  //   return {
  //     get workspaceId() {
  //       return that.#workspaceId
  //     },
  //     get cardId() {
  //       return that.#cardId
  //     },
  //     getAnnotations: (...opt) => this.foliaDataStorage.getAnnotations(...opt),
  //     getUser: email => this.foliaDataStorage.getUserInfo(email),
  //     getActiveUser: () => this.foliaDataStorage.getActiveUserInfo(),
  //     getImageFromServer: (media_id) => {
  //       return this.foliaDataStorage.getImageFromServer(media_id)
  //     },
  //     get annotationBuilderClass() {
  //       return that.#AnnotationBuilderClass
  //     },

  //     updateAnnotations: (objects) => {
  //       this.foliaDataStorage.updateObjects(this.#workspaceId, this.#cardId, objects, (localId, timestamp, payload) => {
  //         this.pdfViewer._pages.map(_page => {
  //           if (!_page.foliaPageLayer) return
  //           _page.foliaPageLayer.confirmChanges(localId, timestamp, payload)
  //         })
  //       })
  //     },
  //     createReply: (object) => this.foliaDataStorage.createReply(this.#workspaceId, this.#cardId, object, (localId, timestamp, payload) => {
  //       that.confirmChangesTimestamp(localId, timestamp, payload)
  //     }),
  //     deleteReply: (object) => this.foliaDataStorage.deleteReply(this.#workspaceId, this.#cardId, object, (localId, timestamp, payload) => {
  //       that.confirmChangesTimestamp(localId, timestamp, payload)
  //     }),
  //     markConversationAsUnread: (annotationId) => this.foliaDataStorage.markConversationAsUnread(this.#workspaceId, this.#cardId, annotationId),

  //     get floatingBar() {
  //       const bar = that.uiConfig.annotationsFloatingBar
  //       function findOutPositionAndShow(barEl, targetEl) {
  //         // console.log('findOutPositionAndShow', barEl, targetEl)
  //         if (!targetEl) {
  //           bar.style.visibility = 'hidden'
  //           return
  //         }
  //         const padding = 10
  //         const absoluteOffset = getAbsoluteOffset(targetEl, barEl.parentNode)

  //         let left = (absoluteOffset.left + targetEl.offsetWidth / 2) - (barEl.offsetWidth / 2)
  //         if (left < targetEl.parentNode.parentNode.offsetLeft + padding) {
  //           left = targetEl.parentNode.parentNode.offsetLeft + padding
  //         }

  //         if (left + barEl.offsetWidth + padding > targetEl.parentNode.parentNode.offsetLeft + targetEl.parentNode.parentNode.offsetWidth) {
  //           left = targetEl.parentNode.parentNode.offsetLeft + targetEl.parentNode.parentNode.offsetWidth - barEl.offsetWidth - padding
  //         }
  //         let top = absoluteOffset.top - barEl.offsetHeight - padding
  //         if (top < padding) top = absoluteOffset.top + targetEl.offsetHeight + padding

  //         barEl.style.left = left + 'px'
  //         barEl.style.top = top + 'px'
  //         bar.style.visibility = 'visible'
  //       }
  //       return {
  //         setup_and_show: (targetEl, editableProperties = [], initialValues = {}) => {
  //           if (!bar) return console.warn('toolbar element is not defined')
  //           bar.setAttribute('data-props', editableProperties.join(','))
  //           Object.entries(initialValues).forEach(([propName, propValue]) => {
  //             bar.setAttribute(`data-${propName}`, propValue)
  //           })

  //           if (targetEl) findOutPositionAndShow(bar, targetEl)
  //           return this.floatingBar
  //         },
  //         show: (targetEl) => {
  //           if (!bar) return console.warn('toolbar element is not defined')
  //           if (targetEl) findOutPositionAnsShow(bar, targetEl)
  //           return this.floatingBar
  //         },
  //         hide: () => {
  //           if (!bar) return console.warn('toolbar element is not defined')
  //           bar.style.visibility = 'hidden'
  //           return this.floatingBar
  //         },
  //       }
  //     },
  //   }
  // }
}
