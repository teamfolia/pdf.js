const dataDog = console;

export class FoliaMessages {
  constructor() {
    navigator.serviceWorker.addEventListener("message", (e) => {
      const { messageType, messageData } = e.data;
      if (messageType === FoliaMessages.DATADOG_INFO) {
        const { message, context } = messageData;
        dataDog.log(message, context);
      } else if (messageType === FoliaMessages.DATADOG_ERROR) {
        const { message, error } = messageData;
        dataDog.error(message, error);
      } else {
        this.#serviceWorkerListener(e);
      }
    });
    this.subscribers = {};
  }

  static TOAST = "TOAST";
  static SYNC_STATUS = "SYNC_STATUS";
  static OWNER_UPDATED = "OWNER_UPDATED";
  static PROJECTS_UPDATED = "PROJECTS_UPDATED";
  static PROJECT_UPDATED = "PROJECT_UPDATED";
  static COLLABORATORS_UPDATED = "COLLABORATORS_UPDATED";
  static DOCUMENT_UPDATED = "DOCUMENT_UPDATED";
  static SEARCH_CHUNK = "SEARCH_CHUNK";
  static DATADOG_INFO = "DATADOG_INFO";
  static DATADOG_ERROR = "DATADOG_ERROR";

  #serviceWorkerListener(e) {
    const { messageType, messageData } = e.data;
    this.dispatch(messageType, messageData);
  }

  on(type, subscriber) {
    this.subscribers[type] ||= new Set();
    this.subscribers[type].add(subscriber);
  }

  off(type, subscriber) {
    this.subscribers[type] ||= new Set();
    this.subscribers[type].delete(subscriber);
  }

  dispatch(type, data) {
    this.subscribers[type] ||= new Set();
    for (const subscriber of this.subscribers[type]) {
      try {
        subscriber(data);
      } catch (e) {
        console.error(e);
      }
    }
  }
}
