import {projects} from "paper";
import * as uuid from 'uuid'

class FoliaCore {
  api;
  constructor(api) {
    this.api = api
  }

  getPageAnnotations = async (page) => {
    return new Promise(resolve => {
      setTimeout(() => {
        const card = this.api.getCard(7)
        if (!card) return []
        resolve(
          card.annotations
            .map(anno => ({...anno, localId: uuid.v4()}))
            .filter(anno => anno.page === page && anno.deleted !== 1)
        )
      }, 500)
    })
  }

  getAnnotation = async (id) => {}

  updateAnnotation = async (id, data) => {}

  deleteAnnotation = async (id) => {}
}

export default FoliaCore
