import localforage from "localforage";

const db_version = 1;

function IndexedDB_Table(dbName, tableName) {
  const table = localforage.createInstance({
    name: `${dbName}`,
    version: db_version,
    storeName: `${tableName}`,
  });
  return {
    async drop() {
      if (!table) return;
      await table.dropInstance();
    },
    async clear() {
      if (!table) return;
      await table.clear();
    },
    async getKeys() {
      if (!table) return [];
      return await table.keys();
    },
    async hasKey(key) {
      if (!table) return false;
      const keys = await table.keys();
      return keys.includes(`${key}`);
    },
    async getKey(value) {
      if (!table) return;
      const keys = await table.keys();
      for (const itemKey of keys) {
        // if (!table) continue
        const val = await table.getItem(itemKey);
        if (val.toString() === value.toString()) return itemKey;
      }
    },
    async getData() {
      const result = {};
      if (!table) return result;
      const keys = await table.keys();
      for (const itemKey of keys) {
        // if (!table) continue
        result[itemKey] = await table.getItem(itemKey);
      }
      return result;
    },
    async getItems() {
      const result = {};
      if (!table) return result;
      const keys = await table.keys();
      for (const key of keys) {
        // if (!table) continue
        result[key] = await table.getItem(key);
      }
      return result;
    },
    async setItems(data) {
      if (!table) return;
      for (const key of Object.keys(data)) {
        // if (!table) continue
        await table.setItem(key, data[key]);
      }
    },
    async getItem(key) {
      if (!table) return;
      return await table.getItem(`${key}`);
    },
    async setItem(key, data) {
      if (!table) return;
      await table.setItem(`${key}`, data);
      return data;
    },
    async updateItem(key, newData) {
      const data = await table.getItem(`${key}`);
      if (!table) return;
      await table.setItem(`${key}`, {
        ...data,
        ...newData,
      });
    },
    async removeItem(key) {
      if (!table) return;
      const data = await table.getItem(`${key}`);
      await table.removeItem(`${key}`);
      return data;
    },
  };
}

class FoliaDB {
  #tables = {};
  #fillableTables = ["workspaces", "people", "search", "preferences", "avatars", "opened_cards"];
  #nonFillableTables = ["documents", "card_previews", "ref_previews", "media_annotations", "stamp_previews"];
  userEmail;
  constructor() {
    this.userEmail = "";
  }

  openUsersDatabase = async (userEmail) => {
    if (this.userEmail === userEmail) return;
    await this.closeUserDatabase();

    for (const tableName of [...this.#fillableTables, ...this.#nonFillableTables]) {
      this.#tables[tableName] = new IndexedDB_Table(userEmail, tableName);
      await this.#tables[tableName].getKeys();
    }
    this.userEmail = userEmail;
    console.log("DB MANAGER: OPEN FOR " + this.userEmail);
  };
  prePopulateTablesData = async (everyTableCallback) => {
    for (const tableName of this.#fillableTables) {
      if (this.#tables[tableName]) {
        const data = await this.#tables[tableName].getData();
        // console.log('DB MANAGER: PRE POPULATE TABLE DATA', {tableName, data})
        await everyTableCallback(tableName, data);
      }
    }
  };
  closeUserDatabase = async () => {
    for (const tableName of [...this.#fillableTables, ...this.#nonFillableTables]) {
      if (this.#tables[tableName]) {
        await this.#tables[tableName].clear();
        this.#tables[tableName] = null;
        // console.log(`DB MANAGER: TABLE ${tableName} HAS BEEN ERASED`)
      }
    }
    const logStr = "DB MANAGER: CLOSED FOR " + this.userEmail;
    this.userEmail = null;
    console.log(logStr);
  };

  clear = async (tableName) => {
    if (!this.#tables[tableName]) return;
    return await this.#tables[tableName].clear();
  };
  getKeys = async (tableName) => {
    if (!this.#tables[tableName]) return;
    return await this.#tables[tableName].getKeys();
  };
  hasKey = async (tableName, key) => {
    throw new Error("hasKey is deprecated method");
  };
  getKey = async (tableName, value) => {
    throw new Error("getKey is deprecated method");
  };
  getData = async (tableName) => {
    if (!this.#tables[tableName]) return;
    return await this.#tables[tableName].getData();
  };
  getItems = async (tableName) => {
    if (!this.#tables[tableName]) return;
    return await this.#tables[tableName].getData();
  };
  setItems = async (tableName, data) => {
    if (!this.#tables[tableName]) return;
    return await this.#tables[tableName].setItems(data);
  };
  getItem = async (tableName, key) => {
    if (!this.#tables[tableName]) return;
    return await this.#tables[tableName].getItem(key);
  };
  setItem = async (tableName, key, data) => {
    if (!this.#tables[tableName]) return;
    return await this.#tables[tableName].setItem(key, data);
  };
  updateItem = async (tableName, key, newData) => {
    if (!this.#tables[tableName]) return;
    return await this.#tables[tableName].updateItem(key, newData);
  };
  removeItem = async (tableName, key) => {
    if (!this.#tables[tableName]) return;
    return await this.#tables[tableName].removeItem(key);
  };

  // dropUserDatabase = async () => {
  //   // TODO: localForage can't close the DB and can't remove one, we need discover this issue and fix it
  //   if (!this.userEmail) return
  //   for (const tableName of [...this.fillableTables, ...nonFillableTables]) {
  //     if (this.tables[tableName]) {
  //       // this.tables[tableName] = null
  //     }
  //   }
  //   showLogs && console.log('DB MANAGER: CLOSED FOR ', this.userEmail)
  //   this.userEmail = null
  // }
}

export default FoliaDB;
