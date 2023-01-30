import * as uuid from "uuid";
import { FOLIA_MESSAGE, REQ2FOLIA } from "./async-request-constants";
const REQUEST_TIMEOUT = 3000;

// from pdf.js 2 folia data
const createAsyncReq2Folia = function (requestName, opt) {
  return new Promise((resolve, reject) => {
    const timeoutTimerId = setTimeout(() => {
      reject(new Error(`Request "${requestName}" timed out`));
    }, REQUEST_TIMEOUT);

    const responseName = uuid.v4();
    // console.log('CREATE ASYNC REQ 2 FOLIA', requestName, responseName, opt)
    const customEvent = new CustomEvent(FOLIA_MESSAGE, {
      detail: { requestName, responseName, opt },
    });
    window.addEventListener(
      responseName,
      (e) => {
        // console.log('RECEIVED RESPONSE', e)
        const { data } = e.detail;
        clearTimeout(timeoutTimerId);
        resolve(data);
      },
      { once: true }
    );
    window.dispatchEvent(customEvent);
  });
};
export const getAnnotations = (opt) => createAsyncReq2Folia(REQ2FOLIA.READ_ANNOTATIONS, opt);
export const getUser = (opt) => createAsyncReq2Folia(REQ2FOLIA.READ_USER, opt);
export const getActiveUser = () => createAsyncReq2Folia(REQ2FOLIA.READ_ACTIVE_USER);
export const createAnnotations = (opt) => createAsyncReq2Folia(REQ2FOLIA.CREATE_ANNOTATIONS, opt);

// from folia app 2 pdf.js
const listen2Folia = function (eventName, cb) {
  function listener(e) {
    const { requestName, opt } = e.detail;
    if (eventName === requestName) {
      cb(opt);
    }
  }
  window.addEventListener(FOLIA_MESSAGE, listener);
  return () => {
    window.removeEventListener(FOLIA_MESSAGE, listener);
  };
};
export const listen4refresh = (cb) => listen2Folia(REQ2FOLIA.PAGE_REFRESH, cb);
export const listen4preset = (cb) => listen2Folia(REQ2FOLIA.UPDATING_ANNOTATION_PRESET, cb);
export const listen4startAnnotationBuilder = (cb) => listen2Folia(REQ2FOLIA.STARTING_ANNOTATION_BUILDER, cb);
export const listen4stopAnnotationBuilder = (cb) => listen2Folia(REQ2FOLIA.STOPPING_ANNOTATION_BUILDER, cb);
