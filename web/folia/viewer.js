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
      fontSize: 12,
      fontWeight: "normal",
      textAlign: "left",
    },
    [TOOLS.INK]: { color: "#0000FF", lineWidth: 15 },
    [TOOLS.SQUARE]: { color: "#00FF00", lineWidth: 6 },
    [TOOLS.CIRCLE]: { color: "#FF0000", lineWidth: 9 },
    [TOOLS.ARROW]: { color: "#006eff", lineWidth: 4 },
    [TOOLS.TEXT_BOX]: {
      color: "#111111FF",
      fontFamily: "SANS_SERIF",
      fontSize: 12,
      fontWeight: "W400",
      textAlignment: "START",
    },
    [TOOLS.MARKER]: { color: "#00FF00" },
    [TOOLS.UNDERLINE]: { color: "#FF00EA" },
    [TOOLS.CROSSLINE]: { color: "#444444" },
    [TOOLS.STAMPS + "ink"]: {
      stamp: {
        __typename: "InkDocumentStamp",
        addedAt: "2023-08-26T14:57:02.880Z",
        stampId: "3bd3e693-61f8-44c0-9399-ae3d73648370",
        name: "green fish",
        pageSize: [595.35, 841.995],
        lineWidth: 9,
        color: "#0D9488FF",
        paths: [
          [
            0.48445159, 0.70504853, 0.48540901, 0.70504853, 0.48540901, 0.70578835, 0.48732384, 0.70726799,
            0.48828125, 0.70726799, 0.49115349, 0.70874763, 0.49115349, 0.70948745, 0.49115349, 0.70948745,
            0.49402574, 0.71170691, 0.49498315, 0.71170691, 0.49498315, 0.71318655, 0.49689798, 0.71318655,
            0.49689798, 0.71392637, 0.49785539, 0.71392637, 0.49785539, 0.71540601, 0.50072763, 0.71614583,
            0.50264246, 0.71836529, 0.50359988, 0.71984493, 0.50647212, 0.72058475, 0.50838695, 0.72206439,
            0.50934436, 0.72354403, 0.51125919, 0.72428385, 0.52083333, 0.73168205, 0.52274816, 0.73242188,
            0.52370558, 0.73390152, 0.52849265, 0.73760062, 0.53040748, 0.73834044, 0.5323223, 0.73982008,
            0.53327972, 0.74203954, 0.53998162, 0.744259, 0.54285386, 0.74647846, 0.54476869, 0.74721828,
            0.5457261, 0.74869792, 0.5457261, 0.74869792, 0.54859835, 0.74943774, 0.56391697, 0.75757576,
            0.56678922, 0.75831558, 0.5725337, 0.76127486, 0.57444853, 0.76127486, 0.57732077, 0.7627545,
            0.5792356, 0.7627545, 0.58498009, 0.76423414, 0.58880974, 0.76423414, 0.59072457, 0.76497396,
            0.59168199, 0.76497396, 0.59359681, 0.76571378, 0.59646906, 0.76571378, 0.60221354, 0.76719342,
            0.62040441, 0.76719342, 0.63380821, 0.76497396, 0.63668045, 0.76497396, 0.63763787, 0.76423414,
            0.64242494, 0.7627545, 0.64529718, 0.76127486, 0.65391391, 0.75831558, 0.65487132, 0.75757576,
            0.65582874, 0.75757576, 0.66253064, 0.75387666, 0.66253064, 0.75387666, 0.66348805, 0.7516572,
            0.67114737, 0.74721828, 0.67114737, 0.74647846, 0.67497702, 0.74277936, 0.67497702, 0.74203954,
            0.67593444, 0.73982008, 0.67689185, 0.73834044, 0.67689185, 0.72946259, 0.67593444, 0.72946259,
            0.67593444, 0.72724313, 0.67497702, 0.72650331, 0.67497702, 0.72576349, 0.67114737, 0.72280421,
            0.67018995, 0.72058475, 0.66827512, 0.72058475, 0.66540288, 0.71836529, 0.66540288, 0.71836529,
            0.65774357, 0.71614583, 0.65487132, 0.71540601, 0.65199908, 0.71540601, 0.64912684, 0.71392637,
            0.63093597, 0.71392637, 0.62519148, 0.71392637, 0.62519148, 0.71540601, 0.62231924, 0.71540601,
            0.61657475, 0.71614583, 0.61178768, 0.71762547, 0.60891544, 0.71762547, 0.60700061, 0.71836529,
            0.60508578, 0.71836529, 0.60412837, 0.71836529, 0.60029871, 0.71836529, 0.5993413, 0.71984493,
            0.59742647, 0.71984493, 0.59646906, 0.72058475, 0.59168199, 0.72058475, 0.59168199, 0.72058475,
            0.58880974, 0.72058475, 0.58785233, 0.72206439, 0.58498009, 0.72206439, 0.58210784, 0.72354403,
            0.5792356, 0.72354403, 0.5792356, 0.72428385, 0.57157629, 0.72576349, 0.56870404, 0.72724313,
            0.56678922, 0.72724313, 0.56295956, 0.72946259, 0.55817249, 0.73094223, 0.55625766, 0.73242188,
            0.55147059, 0.73390152, 0.5457261, 0.73834044, 0.53519455, 0.74277936, 0.53423713, 0.744259,
            0.53136489, 0.74647846, 0.53040748, 0.74647846, 0.52849265, 0.74721828, 0.52657782, 0.74869792,
            0.52370558, 0.75091738, 0.52179075, 0.7516572, 0.50934436, 0.7590554, 0.50647212, 0.76127486,
            0.50647212, 0.7627545, 0.50551471, 0.7627545, 0.50264246, 0.76423414, 0.50264246, 0.76423414,
            0.50072763, 0.76571378, 0.49977022, 0.76571378, 0.49402574, 0.77089252, 0.49211091, 0.77089252,
            0.49115349, 0.77311198, 0.49115349, 0.77311198, 0.48445159, 0.7775509, 0.48349418, 0.7775509,
            0.48157935, 0.77829072, 0.48062194, 0.77829072, 0.47774969, 0.78051018, 0.47487745, 0.78198982,
            0.47487745, 0.78272964, 0.47200521, 0.78420928, 0.47104779, 0.78420928, 0.46817555, 0.78568892,
            0.46338848, 0.78642874, 0.46338848, 0.78716856, 0.46051624, 0.78716856, 0.45955882, 0.78790838,
            0.45668658, 0.78790838, 0.45381434, 0.78938802, 0.4509421, 0.78938802, 0.4509421, 0.79012784,
            0.44615502, 0.79012784, 0.44519761, 0.79086766, 0.44328278, 0.79086766, 0.44232537, 0.79012784,
            0.44232537, 0.78938802, 0.44136795, 0.78938802,
          ],
          [
            0.63763787, 0.73094223, 0.63668045, 0.73020241, 0.63476563, 0.73020241, 0.63476563, 0.73094223,
            0.63380821, 0.73094223, 0.63189338, 0.73168205, 0.63189338, 0.73242188, 0.63189338, 0.73242188,
            0.63189338, 0.7331617, 0.63093597, 0.7331617, 0.63093597, 0.73464134, 0.62902114, 0.73538116,
            0.62902114, 0.73982008, 0.63189338, 0.73982008, 0.63189338, 0.73982008, 0.63572304, 0.73982008,
            0.63572304, 0.73982008, 0.63668045, 0.73982008, 0.63668045, 0.73834044, 0.63763787, 0.73834044,
            0.63763787, 0.73760062, 0.63859528, 0.73760062, 0.64051011, 0.73612098, 0.64146752, 0.73612098,
            0.64146752, 0.73538116, 0.64242494, 0.73538116, 0.64242494, 0.7331617, 0.64146752, 0.7331617,
            0.64146752, 0.73242188, 0.6395527, 0.73242188, 0.63859528, 0.73168205, 0.63476563, 0.73168205,
            0.63476563, 0.73242188,
          ],
          [
            0.47966452, 0.70652817, 0.48062194, 0.70874763, 0.48540901, 0.71614583, 0.48636642, 0.71984493,
            0.48732384, 0.71984493, 0.48732384, 0.72206439, 0.48923866, 0.72428385, 0.48923866, 0.72576349,
            0.49115349, 0.72650331, 0.49115349, 0.72872277, 0.49115349, 0.73168205, 0.49211091, 0.73242188,
            0.49211091, 0.73612098, 0.49402574, 0.73760062, 0.49402574, 0.74203954, 0.49402574, 0.74277936,
            0.49402574, 0.7516572, 0.49402574, 0.75313684, 0.49402574, 0.7553563, 0.49211091, 0.75609612,
            0.49211091, 0.75831558, 0.49115349, 0.75831558, 0.49115349, 0.75979522, 0.49115349, 0.76053504,
            0.49115349, 0.7627545, 0.48923866, 0.7627545, 0.48923866, 0.76497396, 0.48828125, 0.76497396,
            0.48828125, 0.7664536, 0.48732384, 0.76719342, 0.48636642, 0.76941288, 0.48540901, 0.76941288,
            0.48445159, 0.77163234, 0.48349418, 0.77163234, 0.48349418, 0.77311198, 0.48253676, 0.77311198,
            0.48253676, 0.77311198, 0.48157935, 0.77311198, 0.47870711, 0.77533144, 0.47774969, 0.77533144,
            0.47774969, 0.77607126, 0.47679228, 0.77607126, 0.47583487, 0.7775509, 0.47583487, 0.7775509,
            0.47392004, 0.7775509, 0.47392004, 0.77829072, 0.47200521, 0.77829072, 0.47200521, 0.77977036,
            0.47104779, 0.77977036, 0.46913297, 0.77977036, 0.46913297, 0.77977036, 0.46913297, 0.78051018,
            0.46817555, 0.78051018, 0.46626072, 0.78198982, 0.46530331, 0.78198982, 0.46530331, 0.78272964,
            0.46051624, 0.78272964, 0.46051624, 0.78272964, 0.45955882, 0.78272964, 0.457644, 0.78420928,
            0.4509421, 0.78642874, 0.4509421, 0.78716856, 0.44902727, 0.78716856, 0.44902727, 0.78790838,
            0.4442402, 0.78790838,
          ],
          [
            0.61370251, 0.71614583, 0.61370251, 0.71614583, 0.61178768, 0.71984493, 0.61083027, 0.71984493,
            0.60987286, 0.72058475, 0.60987286, 0.72058475, 0.60891544, 0.72058475, 0.60891544, 0.72206439,
            0.60795803, 0.72206439, 0.60795803, 0.72354403, 0.60700061, 0.72354403, 0.60700061, 0.72576349,
            0.6060432, 0.72576349, 0.6060432, 0.72724313, 0.60508578, 0.72798295, 0.60508578, 0.73020241,
            0.60412837, 0.73020241, 0.60412837, 0.74203954, 0.60508578, 0.74203954, 0.60508578, 0.744259,
            0.6060432, 0.744259, 0.6060432, 0.74647846, 0.60700061, 0.74647846, 0.60700061, 0.74721828,
            0.60795803, 0.74721828, 0.60795803, 0.74869792, 0.60891544, 0.74943774, 0.61083027, 0.75313684,
            0.61178768, 0.75313684, 0.61370251, 0.7553563, 0.61370251, 0.7553563, 0.61370251, 0.75609612,
            0.61465993, 0.75609612, 0.61465993, 0.75609612, 0.61657475, 0.75609612, 0.61657475, 0.75757576,
            0.61657475, 0.75757576, 0.61657475, 0.75831558, 0.61753217, 0.75831558, 0.61753217, 0.7590554,
            0.619447, 0.7590554, 0.619447, 0.75979522, 0.619447, 0.75979522, 0.619447, 0.76053504, 0.62040441,
            0.76053504, 0.62040441, 0.76127486, 0.62231924, 0.76127486,
          ],
          [
            0.66827512, 0.73168205, 0.66827512, 0.73242188, 0.66731771, 0.73242188, 0.66731771, 0.7331617,
            0.66540288, 0.73390152, 0.66540288, 0.73390152, 0.66540288, 0.73464134, 0.66348805, 0.73464134,
            0.66348805, 0.73538116, 0.66253064, 0.73538116, 0.66253064, 0.73612098, 0.66061581, 0.73612098,
            0.66061581, 0.73760062, 0.65965839, 0.73760062, 0.65965839, 0.73760062,
          ],
        ],
      },
      preview:
        "data:image/png;base64,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",
    },
    [TOOLS.STAMPS + "circle"]: {
      stamp: {
        __typename: "CircleDocumentStamp",
        addedAt: "2023-08-26T16:59:24.602Z",
        stampId: "5cd558dc-724e-4c8b-b68f-e89280d01314",
        name: "black circle",
        pageSize: [595.35, 841.995],
        lineWidth: 20,
        color: "#000000FF",
        rect: [0.80279993, 0.23754494, 0.96273679, 0.35631741],
      },
      preview:
        "data:image/png;base64,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",
    },
    [TOOLS.STAMPS]: {
      stamp: {
        __typename: "ArrowDocumentStamp",
        addedAt: "2023-08-29T10:58:58.633Z",
        stampId: "012d91b2-cc57-42f4-9c78-c40b8381d2ef",
        name: "big orange arrow",
        pageSize: [595.35, 841.995],
        sourcePoint: [0.22165388, 0.70158103],
        targetPoint: [0.10763001, 0.44219368],
        lineWidth: 20,
        color: "#F59E0BFF",
      },
      preview:
        "data:image/png;base64,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",
    },
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
    this.owner = await this.$fetch.get("/store/owner");
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
          return that.owner.email;
        },
        get userName() {
          return that.owner.name;
        },
        get documentId() {
          return documentId;
        },
        get permissions() {
          return that.permissions;
        },
        getObjects: (pageNumber) => this.#annotations.filter((object) => object.page === pageNumber),
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
    console.log("postObject", objectData.text);
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
    console.log(
      "show floating bar",
      e.objects.map((obj) => obj.getRawData(true))
    );
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
