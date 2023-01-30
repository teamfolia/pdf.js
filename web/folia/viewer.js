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
      fontSize: 13,
      fontWeight: "normal",
      textAlign: "left",
    },
    [TOOLS.INK]: { color: "#0000FF", lineWidth: 3 },
    [TOOLS.SQUARE]: { color: "#00FF00", lineWidth: 6 },
    [TOOLS.CIRCLE]: { color: "#FF0000", lineWidth: 9 },
    [TOOLS.ARROW]: { color: "#006eff", lineWidth: 12 },
    [TOOLS.TEXT_BOX]: {
      color: "#FF00FF",
      fontFamily: "Courier Prime",
      fontSize: 17,
      fontWeight: "normal",
      textAlign: "left",
    },
    [TOOLS.MARKER]: { color: "#CCCCCC" },
    [TOOLS.UNDERLINE]: { color: "#999999" },
    [TOOLS.CROSSLINE]: { color: "#444444" },
  };
  drawingTool = {
    type: null,
    preset: this.presets.default,
  };

  #workspaceId;
  #documentId;

  constructor() {}

  async #fetchWrapper(method, path, data) {
    const contentType = data instanceof Blob ? APPLICATION_STREAM : APPLICATION_JSON;
    const body = data instanceof Blob ? data : JSON.stringify(data);
    const init = {
      method,
      headers: {
        "content-type": contentType,
        "graphql-server": VITE_GRAPHQL_SERVER,
        "graphql-access-token": localStorage.getItem("access_token"),
        "user-email": localStorage.getItem("email"),
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
  async getContent() {
    const workspaceId = this.#workspaceId;
    const documentId = this.#documentId;
    const path = `/store/workspaces/${workspaceId}/documents/${documentId}/content`;
    return await this.$fetch.get(path);
  }

  async getObjects(pageNumber) {
    const workspaceId = this.#workspaceId;
    const documentId = this.#documentId;

    const path = `/store/workspaces/${workspaceId}/documents/${documentId}/objects`;
    const objects = await this.$fetch.get(path);
    return objects
      .filter((object) => object.page === pageNumber)
      .map((object) => {
        return {
          ...object,
          permissions: {
            canCreate: true,
            canUpdate: true,
            canDelete: true,
            canDeleteConversation: true,
            canAddReply: true,
          },
        };
      });
  }

  async putObject(objectData) {
    const workspaceId = this.#workspaceId;
    const documentId = this.#documentId;
  }

  updateObjectsDealy = null;
  updatedObjects = [];
  postObject(objectData) {
    const workspaceId = this.#workspaceId;
    const documentId = this.#documentId;
    console.log("postObject", objectData);
  }

  objectsSelected(data) {
    // console.log("objectsSelected", data);
  }
  // end of api requests

  async resume() {
    const storedWorkspaceId = sessionStorage.getItem("workspaceId");
    const workspaces = await this.$fetch.get("/store/workspaces");

    const workspacesList = document.getElementById("workspaces-list");
    workspacesList.onchange = () => this.openWorkspace(workspacesList.value);
    workspaces.forEach((workspace) => {
      if (workspace.deleted) return;
      const option = document.createElement("option");
      option.value = workspace.id;
      option.label = workspace.name + ` (${workspace.totalDocuments})`;
      option.selected = workspace.id === storedWorkspaceId;
      workspacesList.appendChild(option);
    });
    if (storedWorkspaceId) await this.openWorkspace(storedWorkspaceId);
  }
  async openWorkspace(workspaceId) {
    sessionStorage.setItem("workspaceId", workspaceId);
    const storedDocumentId = sessionStorage.getItem("documentId");

    const documents = await this.$fetch.get(`/store/workspaces/${workspaceId}/documents`);
    const documentsList = document.getElementById("documents-list");
    documentsList.innerHTML = "<option>select document</option>";
    documentsList.onchange = () => this.openDocument(workspaceId, documentsList.value);
    documents.forEach((doc) => {
      if (doc.deleted) return;
      const option = document.createElement("option");
      option.value = doc.id;
      option.label = doc.name;
      option.selected = doc.id === storedDocumentId;
      documentsList.appendChild(option);
    });

    if (storedDocumentId) await this.openDocument(workspaceId, storedDocumentId);
  }
  async openDocument(workspaceId, documentId) {
    sessionStorage.setItem("documentId", documentId);

    if (!window.foliaPdfViewer) {
      window.foliaPdfViewer = new FoliaPDFViewer();
      const ui = {
        container: document.getElementById("viewerContainer"),
        viewer: document.getElementById("viewer"),
      };
      const dataProxy = {
        get userEmail() {
          return localStorage.getItem("email");
        },
        get documentId() {
          return documentId;
        },
        getObjects: this.getObjects.bind(this),
        postObject: this.postObject.bind(this),
        putObject: this.putObject.bind(this),
        objectsSelected: this.objectsSelected.bind(this),
        stopDrawing: () => this.stopDrawing(),
      };

      await window.foliaPdfViewer.init(ui, dataProxy);
      window.foliaPdfViewer.eventBus.on("documentloaded", this.onDocumentLoaded.bind(this));
      window.foliaPdfViewer.eventBus.on("pagechanging", this.onPageChanging.bind(this));
      window.foliaPdfViewer.eventBus.on("scalechanging", this.onScaleChanging.bind(this));
    } else {
      await window.foliaPdfViewer.close();
    }

    this.#workspaceId = workspaceId;
    this.#documentId = documentId;
    const content = await this.getContent();
    await window.foliaPdfViewer.open(content);
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
}

document.addEventListener(
  "DOMContentLoaded",
  async function () {
    const viewer = new Viewer();
    await viewer.resume();

    // ----- setup zoom buttons -----
    const zoomInBtn = document.querySelector("#zoomInBtn");
    const zoomOutBtn = document.querySelector("#zoomOutBtn");
    zoomInBtn.onclick = () => window.foliaPdfViewer.zoomIn();
    zoomOutBtn.onclick = () => window.foliaPdfViewer.zoomOut();

    // ------ setup tool buttons -----
    document.querySelectorAll(".tool-button").forEach((el) => {
      el.onclick = (e) => viewer.toolBtnsOnClick(e);
    });

    // ------ setup tool properties elements -----
    document.querySelectorAll(".preset-button").forEach((el) => {
      el.onchange = (e) => viewer.presetBtnsOnClick(e);
    });
  },
  true
);
