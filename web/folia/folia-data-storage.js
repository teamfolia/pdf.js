export default class FoliaDataStorage {
  constructor() {}

  async #fetchWrapper(app, method, path, data) {
    try {
      const accessToken = localStorage.getItem("access_token");
      const [, tokenBody] = accessToken.split(".");
      const token = JSON.parse(window.atob(tokenBody));
      const now = Math.round(new Date().getTime() / 1000);
      if (token.exp - now < 300) {
        console.warn("The access token will expire soon");
        await app.config.globalProperties.$auth0.updateAccessToken();
      }
    } catch (e) {
      await fullLogoutAndRedirectToSignIn();
    }

    const contentType = data instanceof Blob ? APPLICATION_STREAM : APPLICATION_JSON;
    const body = data instanceof Blob ? data : JSON.stringify(data);
    const init = {
      method,
      headers: {
        "content-type": contentType,
        "graphql-server": import.meta.env.VITE_GRAPHQL_SERVER,
        "graphql-access-token": localStorage.getItem("access_token"),
        "user-email": localStorage.getItem("email"),
      },
    };
    if (method === POST || method === PUT) {
      init.body = body;
    }

    const response = await fetch(path, init);
    if (response.ok === false && response.status === 401) {
      // await fullLogoutAndRedirectToSignIn();
      await app.config.globalProperties.$auth0.updateAccessToken().catch(fullLogoutAndRedirectToSignIn);
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

  get(path) {
    return this.#fetchWrapper(app, GET, path);
  }

  post(path, body) {
    return this.#fetchWrapper(app, POST, path, body);
  }

  put(path, body) {
    return this.#fetchWrapper(app, PUT, path, body);
  }

  delete(path) {
    return this.#fetchWrapper(app, DELETE, path);
  }
}
