import { cloneDeep } from "lodash";
import PDFJSDev from "./PDFJSDev";
import { AnnotationMode, getDocument, GlobalWorkerOptions } from "pdfjs-lib";
import { EventBus } from "../event_utils";
import { PDFFindController } from "../pdf_find_controller";
import { PDFLinkService } from "../pdf_link_service";
import { PDFRenderingQueue } from "../pdf_rendering_queue";
import { PDFViewer } from "../pdf_viewer";
import { PDFThumbnailViewer } from "../pdf_thumbnail_viewer";
import { ViewHistory } from "../view_history";
import {
  animationStarted,
  DEFAULT_SCALE_VALUE,
  isValidRotation,
  isValidScrollMode,
  isValidSpreadMode,
  normalizeWheelEventDirection,
} from "../ui_utils";
import { ANNOTATION_TYPES, TOOLS } from "./constants";
import ArrowBuilder from "./annotations-builders/arrow-builder";
import CircleBuilder from "./annotations-builders/circle-builder";
import InkBuilder from "./annotations-builders/ink-builder";
import SquareBuilder from "./annotations-builders/square-builder";
import HighlightBuilder from "./annotations-builders/highlight-builder";
import ImageBuilder from "./annotations-builders/image-builder";
import TextBoxBuilder from "./annotations-builders/text-box-builder";
import "./css/folia.css";
import { UndoRedo } from "./undo-redo";
import ObjectEraser from "./annotations-builders/object-eraser";
import PixelEraser from "./annotations-builders/pixel-eraser";
import CommentBuilder from "./annotations-builders/comment-builder";
import StampsBuilder from "./annotations-builders/stamps-builder";

import * as folia_utils from "./folia-util";
import RenderArrowObject from "./web-components/render-objects/arrow";
import RenderSquareObject from "./web-components/render-objects/square";
import RenderCircleObject from "./web-components/render-objects/circle";
import RenderInkObject from "./web-components/render-objects/ink";
import RenderTextBoxObject from "./web-components/render-objects/text-box";
import RenderImageObject from "./web-components/render-objects/image";

const DISABLE_AUTO_FETCH_LOADING_BAR_TIMEOUT = 5000; // ms
const FORCE_PAGES_LOADED_TIMEOUT = 10000; // ms
const WHEEL_ZOOM_DISABLED_TIMEOUT = 1000; // ms

const promisedTimeout = (timeout) => {
  return new Promise((resolve) => setTimeout(resolve, timeout));
};

function keyDownHandler(e) {
  const { key, keyCode, altKey, ctrlKey, metaKey, shiftKey, target, currentTarget } = e;

  if (target.nodeName === "TEXTAREA") return;
  if (target.nodeName === "INPUT") return;
  if (target.nodeName === "FOLIA-PAGE") return;
  if (target.nodeName === "FOLIA-REPLY") return;
  if (target.nodeName === "FOLIA-COMMENT") return;
  if (target.nodeName === "FOLIA-CREATE-COMMENT") return;
  if (target.nodeName === "DIV" && target.hasAttribute("contenteditable")) return;

  if (ctrlKey || metaKey) {
    switch (key) {
      case "-": {
        e.preventDefault();
        e.stopPropagation();
        this.zoomOut();
        break;
      }
      case "=": {
        e.preventDefault();
        e.stopPropagation();
        this.zoomIn();
        break;
      }
      case "0": {
        e.preventDefault();
        e.stopPropagation();
        this.zoomReset();
        break;
      }
      case "Z":
      case "z": {
        e.preventDefault();
        e.stopPropagation();
        shiftKey ? this.redo() : this.undo();
        break;
      }
      case "D":
      case "d": {
        e.preventDefault();
        e.stopPropagation();
        this.eventBus.dispatch("duplicate-selected-objects");
        break;
      }
      case "f":
      case "F": {
        e.preventDefault();
        e.stopPropagation();
        this.eventBus.dispatch("open-search-bar");
        break;
      }
      case "c":
      case "C": {
        e.preventDefault();
        e.stopPropagation();

        this.copyCutSelectedAnnotations2Clipboard();
        break;
      }
      case "x":
      case "X": {
        e.preventDefault();
        e.stopPropagation();

        this.copyCutSelectedAnnotations2Clipboard(true);
        break;
      }
      case "A":
      case "a": {
        e.preventDefault();
        e.stopPropagation();
        this.eventBus.dispatch("select-all-objects");
        break;
      }
      default:
        break;
    }
  } else {
    switch (key) {
      case "Backspace": {
        e.preventDefault();
        e.stopPropagation();
        this.eventBus.dispatch("delete-selected-objects");
        break;
      }
      case "A":
      case "a": {
        this.eventBus.dispatch("select-tool", "select");
        break;
      }
      case "P":
      case "p": {
        this.eventBus.dispatch("select-tool", "pencil");
        break;
      }
      case "H":
      case "h": {
        this.eventBus.dispatch("select-tool", "highlight");
        break;
      }
      case "T":
      case "t": {
        this.eventBus.dispatch("select-tool", "text-box");
        break;
      }
      case "U":
      case "u": {
        this.eventBus.dispatch("select-tool", "shape");
        break;
      }
      case "S":
      case "s": {
        this.eventBus.dispatch("select-tool", "stamp");
        break;
      }
      case "I":
      case "i": {
        this.eventBus.dispatch("select-tool", "image");
        break;
      }
      case "C":
      case "c": {
        this.eventBus.dispatch("select-tool", "comment");
        break;
      }
      case "E":
      case "e": {
        this.eventBus.dispatch("select-tool", "eraser");
        break;
      }
      default:
        break;
    }
  }
}

let zoomDisabledTimeout = null;
function setZoomDisabledTimeout() {
  if (zoomDisabledTimeout) {
    clearTimeout(zoomDisabledTimeout);
  }
  zoomDisabledTimeout = setTimeout(function () {
    zoomDisabledTimeout = null;
  }, WHEEL_ZOOM_DISABLED_TIMEOUT);
}

function webViewerWheel(evt) {
  // const { pdfViewer, supportedMouseWheelZoomModifierKeys } = PDFViewerApplication;

  const supportedMouseWheelZoomModifierKeys = { ctrlKey: true, metaKey: true };
  if (this.pdfViewer.isInPresentationMode) {
    return;
  }

  if (
    (evt.ctrlKey && supportedMouseWheelZoomModifierKeys.ctrlKey) ||
    (evt.metaKey && supportedMouseWheelZoomModifierKeys.metaKey)
  ) {
    // Only zoom the pages, not the entire viewer.
    evt.preventDefault();
    // NOTE: this check must be placed *after* preventDefault.
    if (zoomDisabledTimeout || document.visibilityState === "hidden") {
      return;
    }

    // It is important that we query deltaMode before delta{X,Y}, so that
    // Firefox doesn't switch to DOM_DELTA_PIXEL mode for compat with other
    // browsers, see https://bugzilla.mozilla.org/show_bug.cgi?id=1392460.
    const deltaMode = evt.deltaMode;
    const delta = normalizeWheelEventDirection(evt);
    const previousScale = this.pdfViewer.currentScale;

    let ticks = 0;
    if (deltaMode === WheelEvent.DOM_DELTA_LINE || deltaMode === WheelEvent.DOM_DELTA_PAGE) {
      // For line-based devices, use one tick per event, because different
      // OSs have different defaults for the number lines. But we generally
      // want one "clicky" roll of the wheel (which produces one event) to
      // adjust the zoom by one step.
      if (Math.abs(delta) >= 1) {
        ticks = Math.sign(delta);
      } else {
        // If we're getting fractional lines (I can't think of a scenario
        // this might actually happen), be safe and use the accumulator.
        ticks = this.accumulateWheelTicks(delta);
      }
    } else {
      // pixel-based devices
      const PIXELS_PER_LINE_SCALE = 20;
      ticks = this.accumulateWheelTicks(delta / PIXELS_PER_LINE_SCALE);
    }

    if (ticks < 0) {
      this.zoomOut(-ticks);
    } else if (ticks > 0) {
      this.zoomIn(ticks);
    }

    const currentScale = this.pdfViewer.currentScale;
    if (previousScale !== currentScale) {
      // After scaling the page via zoomIn/zoomOut, the position of the upper-
      // left corner is restored. When the mouse wheel is used, the position
      // under the cursor should be restored instead.
      const scaleCorrectionFactor = currentScale / previousScale - 1;
      const rect = this.pdfViewer.container.getBoundingClientRect();
      const dx = evt.clientX - rect.left;
      const dy = evt.clientY - rect.top;
      this.pdfViewer.container.scrollLeft += dx * scaleCorrectionFactor;
      this.pdfViewer.container.scrollTop += dy * scaleCorrectionFactor;
    }
  } else {
    setZoomDisabledTimeout();
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
  _wheelUnusedTicks = 0;

  constructor() {
    window.PDFJSDev = new PDFJSDev();
    this.keyDownHandler = keyDownHandler.bind(this);
    this.pasteIntoFoliaBinded = this.pasteIntoFolia.bind(this);
    this.webViewerWheelBinded = webViewerWheel.bind(this);
  }

  async init(uiConfig, dataProxy) {
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
      dataProxy,
    });

    this.undoRedoManager = new UndoRedo(this);

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
      // annotationEditorMode: 0,
      textLayerMode: 1,
      annotationMode: 1,
      annotationEditorMode: -1,
      imageResourcesPath: "./images/",
      enablePrintAutoRotate: true,
      useOnlyCssZoom: false,
      maxCanvasPixels: -1,
      enablePermissions: false,
      pageColors: null,
      dataProxy,
      undoRedoManager: this.undoRedoManager,
    });

    this.pdfLinkService.setViewer(this.pdfViewer);
    this.pdfRenderingQueue.setViewer(this.pdfViewer);

    if (this.uiConfig.thumbnailView) {
      this.pdfThumbnailViewer = new PDFThumbnailViewer({
        container: this.uiConfig.thumbnailView,
        eventBus: this.eventBus,
        renderingQueue: this.pdfRenderingQueue,
        linkService: this.pdfLinkService,
        l10n: {},
        pageColors: {},
      });
      this.pdfRenderingQueue.setThumbnailViewer(this.pdfThumbnailViewer);
    }

    this.eventBus.on("updateviewarea", this.webViewerUpdateViewarea.bind(this));
    this.eventBus.on("pagerendered", this.webViewerPageRendered.bind(this));
    this.eventBus.on("pagechanging", this.webViewerPageChanging.bind(this));

    window.addEventListener("keydown", this.keyDownHandler, { passive: false });
    window.addEventListener("paste", this.pasteIntoFoliaBinded, { passive: false });
    window.addEventListener("wheel", this.webViewerWheelBinded, { passive: false });
  }

  deinit() {
    window.removeEventListener("paste", this.pasteIntoFoliaBinded, { passive: false });
    window.removeEventListener("keydown", this.keyDownHandler, { passive: false });
    window.removeEventListener("wheel", this.webViewerWheelBinded, { passive: false });
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
  webViewerPageRendered({ pageNumber, error }) {
    // Use the rendered page to set the corresponding thumbnail image.
    if (this.uiConfig.thumbnailView) {
      const pageView = this.pdfViewer.getPageView(/* index = */ pageNumber - 1);
      const thumbnailView = this.pdfThumbnailViewer.getThumbnail(/* index = */ pageNumber - 1);
      if (pageView && thumbnailView) {
        thumbnailView.setImage(pageView);
      }
    }

    if (error) {
      console.error(error);
      // PDFViewerApplication.l10n.get("rendering_error").then(msg => {
      //   PDFViewerApplication._otherError(msg, error);
      // });
    }
  }
  webViewerPageChanging({ pageNumber, pageLabel }) {
    if (this.uiConfig.thumbnailView) {
      this.pdfThumbnailViewer.scrollThumbnailIntoView(pageNumber);
    }
  }
  accumulateWheelTicks(ticks) {
    // If the scroll direction changed, reset the accumulated wheel ticks.
    if ((this._wheelUnusedTicks > 0 && ticks < 0) || (this._wheelUnusedTicks < 0 && ticks > 0)) {
      this._wheelUnusedTicks = 0;
    }
    this._wheelUnusedTicks += ticks;
    const wholeTicks = Math.sign(this._wheelUnusedTicks) * Math.floor(Math.abs(this._wheelUnusedTicks));
    this._wheelUnusedTicks -= wholeTicks;
    return wholeTicks;
  }

  _cleanup() {
    this.pdfViewer && this.pdfViewer.cleanup();
    this.pdfDocument && this.pdfDocument.cleanup();
    this.pdfThumbnailViewer.cleanup();
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
    pdfThumbnailViewer.setPageLabels(labels);
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
  async checkForNativeAnnotationsPresence() {
    const promises = [];
    this.pdfViewer._pages.map((page) => {
      promises.push(page.pdfPage.getAnnotations());
    });

    return Promise.allSettled(promises).then((results) => {
      return results.reduce((acc, res, index) => {
        // if (res.value.length > 0)

        return acc || res.value.length > 0;
      }, false);
    });
  }

  async open(content) {
    if (this.pdfLoadingTask) await this.close();

    const parameters = { url: content };
    GlobalWorkerOptions.workerSrc = "/folia-pdf-viewer/pdfjs-worker.js";

    const loadingTask = getDocument(parameters);
    this.pdfLoadingTask = loadingTask;

    loadingTask.onPassword = (updateCallback, reason) => {
      // this.pdfLinkService.externalLinkEnabled = false;
      // this.passwordPrompt.setUpdateCallback(updateCallback, reason);
      // this.passwordPrompt.open();
    };
    loadingTask.onProgress = ({ loaded, total }) => {
      // this.progress(loaded / total);
    };

    const pdfDocument = await loadingTask.promise;
    this.pdfDocument = pdfDocument;
    this.pdfViewer.setDocument(pdfDocument);
    this.pdfLinkService.setDocument(pdfDocument);
    this.pdfThumbnailViewer.setDocument(pdfDocument);
    const { length } = await pdfDocument.getDownloadInfo();
    this._contentLength = length; // Ensure that the correct length is used.
    this.downloadComplete = true;

    const { firstPagePromise, onePageRendered, pagesPromise } = this.pdfViewer;
    const pageLayoutPromise = pdfDocument.getPageLayout().catch(function () {});
    const pageModePromise = pdfDocument.getPageMode().catch(function () {});
    const openActionPromise = pdfDocument.getOpenAction().catch(function () {});

    firstPagePromise.then(() => {
      this.eventBus.dispatch("documentloaded", { source: this });
    });

    this.store = new ViewHistory(this.dataProxy.documentId);
    const storedPromise = this.store
      .getMultiple({
        page: null,
        zoom: DEFAULT_SCALE_VALUE,
        scrollLeft: "0",
        scrollTop: "0",
        rotation: null,
        sidebarView: -1,
        scrollMode: -1,
        spreadMode: -1,
      })
      .catch(() => Object.create(null));

    firstPagePromise.then((pdfPage) => {
      Promise.all([animationStarted, storedPromise, pageLayoutPromise, pageModePromise])
        .then(async ([timeStamp, stored, pageLayout, pageMode, openAction, openActionPromise]) => {
          let hash = `zoom=${stored.zoom}`;
          if (stored.page) {
            hash = `page=${stored.page}&zoom=${stored.zoom},${stored.scrollLeft},${stored.scrollTop}`;
          }
          this.setInitialView(hash, {
            rotation: 0,
            sidebarView: null,
            scrollMode: null,
            spreadMode: null,
          });
          this.eventBus.dispatch("documentinit", { source: this });
          this.pdfViewer.focus();
          await Promise.race([pagesPromise, promisedTimeout(FORCE_PAGES_LOADED_TIMEOUT)]);
          // if (this.pdfViewer.hasEqualPageSizes) return;
          // // eslint-disable-next-line no-self-assign
          // this.pdfViewer.currentScaleValue = this.pdfViewer.currentScaleValue;
          // this.setInitialView(hash);
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
      this.pdfThumbnailViewer.setDocument(null);
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
  undo() {
    this.undoRedoManager.undo();
  }
  redo() {
    this.undoRedoManager.redo();
  }
  zoomIn(steps = 1) {
    this.stopDrawing();
    this.pdfViewer.increaseScale(steps);
    this.pdfViewer.update();
  }
  zoomOut(steps = 1) {
    this.stopDrawing();
    this.pdfViewer.decreaseScale(steps);
    this.pdfViewer.update();
  }
  zoomReset() {
    this.stopDrawing();
    this.pdfViewer.currentScaleValue = DEFAULT_SCALE_VALUE;
    this.pdfViewer.update();
  }
  updateToolDrawingProperties(properties) {
    if (!this.pdfViewer.annotationBuilderClass) return;
    const data = Object.assign(this.pdfViewer.annotationBuilderClass.initialPreset, properties);
    this.pdfViewer._pages.map((page) => {
      if (!page.foliaPageLayer) return;
      page.foliaPageLayer.updateToolDrawingProperties(data);
    });
  }
  // updateObjectsDrawingProperties(properties) {
  //   this.pdfViewer._pages.map((page) => {
  //     if (!page.foliaPageLayer) return;
  //     page.foliaPageLayer.updateObjectsDrawingProperties(properties);
  //   });
  // }
  refreshFoliaLayers() {
    // this.pdfViewer._pages.map((page) => {
    //   if (!page.foliaPageLayer) return;
    //   page.foliaPageLayer.refresh();
    // });
  }
  loadImageAsset(completeCallback) {
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "image/png, image/jpg, image/jpeg";
    fileInput.onchange = (fileInputEvent) => {
      const file = fileInputEvent.target.files[0];
      completeCallback(file);
    };
    fileInput.click();
  }
  startDrawing(toolType, preset) {
    if (toolType === TOOLS.INK) {
      this.continueStartDrawing(InkBuilder, preset);
    } else if (toolType === TOOLS.ARROW) {
      this.continueStartDrawing(ArrowBuilder, preset);
    } else if (toolType === TOOLS.CIRCLE) {
      this.continueStartDrawing(CircleBuilder, preset);
    } else if (toolType === TOOLS.SQUARE) {
      this.continueStartDrawing(SquareBuilder, preset);
    } else if (toolType === TOOLS.TEXT_BOX) {
      this.continueStartDrawing(TextBoxBuilder, preset);
    } else if (toolType === TOOLS.IMAGE) {
      this.loadImageAsset((asset) => {
        this.continueStartDrawing(ImageBuilder, preset, asset);
      });
    } else if (toolType === TOOLS.MARKER || toolType === TOOLS.UNDERLINE || toolType === TOOLS.CROSSLINE) {
      const BuilderClass = HighlightBuilder;
      BuilderClass.kind = toolType;
      this.continueStartDrawing(BuilderClass, preset);
    } else if (toolType === TOOLS.ERASER) {
      const BuilderClass = ObjectEraser;
      this.continueStartDrawing(BuilderClass, {});
    } else if (toolType === TOOLS.PIXEL_ERASER) {
      const BuilderClass = PixelEraser;
      this.continueStartDrawing(BuilderClass, preset);
    } else if (toolType === TOOLS.COMMENT) {
      const BuilderClass = CommentBuilder;
      this.continueStartDrawing(BuilderClass, preset);
    } else if (toolType === TOOLS.STAMPS) {
      const BuilderClass = StampsBuilder;
      const asset = preset.preview;
      const stampData = structuredClone(preset);
      delete stampData.preview;
      this.continueStartDrawing(BuilderClass, stampData, asset);
    } else {
    }
  }
  continueStartDrawing(BuilderClass, preset, asset) {
    BuilderClass.initialPreset = cloneDeep(preset);
    BuilderClass.asset = asset;
    BuilderClass.currentZoom = parseInt(this.zoom, 10);
    this.pdfViewer.annotationBuilderClass = BuilderClass;

    this.pdfViewer._pages.map((page) => {
      if (!page.foliaPageLayer) return;
      page.foliaPageLayer.startDrawing(this.pdfViewer.annotationBuilderClass);
    });
  }
  stopDrawing() {
    this.pdfViewer.annotationBuilderClass = null;
    this.pdfViewer._pages.map((page) => {
      if (!page.foliaPageLayer) return;
      page.foliaPageLayer.stopDrawing();
    });
    this.undoRedoManager.updateUI();
  }

  resetObjectsSeletion() {
    this.eventBus.dispatch("reset-objects-selection");
  }
  deleteSelectedObjects() {
    this.pdfViewer._pages.map((page) => {
      if (!page.foliaPageLayer) return;
      page.foliaPageLayer.deleteSelectedObjects();
    });
  }
  selectAnnotationObject(_page, objectId) {
    const page = parseInt(_page, 10);

    const pdfPage = this.pdfViewer._pages[page - 1];
    if (pdfPage.foliaPageLayer) {
      this.pdfViewer.currentPageNumber = page;
      setTimeout(() => pdfPage.foliaPageLayer.makeSelectedAnnotation(objectId, true), 100);
      return;
    }

    const timeout = setTimeout(() => {
      this.eventBus.off("foliapagelayerrendered", evenListener);
      console.warn(`the page ${page} cannot be rendered`);
    }, 3000);

    const evenListener = (event) => {
      const { error, pageNumber, source } = event;
      if (pageNumber === page) {
        clearTimeout(timeout);
        if (error) return console.warn("error", error);
        this.eventBus.off("foliapagelayerrendered", evenListener);
        setTimeout(() => source.foliaPageLayer.makeSelectedAnnotation(objectId, true), 100);
      }
    };

    this.eventBus.on("foliapagelayerrendered", evenListener);
    this.pdfViewer.currentPageNumber = page;
  }

  copyCutSelectedAnnotations2Clipboard(deleteSelected = false) {
    const selectedAnnotations = this.pdfViewer._pages
      .map((page) => {
        if (!page.foliaPageLayer || !page.foliaPageLayer.canManage) return [];
        return page.foliaPageLayer.selectedObjects;
      })
      .flat();

    const allowed2copy = [
      ANNOTATION_TYPES.ARROW,
      ANNOTATION_TYPES.CIRCLE,
      ANNOTATION_TYPES.IMAGE,
      ANNOTATION_TYPES.INK,
      ANNOTATION_TYPES.SQUARE,
      ANNOTATION_TYPES.TEXT_BOX,
    ];
    const clipboardData = [];
    const type = "text/plain";

    for (const annoObject of selectedAnnotations) {
      if (!allowed2copy.includes(annoObject.__typename)) {
        this.eventBus.dispatch("toast", {
          type: "WARN_TOAST",
          title: `${annoObject.__typename} can not be ${deleteSelected ? "cutted" : "copied"}.`,
        });
        clipboardData.length = 0;
        break;
      }

      const annoData = annoObject.toObjectData();
      annoData.id = "";
      annoData.collaboratorEmail = "";
      annoData.addedAt = "";
      annoData.page = -1;

      clipboardData.push(
        new ClipboardItem({
          [type]: new Blob([JSON.stringify(annoData)], { type }),
        })
      );
    }

    if (!clipboardData.length) return;

    return navigator.permissions
      .query({ name: "clipboard-write" })
      .then((result) => {
        if (result.state === "granted" || result.state === "prompt") {
          return navigator.clipboard.write(clipboardData).then(() => {
            if (deleteSelected) {
              this.eventBus.dispatch("delete-selected-objects");
            } else {
              this.eventBus.dispatch("reset-objects-selection");
            }
            this.eventBus.dispatch("toast", {
              type: "SUCCESS_TOAST",
              title: `Selected annotation has been ${deleteSelected ? "cut" : "copied"}`,
            });
          });
        } else {
          return Promise.reject("clipboard is not accessible");
        }
      })
      .catch((error) => {
        console.warn(error, this.eventBus);
        this.eventBus.dispatch("toast", {
          type: "WARN_TOAST",
          message: error.message,
        });
      });
  }

  pasteIntoFolia(e) {
    navigator.clipboard
      .read()
      .then((clipboardItems) => {
        const promises = [];
        for (const item of clipboardItems) {
          for (const type of item.types) {
            promises.push(item.getType(type));
          }
        }
        return Promise.all(promises);
      })
      .then(([blob]) => {
        // continueStartDrawing
        if (blob.type === "text/plain") {
          return blob.text().then((text) => {
            let annoData = text;
            try {
              annoData = JSON.parse(text);
            } catch (e) {}
            if (annoData.hasOwnProperty("__typename")) {
              this.eventBus.dispatch("paste-from-clipboard", [annoData]);
            } else {
              this.eventBus.dispatch("paste-from-clipboard", [
                { __typename: ANNOTATION_TYPES.TEXT_BOX, text },
              ]);
            }
          });
        } else if (blob.type === "image/png") {
          const fr = new FileReader();
          fr.onload = () => {
            const image = new Image();
            image.onload = () => {
              this.eventBus.dispatch("paste-from-clipboard", [
                {
                  __typename: ANNOTATION_TYPES.IMAGE,
                  filename: "from clipboard",
                  image: fr.result,
                  imageWidth: image.naturalWidth,
                  imageHeight: image.naturalHeight,
                },
              ]);
            };
            image.src = fr.result;
          };
          fr.readAsDataURL(blob);
        }
      })
      .catch(console.error);
  }

  search(query) {
    this.searchQuery = query;
    this.eventBus.dispatch("find", {
      type: "",
      query: this.searchQuery,
      phraseSearch: true,
      caseSensitive: false,
      entireWord: false,
      highlightAll: true,
      findPrevious: false,
    });
  }
  closeSearch() {
    this.searchQuery = "";
    this.eventBus.dispatch("findbarclose");
  }
  searchNext() {
    this.eventBus.dispatch("find", {
      type: "again",
      query: this.searchQuery,
      phraseSearch: true,
      caseSensitive: false,
      entireWord: false,
      highlightAll: true,
      findPrevious: false,
    });
  }
  searchPrev() {
    this.eventBus.dispatch("find", {
      type: "again",
      query: this.searchQuery,
      phraseSearch: true,
      caseSensitive: false,
      entireWord: false,
      highlightAll: true,
      findPrevious: true,
    });
  }
}

export const foliaUtils = folia_utils;

export const InkObject = RenderInkObject;
export const ArrowObject = RenderArrowObject;
export const SquareObject = RenderSquareObject;
export const CircleObject = RenderCircleObject;
export const TextBoxObject = RenderTextBoxObject;
export const ImageObject = RenderImageObject;
