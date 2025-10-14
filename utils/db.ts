import { openDB, IDBPDatabase } from 'idb';

const DB_NAME = 'KarkardFileStorage';
const DB_VERSION = 1;
const DOC_STORE_NAME = 'documents';

let dbPromise: Promise<IDBPDatabase> | null = null;

const getDb = () => {    
    if (dbPromise) return dbPromise;
    dbPromise = openDB(DB_NAME, DB_VERSION, {
        upgrade(db) {
            if (!db.objectStoreNames.contains(DOC_STORE_NAME)) {
                db.createObjectStore(DOC_STORE_NAME);
            }
        },
    });
    return dbPromise;
};

export const storageManager = {
    // This is always supported as it uses IndexedDB
    isSupported: () => true,

    async initialize(): Promise<{ success: boolean, message: string }> {
        try {
            await getDb();
            return { success: true, message: 'ذخیره‌سازی داخلی آماده است.' };
        } catch (error) {
            console.error("Failed to initialize IndexedDB:", error);
            return { success: false, message: 'خطا در راه‌اندازی ذخیره‌سازی داخلی.' };
        }
    },
    
    // This function is kept for structural compatibility but is no longer tied to a real handle.
    hasHandle: () => true,

    async saveFile(path: string, content: Blob): Promise<void> {
        const db = await getDb();
        await db.put(DOC_STORE_NAME, content, path);
    },

    async readFile(path: string): Promise<Blob | null> {
        const db = await getDb();
        const blob = await db.get(DOC_STORE_NAME, path);
        return blob || null;
    },
    
    async deleteFile(path: string): Promise<void> {
        const db = await getDb();
        await db.delete(DOC_STORE_NAME, path);
    },
    
    async deleteDirectory(pathPrefix: string): Promise<void> {
        const db = await getDb();
        const tx = db.transaction(DOC_STORE_NAME, 'readwrite');
        let cursor = await tx.store.openCursor();
        const keysToDelete: string[] = [];

        while (cursor) {
            if (String(cursor.key).startsWith(pathPrefix)) {
                keysToDelete.push(cursor.key as string);
            }
            cursor = await cursor.continue();
        }

        for (const key of keysToDelete) {
            await tx.store.delete(key);
        }
        
        await tx.done;
    }
};
