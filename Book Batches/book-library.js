/*
 * Book Batches – Library storage.
 *
 * Books live in this browser's IndexedDB. A backup file lets players carry
 * their shelf to another browser or bring it back after storage is cleared.
 */

window.BookLibrary = (() => {
  const DB_NAME = "book-batches";
  const STORE = "books";
  const BACKUP_KIND = "book-batches-library";
  const BACKUP_VERSION = 1;

  let dbPromise = null;

  function openDb() {
    if (!dbPromise) {
      dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);
        request.onupgradeneeded = () => {
          request.result.createObjectStore(STORE, { keyPath: "id" });
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      dbPromise.catch(() => { dbPromise = null; });
    }
    return dbPromise;
  }

  async function readAll() {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const request = db.transaction(STORE).objectStore(STORE).getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async function storeMany(records) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE, "readwrite");
      const store = transaction.objectStore(STORE);
      records.forEach((record) => store.put(record));
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  }

  function store(record) {
    return storeMany([record]);
  }

  async function remove(id) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE, "readwrite");
      transaction.objectStore(STORE).delete(id);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  }

  async function keepStorage() {
    try {
      if (navigator.storage && navigator.storage.persist) {
        return await navigator.storage.persist();
      }
    } catch (error) {}
    return false;
  }

  function backupFileName() {
    const day = new Date().toISOString().slice(0, 10);
    return "Book Batches library " + day + ".json";
  }

  function downloadBackup(books) {
    const backup = {
      kind: BACKUP_KIND,
      version: BACKUP_VERSION,
      savedAt: Date.now(),
      books
    };
    const blob = new Blob([JSON.stringify(backup)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = backupFileName();
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  function isBook(item) {
    return Boolean(item)
      && typeof item === "object"
      && typeof item.id === "string"
      && item.id.length > 0
      && Array.isArray(item.pages || []);
  }

  async function readBackup(file) {
    let backup;
    try {
      backup = JSON.parse(await file.text());
    } catch (error) {
      throw new Error("not-backup");
    }
    if (!backup || backup.kind !== BACKUP_KIND || !Array.isArray(backup.books)) {
      throw new Error("not-backup");
    }
    if (backup.version > BACKUP_VERSION) throw new Error("too-new");
    return backup.books.filter(isBook);
  }

  /** Books from the backup that are new, or newer than the copy already on the shelf. */
  function booksToRestore(backupBooks, shelfBooks) {
    return backupBooks.filter((book) => {
      const current = shelfBooks.find((item) => item.id === book.id);
      return !current || (book.savedAt || 0) > (current.savedAt || 0);
    });
  }

  return { readAll, store, storeMany, remove, keepStorage, downloadBackup, readBackup, booksToRestore };
})();
