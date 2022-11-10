
const MAIN_URL = 'https://app.dev.folia.com'
const PUBLISH_SERVER = 'https://dev.x.branchfire.com/b'
const ACCOUNT_SERVER = 'https://tyr.x.branchfire.com/api/v1'
const APP_SECRET = '758d9b9f-7b34-4ca4-9070-8ad9a221cbe8'
const APP_NAME = 'folia-webapp-v1'
const APPLE_CLIENT_ID = 'com.branchfire.folia.web'
const MOBILE_APP_SCHEMA = 'com.okta.folia.qa://response'
const AMPLITUDE_API_KEY = '82541a45ac1557b8e164931b4c65047a'

class FoliaAPI {
  #user
  #workspace
  constructor() {
    const storedUser = localStorage.getItem('user')
    if (storedUser) {
      this.#user = JSON.parse(storedUser)
      const storedWorkspace = localStorage.getItem('workspace')
      if (storedWorkspace) {
        this.#workspace = JSON.parse(storedWorkspace)
      }
    }
  }

  async #api_request(path, body, method = 'POST') {
    const headers = {}
    headers['Content-Type'] = method.toUpperCase() === 'GET' ? 'text/plain': 'application/json'
    headers['X-Account-Application'] = APP_NAME

    const authPaths = ['user/login']
    const baseUrl = authPaths.includes(path) ? ACCOUNT_SERVER : PUBLISH_SERVER
    let url = `${baseUrl}/${path}`
    if (this.#user && this.#user['auth']) {
      url += /\?/g.test(path)
        ? `&v=8&auth=${this.#user['auth']}`
        : `?v=8&auth=${this.#user['auth']}`
    }

    const response = await fetch(url, {
      method, headers, body: body ? JSON.stringify(body) : null
    })
    return method.toUpperCase() === 'POST'
      ? await response.json()
      : await response.blob()
  }

  reset() {
    this.#user = null
    this.#workspace = null
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
    this.#user = {
      ...userData.user, ...userAuth
    }
    localStorage.setItem('user', JSON.stringify(this.#user))
  }

  async loadWorkspace(workspaceId) {
    const workspaceData = await this.#api_request('checkContainer', {
      cid: workspaceId, object: 0, mod: 0
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

    let workspace = {cid: workspaceId}
    for (const objData of objects) {
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
          card.annotations.push(objData)
          break
        }
        default: break
      }
    }

    localStorage.setItem('workspace', JSON.stringify(workspace))
    this.#workspace = workspace
  }

  async loadDocument(cardId) {
    const card = this.#workspace.cards.find(card => card['object_id'] === cardId)
    if (!card) throw new Error('no card found')

    const cid = this.#workspace.cid
    const docref = card.asset.docref
    const path = `cdoc?cid=${cid}&id=${docref}&content_type=doc`
    return await this.#api_request(path, null, 'GET')
  }

  async retrieveDocument(email, password, workspaceId, documentId) {
    if (!this.#user) {
      await this.signIn(email, password)
    }

    if (!this.#workspace) {
    }
    await this.loadWorkspace(workspaceId)
    let card = this.#workspace.cards.find(card => card['object_id'] === documentId)
    if (!card) {
      await this.loadWorkspace(workspaceId)
      card = this.#workspace.cards.find(card => card['object_id'] === documentId)
    }

    if (!card) throw new Error('no card found')
    const annotations = card.annotations.filter(anno => anno.deleted === 0)
    const pdfBlob = await this.loadDocument(documentId)
    return {pdfBlob, annotations}
  }

  getWorkspace = () => {
    return this.#workspace
  }

  getCard = (cardId) => {
    if (!this.#workspace) return;
    return this.#workspace.cards.find(card => card.object_id === cardId);
  }
}

export default FoliaAPI
