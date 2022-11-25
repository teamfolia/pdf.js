import {EventBus} from "../event_utils";

const MAIN_URL = 'https://app.dev.folia.com'
const PUBLISH_SERVER = 'https://dev.x.branchfire.com/b'
const ACCOUNT_SERVER = 'https://tyr.x.branchfire.com/api/v1'
const APP_SECRET = '758d9b9f-7b34-4ca4-9070-8ad9a221cbe8'
const APP_NAME = 'folia-webapp-v1'
const APPLE_CLIENT_ID = 'com.branchfire.folia.web'
const MOBILE_APP_SCHEMA = 'com.okta.folia.qa://response'
const AMPLITUDE_API_KEY = '82541a45ac1557b8e164931b4c65047a'

function storage2blob(base64) {
  return fetch(base64).then(res => res.blob())
}
function blob2storage(blob) {
  return new Promise((resolve, reject) => {
    const fileReader = new FileReader()
    fileReader.onload = function () {
      resolve(fileReader.result)
    }
    fileReader.onerror = function (err) {
      reject(err)
    }
    fileReader.readAsDataURL(blob)
  })
}

class FoliaAPI {

  constructor() {
  }

  async #api_request(path, body, method = 'POST') {
    const headers = {}
    headers['Content-Type'] = 'application/json'
    headers['X-Account-Application'] = APP_NAME

    const authPaths = ['user/login']
    const baseUrl = authPaths.includes(path) ? ACCOUNT_SERVER : PUBLISH_SERVER
    let url = `${baseUrl}/${path}`
    if (this.user && this.user['auth']) {
      url += /\?/g.test(path)
        ? `&v=8&auth=${this.user['auth']}`
        : `?v=8&auth=${this.user['auth']}`
    }

    const response = await fetch(url, {
      method, headers, body: body ? JSON.stringify(body) : null
    })
    return /^cdoc/.test(path) ? await response.blob() : await response.json()
  }
  get user() {
    return JSON.parse(localStorage.getItem('user'))
  }
  get workspaces() {
    return JSON.parse(localStorage.getItem('workspaces')) || []
  }
  get workspace() {
    return JSON.parse(localStorage.getItem('workspace'))
  }
  get cardId() {
    return parseInt(localStorage.getItem('cardId'), 10)
  }
  get document() {
    const base64 = localStorage.getItem('document')
    return base64 ? storage2blob(base64) : Promise.resolve(null)
  }
  filterAnnotations({workspaceId, documentId, pageNumber}) {
    // console.log({workspaceId, documentId, pageNumber})
    if (!this.workspace) return []

    const card = this.workspace.cards.find(card => card.object_id === this.cardId)
    if (!card) return []

    // console.log(card)
    return card.annotations
      .filter(anno => anno.page === pageNumber)
      .map(anno => {
        if (['arrow', 'square', 'circle'].includes(anno.annoType)) {
          return {...anno, annoType: 'shape', annoSubType: anno.annoType}
        } if (['highlight', 'underline', 'strikeout'].includes(anno.annoType)) {
          return {...anno, annoType: 'highlight', annoSubType: anno.annoType}
        } else {
          return anno
        }
      })
  }


  reset() {
    localStorage.clear()
  }
  async signIn(email, password) {
    this.reset()
    const userData = await this.#api_request('user/login', {
      user: {email, password}
    })
    const userAuth = await this.#api_request('proxyLogin', {
      email, token: userData.user['auth_token']
    })
    const user = {
      ...userData.user, ...userAuth
    }
    localStorage.setItem('user', JSON.stringify(user))
  }
  async loadWorkspaces() {
    const {containers} = await this.#api_request('clist', null, 'GET')
    const workspaces = containers
    localStorage.setItem('workspaces', JSON.stringify(workspaces))
    return workspaces
  }
  async loadWorkspace(workspaceId, object = 0, mod = 0) {
    const workspaceData = await this.#api_request('checkContainer', {
      cid: workspaceId, object, mod
    })

    let objects = workspaceData.objects instanceof Array
      ? workspaceData.objects
      : Object.values(workspaceData.objects)
    objects = objects.sort((objA, objB) => {
      const ORDER = {
        'session': 0,
        'card': 1,
        'annotation': 2,
        'conversation': 3,
        'comment': 3,
        'asset': 4
      }
      return ORDER[objA.type] === ORDER[objB.type]
        ? objA['object_id'] - objB['object_id']
        : ORDER[objA.type] - ORDER[objB.type]
    })

    let workspace = {
      cid: workspaceId, mod: workspaceData.mod, object: workspaceData.object
    }
    for (const objData of objects) {
      objData.deleted = Boolean(objData.deleted)
      switch (objData.type) {
        case 'session': {
          Object.assign(workspace, objData)
          break
        }
        case 'card': {
          const card = objData
          card.asset = objects.find(obj => obj.object_id === objData.document)
          const assetData = workspaceData.assets.find(ad => ad.hash === card.asset.checksum)
          Object.assign(card.asset, assetData)

          workspace.cards = workspace.cards || []
          workspace.cards.push(card)
          break
        }
        case 'annotation': {
          const card = workspace.cards.find(card => card.object_id === objData.context)
          if (!card) break
          card.annotations = card.annotations || []
          card.annotations.push({...objData, localId: `${card.annotations.length}`})
          break
        }
        default: break
      }
    }

    let hasChanges = false
    if (this.workspace && (this.workspace.mod !== workspace.mod || this.workspace.object !== workspace.object)) {
      hasChanges = true
    }
    localStorage.setItem('workspace', JSON.stringify(workspace))
    return {workspace, object, mod, hasChanges}
  }
  async loadDocument(cardId) {
    localStorage.removeItem('cardId')
    const card = this.workspace.cards.find(card => card['object_id'] === cardId)
    if (!card) throw new Error('no card found')

    const cid = this.workspace.cid
    const docref = card.asset.docref
    const path = `cdoc?cid=${cid}&id=${docref}&content_type=doc`
    const blob = await this.#api_request(path, null, 'GET')
    const base64 = await blob2storage(blob)
    try {
      localStorage.setItem('cardId', cardId)
      localStorage.setItem('document', base64)
    } catch (e) {
      console.error(e.message)
    }
    return blob
  }

  startCheckContainer() {
    setTimeout(() => {
      this.loadWorkspace(this.workspace.cid)
        .then(({workspace, hasChanges}) => {
          if (!workspace) return
          let card = workspace.cards.find(card => card['object_id'] === this.cardId)
          if (!card) throw new Error('no card found')
          const {annotations} = card
          console.log('checkContainer -> ', this.workspace.cid, workspace.mod, workspace.object, annotations.length)
          if (hasChanges && this.eventBus) {
            this.eventBus.dispatch('folia:has_changes', {
              workspaceId: this.workspace.cid, mod: workspace.mod, object: workspace.object
            })
          }
        })
        .catch(console.error)
        .then(() => this.startCheckContainer())
    }, 5000)
  }

  onFoliaObjectUpdated(evt) {
    console.log(evt, this)
  }

  connectEventBus(eventBus) {
    this.eventBus = eventBus
    this.eventBus.on('folia:object:updated', this.onFoliaObjectUpdated)
  }
  disconnectEventBus(eventBus) {
    this.eventBus.off('folia:object:updated', this.onFoliaObjectUpdated)
  }
}

export default FoliaAPI
