import { FoliaPDFViewer } from "./folia-pdf-viewer.js";
import { TOOLS } from "./constants.js";

const GET = "GET";
const POST = "POST";
const PUT = "PUT";
const DELETE = "DELETE";
const APPLICATION_JSON = "application/json";
const APPLICATION_STREAM = "application/octet-stream";
const VITE_GRAPHQL_SERVER = "https://graphql.x.branchfire.com/graphql";

class Viewer {
  presets = {
    default: {
      color: "#000000",
      lineWidth: 1,
      fontFamily: "Source Sans Pro",
      fontSize: 25,
      fontWeight: "normal",
      textAlign: "left",
    },
    [TOOLS.INK]: { color: "#0000FF", lineWidth: 3 },
    [TOOLS.SQUARE]: { color: "#00FF00", lineWidth: 6 },
    [TOOLS.CIRCLE]: { color: "#FF0000", lineWidth: 9 },
    [TOOLS.ARROW]: { color: "#006eff", lineWidth: 4 },
    [TOOLS.TEXT_BOX]: {
      color: "#FF00FFFF",
      fontFamily: "SERIF",
      fontSize: 25,
      fontWeight: "W400",
      textAlignment: "CENTER",
    },
    [TOOLS.MARKER]: { color: "#00FF00" },
    [TOOLS.UNDERLINE]: { color: "#FF00EA" },
    [TOOLS.CROSSLINE]: { color: "#444444" },
  };
  drawingTool = {
    type: null,
    preset: this.presets.default,
  };

  #projectId;
  #documentId;
  #annotations = [];

  constructor() {}

  async #fetchWrapper(method, path, data) {
    const isAuthenticated = await authClient.isAuthenticated();
    if (!isAuthenticated) throw new Error("requires auth");

    const { email } = await authClient.getUser();
    const accessToken = await authClient.getTokenSilently();

    const contentType = data instanceof Blob ? APPLICATION_STREAM : APPLICATION_JSON;
    const body = data instanceof Blob ? data : JSON.stringify(data);
    const init = {
      method,
      headers: {
        "content-type": contentType,
        "graphql-server": VITE_GRAPHQL_SERVER,
        "graphql-access-token": accessToken,
        "user-email": email,
      },
    };
    if (method === POST || method === PUT) {
      init.body = body;
    }

    const response = await fetch(path, init);
    if (response.ok === false && response.status === 401) {
      throw new Error(response.statusText);
    } else if (response.ok === false) {
      throw new Error(response.statusText);
    }

    // console.log("FETCH WRAPPER", res.ok, res.status);
    const responseContentType = response.headers.get("content-type");
    if (responseContentType === APPLICATION_JSON) {
      return await response.json();
    } else if (responseContentType === APPLICATION_STREAM) {
      return response.blob;
    } else {
      return await response.text();
    }
  }
  get $fetch() {
    const that = this;
    return {
      get(path) {
        return that.#fetchWrapper(GET, path);
      },
      post(path, body) {
        return that.#fetchWrapper(POST, path, body);
      },
      put(path, body) {
        return that.#fetchWrapper(PUT, path, body);
      },
      delete(path) {
        return that.#fetchWrapper(DELETE, path);
      },
      get userEmail() {
        return localStorage.getItem("email");
      },
    };
  }

  get $sync() {
    return {};
  }

  // api requests
  async getPermissions() {
    const projectId = this.#projectId;
    const project = await this.$fetch.get(`/store/projects/${projectId}`);
    this.permissions = project.permissions;
  }
  async getContent() {
    const projectId = this.#projectId;
    const documentId = this.#documentId;
    const path = `/store/projects/${projectId}/documents/${documentId}/content`;
    return await this.$fetch.get(path);
  }

  async getObjects(pageNumber) {
    const projectId = this.#projectId;
    const documentId = this.#documentId;

    const path = `/store/projects/${projectId}/documents/${documentId}/objects`;
    const objects = await this.$fetch.get(path);
    this.#annotations = objects;
  }
  // end of api requests

  async resume() {
    const storedProjectId = sessionStorage.getItem("projectId");
    const projects = await this.$fetch.get("/store/projects");

    const projectsList = document.getElementById("projects-list");
    projectsList.onchange = () => this.openProject(projectsList.value);
    projects.forEach((project) => {
      if (project.deleted) return;
      const option = document.createElement("option");
      option.value = project.id;
      option.label = project.name + ` (${project.totalDocuments})`;
      option.selected = project.id === storedProjectId;
      projectsList.appendChild(option);
    });
    if (storedProjectId) await this.openProject(storedProjectId);
  }
  async openProject(projectId) {
    sessionStorage.setItem("projectId", projectId);
    const storedDocumentId = sessionStorage.getItem("documentId");

    const documents = await this.$fetch.get(`/store/projects/${projectId}/documents`);
    const documentsList = document.getElementById("documents-list");
    documentsList.innerHTML = "<option>select document</option>";
    documentsList.onchange = () => this.openDocument(projectId, documentsList.value);
    documents.forEach((doc) => {
      if (doc.deleted) return;
      const option = document.createElement("option");
      option.value = doc.id;
      option.label = doc.name;
      option.selected = doc.id === storedDocumentId;
      documentsList.appendChild(option);
    });

    if (storedDocumentId) await this.openDocument(projectId, storedDocumentId);
  }
  async openDocument(projectId, documentId) {
    // localStorage.removeItem("pdfjs.history");
    sessionStorage.setItem("documentId", documentId);

    if (!window.foliaPdfViewer) {
      window.foliaPdfViewer = new FoliaPDFViewer();
      const ui = {
        container: document.getElementById("viewerContainer"),
        viewer: document.getElementById("viewer"),
        thumbnailView: document.querySelector(".thumbnail-viewer"),
      };
      const that = this;
      const dataProxy = {
        get userEmail() {
          return localStorage.getItem("email");
        },
        get documentId() {
          return documentId;
        },
        get permissions() {
          return that.permissions;
        },
        getObjects: (pageNumber) => this.#annotations.filter((object) => object.page === pageNumber),
        // postObject: this.postObject.bind(this),
        // deleteObject: this.deleteObject.bind(this),
        // stopDrawing: () => this.stopDrawing(),
      };

      await window.foliaPdfViewer.init(ui, dataProxy);
      window.foliaPdfViewer.eventBus.on("documentloaded", this.onDocumentLoaded.bind(this));
      window.foliaPdfViewer.eventBus.on("pagechanging", this.onPageChanging.bind(this));
      window.foliaPdfViewer.eventBus.on("scalechanging", this.onScaleChanging.bind(this));
      window.foliaPdfViewer.eventBus.on("floatingbarhide", this.onFloatingBarHide.bind(this));
      window.foliaPdfViewer.eventBus.on("floatingbarshow", this.onFloatingBarShow.bind(this));
      window.foliaPdfViewer.eventBus.on("pagesloaded", this.onPagesLoaded.bind(this));
      window.foliaPdfViewer.eventBus.on("commit-object", this.onPostObject.bind(this));
      window.foliaPdfViewer.eventBus.on("delete-object", this.onDeleteObject.bind(this));
      window.foliaPdfViewer.eventBus.on("stop-drawing", this.onStopDrawing.bind(this));

      window.foliaPdfViewer.eventBus.on("undo-redo-changed", this.onUdpateUndoRedoUI.bind(this));
      window.foliaPdfViewer.eventBus.on("updatefindmatchescount", this.updateFindMatchesCount.bind(this));
      window.foliaPdfViewer.eventBus.on("updatefindcontrolstate", this.updateFindMatchesCount.bind(this));
    } else {
      await window.foliaPdfViewer.close();
    }
    this.#projectId = projectId;
    this.#documentId = documentId;
    await this.getPermissions();
    const content = await this.getContent();
    await this.getObjects();
    await window.foliaPdfViewer.open(content);
  }

  updateFindMatchesCount({ matchesCount }) {
    document.getElementById("search-current").innerHTML = matchesCount.current;
    document.getElementById("search-total").innerHTML = matchesCount.total;
  }

  onPagesLoaded(e) {
    foliaPdfViewer
      .checkForNativeAnnotationsPresence()
      .then((r) => console.log("PDF Document has annotations:", r));
  }

  onUdpateUndoRedoUI({ canUndo, canRedo, stat }) {
    document.querySelector("#undo").toggleAttribute("disabled", !canUndo);
    document.querySelector("#redo").toggleAttribute("disabled", !canRedo);
    // console.log(`UndoRedo ${stat}`);
  }
  onPostObject(objectData) {
    const projectId = this.#projectId;
    const documentId = this.#documentId;
    console.log("postObject", { projectId, documentId, objectData });
  }
  onDeleteObject(objectId) {
    const projectId = this.#projectId;
    const documentId = this.#documentId;
    console.log("deleteObject", { projectId, documentId, objectId });
  }
  onStopDrawing() {
    this.stopDrawing();
  }
  onDocumentLoaded(e) {
    document.querySelector("#currentPage").innerHTML = e.source.page;
    document.querySelector("#totalPages").innerHTML = e.source.pagesCount;
    document.querySelector("#zoomValue").innerHTML = e.source.zoom;
  }
  onPageChanging(e) {
    document.querySelector("#currentPage").innerHTML = e.pageNumber;
  }
  onScaleChanging(e) {
    document.querySelector("#zoomValue").innerHTML = Math.round(e.scale * 100);
  }
  onFloatingBarHide() {
    console.log("hide floating bar");
  }
  onFloatingBarShow(e) {
    console.log("show floating bar", e);
  }

  stopDrawing() {
    document.querySelectorAll(".tool-button").forEach((el) => el.classList.remove("selected"));
    this.drawingTool.type = null;
    this.drawingTool.preset = this.presets.default;
    window.foliaPdfViewer.stopDrawing();
  }

  startDrawing(tool) {
    if (this.drawingTool.type !== tool) this.stopDrawing();
    this.drawingTool.type = tool;
    document.querySelectorAll(".tool-button").forEach((el) => el.classList.remove("selected"));
    document.querySelectorAll(`#${tool}-tool`).forEach((el) => el.classList.add("selected"));

    this.drawingTool.preset = {
      ...this.presets.default,
      ...this.presets[tool],
    };
    window.foliaPdfViewer.startDrawing(this.drawingTool.type, this.drawingTool.preset);

    document.querySelectorAll("#preset-color").forEach((el) => (el.value = this.drawingTool.preset.color));
    document
      .querySelectorAll("#preset-width")
      .forEach((el) => (el.value = this.drawingTool.preset.lineWidth));
    document
      .querySelectorAll("#preset-font_family")
      .forEach((el) => (el.value = this.drawingTool.preset.fontFamily));
    document
      .querySelectorAll("#preset-font_size")
      .forEach((el) => (el.value = this.drawingTool.preset.fontSize));
  }

  toolBtnsOnClick(e) {
    const tool = `${e.currentTarget.id}`.split("-")[0];
    if (tool === "clear") {
      this.stopDrawing();
    } else {
      this.startDrawing(tool);
    }
  }

  presetBtnsOnClick(e) {
    if (!!this.drawingTool.type) {
      const mapNames = {
        "preset-color": "color",
        "preset-width": "lineWidth",
        "preset-font_family": "fontFamily",
        "preset-font_size": "fontSize",
      };
      const keyName = mapNames[e.target.id];
      console.log({ [keyName]: e.target.value });
      const presetData = { [keyName]: e.target.value };
      if (keyName) window.foliaPdfViewer.updateToolDrawingProperties(presetData);
    }
  }

  stopCreatingAnnotation() {
    window.foliaPdfViewer.stopCreatingAnnotation();
    document.getElementById("color-picker").onchange = null;
    document.getElementById("color-picker").setAttribute("disabled", "");
    document.getElementById("width-picker").onchange = null;
    document.getElementById("width-picker").setAttribute("disabled", "");
  }
  startCreatingAnnotation(annoGroup, annoType) {
    const presets = {
      ink: { color: "#b42727", lineWidth: 3, singleCreating: false },
      arrow: { color: "#1e82e6", lineWidth: 7, singleCreating: true },
      circle: { color: "#0d0d99", lineWidth: 11, singleCreating: false },
      square: { color: "#878710", lineWidth: 15, singleCreating: true },
      typewriter: {
        color: "#ff1a1a",
        fontFamily: "Source Sans Pro",
        fontSize: 14,
        fontWeight: "normal",
        textAlign: "left",
        singleCreating: true,
      },
    };
    const preset = presets[annoType] || {};
    document.getElementById("color-picker").value = preset.color || "#ffffff";
    document.getElementById("width-picker").value = preset.lineWidth || 0;
    window.foliaPdfViewer.startCreatingAnnotation(annoType, preset);

    document.getElementById("color-picker").removeAttribute("disabled");
    document.getElementById("color-picker").onchange = (e) => {
      window.foliaPdfViewer.updateDrawingOptions({ color: e.target.value });
    };

    document.getElementById("width-picker").removeAttribute("disabled");
    document.getElementById("width-picker").onchange = (e) => {
      window.foliaPdfViewer.updateDrawingOptions({
        lineWidth: parseInt(e.target.value, 10),
      });
    };
  }
  onWheelListener(e) {
    if (e.ctrlKey) {
      e.preventDefault();
      // e.stopPropagation();
      // e.stopImmediatePropagation();
      const viewerDiv = window.foliaPdfViewer.pdfViewer.container;
      clearTimeout(this.zoomTimerId);
      // const zoomFactor = 0.015;
      const zoomFactor = 0.025;
      let zoomDirection = 0;
      this.zoom = this.zoom || 1;
      if (e.deltaY < 0) {
        zoomDirection = 1;
      } else if (e.deltaY > 0) {
        zoomDirection = -1;
      }
      this.zoom = parseFloat((this.zoom + zoomFactor * zoomDirection).toFixed(2));
      viewerDiv.style.zoom = this.zoom;

      this.zoomTimerId = setTimeout(() => {
        // prettier-ignore
        const newScale = window.foliaPdfViewer.pdfViewer.currentScale * this.zoom;
        window.foliaPdfViewer.pdfViewer.currentScaleValue = newScale;
        window.foliaPdfViewer.forceRendering();
        this.zoom = 1;
        viewerDiv.style.zoom = this.zoom;
      }, 250);
    }
  }
}

document.addEventListener(
  "DOMContentLoaded",
  async function () {
    window.authClient = await auth0.createAuth0Client({
      domain: "auth-dev.folia.com",
      clientId: "sus45pOyOO39C67Xkk0ap4jkJO9Ty4MH",
      useRefreshTokens: true,
      useRefreshTokensFallback: true,
      authorizationParams: {
        scope: "read:workspaces write:workspaces offline_access email",
        audience: "https://folia.com/graphql",
        redirect_uri: window.location.origin,
      },
    });
    const { email } = await window.authClient.getUser();
    localStorage.setItem("email", email);
    const viewer = new Viewer();
    await viewer.resume();

    const refreshBtn = document.querySelector("#refresh");
    refreshBtn.onclick = () => {
      viewer
        .getObjects()
        .then(() => window.foliaPdfViewer.refreshFoliaLayers())
        .catch(console.error);
    };

    // ----- setup zoom buttons -----
    const zoomInBtn = document.querySelector("#zoom-in");
    const zoomOutBtn = document.querySelector("#zoom-out");
    zoomInBtn.onclick = () => window.foliaPdfViewer.zoomIn(5);
    zoomOutBtn.onclick = () => window.foliaPdfViewer.zoomOut(5);

    // ------ setup tool buttons -----
    document.querySelectorAll(".tool-button").forEach((el) => {
      el.onclick = (e) => viewer.toolBtnsOnClick(e);
    });

    // ------ setup tool properties elements -----
    document.querySelectorAll(".preset-button").forEach((el) => {
      el.onchange = (e) => viewer.presetBtnsOnClick(e);
    });

    document.querySelectorAll("#preset-width").forEach((el) => {
      el.oninput = (e) => {
        window.foliaPdfViewer.updateObjectsDrawingProperties({ lineWidth: parseInt(e.target.value, 10) });
      };
    });

    // ------- undo redo ---------
    document.querySelector("#undo").addEventListener("click", () => window.foliaPdfViewer.undo());
    document.querySelector("#redo").addEventListener("click", () => window.foliaPdfViewer.redo());

    // -------- pinch zoom -----------
    document.addEventListener("wheel", viewer.onWheelListener, { passive: false });

    // -------- search -----------
    document.getElementById("search-start").addEventListener("click", () => {
      const query = document.getElementById("search-input")?.value;
      window.foliaPdfViewer.search(query);
    });

    document
      .getElementById("search-next")
      .addEventListener("click", () => window.foliaPdfViewer.searchNext());
    document
      .getElementById("search-prev")
      .addEventListener("click", () => window.foliaPdfViewer.searchPrev());
    document
      .getElementById("duplicate")
      .addEventListener("click", () => window.foliaPdfViewer.duplicateSelectedAnnotations());
  },

  true
);
