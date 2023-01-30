import FoliaPDFViewer from "./folia_app.js";
import FoliaAPI from "./folia_api";
// import './css/folia.css'

const EMAIL = "vitalii@folia.com";
const PASSWORD = "pass2002";
const WORKSPACE_ID = "lUgpF520";
const DOCUMENT_ID = 7;

var foliaAPI, foliaPDFViewer;

class FoliaTestApp {
  constructor() {
    this.foliaAPI = new FoliaAPI();
  }

  async resume() {
    try {
      const uiConfig = {
        container: document.querySelector("#viewerContainer"),
        viewer: document.querySelector("#viewer.pdfViewer"),
      };
      foliaPDFViewer = new FoliaPDFViewer();
      await foliaPDFViewer.init(uiConfig, this.foliaAPI);

      if (!this.foliaAPI.user) await this.signIn();
      if (this.foliaAPI.workspaces.length === 0) await this.signIn();

      const workspace = this.foliaAPI.workspace;
      if (workspace) {
        this._fillCards(this.foliaAPI.workspace.cards);
      } else {
        this._fillWorkspaces(this.foliaAPI.workspaces);
      }
      const pdfBlob = await this.foliaAPI.document;
      if (pdfBlob) {
        await this._openDocument(pdfBlob);
      }
      this.foliaAPI.startCheckContainer();
    } catch (e) {
      console.error(e.message);
      await this.signIn();
    }
  }

  _fillWorkspaces(containers) {
    const workspacesListContainer = document.getElementById("workspaces-list");
    workspacesListContainer.innerHTML = "";

    if (workspacesListContainer) {
      containers.forEach((workspace) => {
        const btn = document.createElement("button");
        btn.className = "folia_btn";
        btn.id = workspace.cid;
        btn.innerText = `${workspace.cid}`.toUpperCase();
        btn.onclick = () => {
          if (this.foliaAPI.workspace) {
            this._fillCards(this.foliaAPI.workspace.cards);
          } else {
            btn.classList.add("loading");
            this.foliaAPI
              .loadWorkspace(workspace.cid)
              .then((data) => this._fillCards(data.workspace.cards))
              .catch(console.error)
              .finally(() => btn.classList.remove("loading"));
          }
        };
        workspacesListContainer.appendChild(btn);
      });
    }
  }

  _fillCards(cards) {
    const workspacesListContainer = document.getElementById("workspaces-list");
    workspacesListContainer.innerHTML = "";

    cards.forEach((card) => {
      const btn = document.createElement("button");
      btn.className = "folia_btn";
      btn.id = card.object_id;
      btn.innerText = `card ${card.object_id}`.toUpperCase();
      btn.onclick = () => {
        if (this.foliaAPI.cardId !== card.object_id) {
          localStorage.removeItem("cardId");
          localStorage.removeItem("document");
        }
        btn.classList.add("loading");
        this.foliaAPI.document
          .then((pdfBlob) => pdfBlob || this.foliaAPI.loadDocument(card.object_id))
          .then((pdfBlob) => this._openDocument(pdfBlob))
          .catch(console.error)
          .finally(() => btn.classList.remove("loading"));
      };
      workspacesListContainer.appendChild(btn);
    });
  }

  _openDocument(pdfBlob) {
    return foliaPDFViewer.open(pdfBlob, {
      workspaceId: this.foliaAPI.workspace.cid,
      documentId: this.foliaAPI.cardId,
    });
  }

  async signIn() {
    const signInBtn = document.getElementById("sign-in");
    try {
      const workspacesListContainer = document.getElementById("workspaces-list");
      workspacesListContainer.innerHTML = "";
      signInBtn.classList.add("loading");
      await this.foliaAPI.signIn(EMAIL, PASSWORD);
      const containers = await this.foliaAPI.loadWorkspaces();
      this._fillWorkspaces(containers);
      signInBtn.classList.remove("loading");
    } catch (e) {
      signInBtn.classList.remove("loading");
      console.error(e.message);
    }
  }
}

var foliaTestApp;

document.addEventListener(
  "DOMContentLoaded",
  async function () {
    foliaTestApp = new FoliaTestApp();
    await foliaTestApp.resume();
    addUIListeners();
  },
  true
);

function scaleChanging(pdfViewer) {
  document.querySelector("#zoom-value").innerHTML = pdfViewer.zoom;
}

function pageChanging(pdfViewer) {
  document.querySelector("#current-page").innerHTML = pdfViewer.page;
}

function documentLoaded(pdfViewer) {
  document.querySelector("#current-page").innerHTML = pdfViewer.page;
  document.querySelector("#total-pages").innerHTML = pdfViewer.pagesCount;
}

function addUIListeners() {
  document.querySelector("#sign-in").addEventListener("click", () => {
    console.log("sign-in");
    foliaTestApp.signIn();
  });
  document.querySelector("#zoomInBtn").addEventListener("click", () => {
    console.log("zoomInBtn");
    foliaPDFViewer.zoomIn();
  });
  document.querySelector("#zoomOutBtn").addEventListener("click", () => {
    console.log("zoomOutBtn");
    foliaPDFViewer.zoomOut();
  });
  document.querySelector("#zoomResetBtn").addEventListener("click", () => {
    console.log("zoomResetBtn");
    foliaPDFViewer.zoomReset();
  });
}
