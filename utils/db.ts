import { openDB, IDBPDatabase } from 'idb';
import { Document } from '../types';

const DB_NAME = 'KardaDB';
const DB_VERSION = 1;
const DOCUMENT_STORE = 'documents';

let dbPromise: Promise<IDBPDatabase> | null = null;

const initDB = () => {
  if (dbPromise) {
    return dbPromise;
  }
  dbPromise = openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(DOCUMENT_STORE)) {
        const store = db.createObjectStore(DOCUMENT_STORE, { keyPath: 'id' });
        store.createIndex('employeeId', 'employeeId', { unique: false });
        store.createIndex('projectId', 'projectId', { unique: false });
      }
    },
  });
  return dbPromise;
};

export const addDocument = async (doc: Document): Promise<void> => {
  const db = await initDB();
  await db.put(DOCUMENT_STORE, doc);
};

export const getDocumentsForEmployee = async (projectId: string, employeeId: string): Promise<Document[]> => {
  const db = await initDB();
  const tx = db.transaction(DOCUMENT_STORE, 'readonly');
  const index = tx.store.index('employeeId');
  let cursor = await index.openCursor(employeeId);
  const docs: Document[] = [];
  while (cursor) {
    if (cursor.value.projectId === projectId) {
      docs.push(cursor.value);
    }
    cursor = await cursor.continue();
  }
  return docs;
};

export const deleteDocument = async (id: string): Promise<void> => {
  const db = await initDB();
  await db.delete(DOCUMENT_STORE, id);
};

export const deleteDocumentsForEmployee = async (projectId: string, employeeId: string): Promise<void> => {
    const db = await initDB();
    const docs = await getDocumentsForEmployee(projectId, employeeId);
    const tx = db.transaction(DOCUMENT_STORE, 'readwrite');
    await Promise.all(docs.map(doc => tx.store.delete(doc.id)));
    await tx.done;
};

export const deleteDocumentsForProject = async (projectId: string): Promise<void> => {
    const db = await initDB();
    const tx = db.transaction(DOCUMENT_STORE, 'readwrite');
    const index = tx.store.index('projectId');
    let cursor = await index.openCursor(projectId);
    while (cursor) {
        await cursor.delete();
        cursor = await cursor.continue();
    }
    await tx.done;
};

export const getAllDocuments = async (): Promise<Document[]> => {
    const db = await initDB();
    return db.getAll(DOCUMENT_STORE);
};

export const clearAndRestoreDocuments = async (documents: Document[]): Promise<void> => {
    const db = await initDB();
    const tx = db.transaction(DOCUMENT_STORE, 'readwrite');
    await tx.store.clear();
    await Promise.all(documents.map(doc => tx.store.put(doc)));
    await tx.done;
};
