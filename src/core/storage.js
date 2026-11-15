const DB_NAME = 'retard-editor-workspace';
let connection;
export function openDatabase() {
  if (connection) return connection;
  connection = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => { request.result.createObjectStore('documents', { keyPath: 'id' }); request.result.createObjectStore('revisions', { keyPath: 'id' }); };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => { connection = null; reject(request.error); };
  });
  return connection;
}
async function run(store, mode, operation) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, mode);
    const request = operation(tx.objectStore(store));
    tx.oncomplete = () => resolve(request.result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('Storage transaction was aborted.'));
  });
}
export const listDocuments = () => run('documents', 'readonly', store => store.getAll());
export const saveDocument = doc => run('documents', 'readwrite', store => store.put(structuredClone(doc)));
export const removeDocument = id => run('documents', 'readwrite', store => store.delete(id));
export const saveRevision = revision => run('revisions', 'readwrite', store => store.put(structuredClone(revision)));
export const allRevisions = () => run('revisions', 'readonly', store => store.getAll());
export const removeRevision = id => run('revisions', 'readwrite', store => store.delete(id));
