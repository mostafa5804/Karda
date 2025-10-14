import { openDB, IDBPDatabase } from 'idb';
import { Document } from '../types';

// --- File System Access API Wrapper ---

const DB_NAME = 'KardaHandleDB';
const DB_VERSION = 1;
const HANDLE_STORE = 'handles';

let dbPromise: Promise<IDBPDatabase> | null = null;

const getDb = () => {
    if (dbPromise) return dbPromise;
    dbPromise = openDB(DB_NAME, DB_VERSION, {
        upgrade(db) {
            if (!db.objectStoreNames.contains(HANDLE_STORE)) {
                db.createObjectStore(HANDLE_STORE);
            }
        },
    });
    return dbPromise;
};

const setHandle = async (key: string, handle: FileSystemDirectoryHandle) => {
    const db = await getDb();
    await db.put(HANDLE_STORE, handle, key);
};

const getHandle = async (key: string): Promise<FileSystemDirectoryHandle | undefined> => {
    const db = await getDb();
    return await db.get(HANDLE_STORE, key);
};

let rootDirHandle: FileSystemDirectoryHandle | null = null;

export const fileSystemManager = {
    isSupported: () => 'showDirectoryPicker' in window,

    async initialize(): Promise<{ success: boolean, message: string }> {
        if (!this.isSupported()) {
            return { success: false, message: 'مرورگر شما از File System Access API پشتیبانی نمی‌کند.' };
        }
        const handle = await getHandle('rootDir');
        if (handle) {
            // FIX: The 'queryPermission' method is not part of the standard FileSystemDirectoryHandle type. Cast to 'any' to access it.
            const permission = await (handle as any).queryPermission({ mode: 'readwrite' });
            if (permission === 'granted') {
                rootDirHandle = handle;
                return { success: true, message: 'دسترسی به پوشه تایید شد.' };
            }
        }
        return { success: false, message: 'پوشه انتخاب نشده یا دسترسی لازم وجود ندارد.' };
    },

    hasHandle: () => !!rootDirHandle,

    async requestDirectoryPermission(): Promise<boolean> {
        try {
            // FIX: The 'showDirectoryPicker' method is not part of the standard Window type. Cast to 'any' to access it.
            const handle = await (window as any).showDirectoryPicker();
            if (await this.verifyPermission(handle)) {
                await setHandle('rootDir', handle);
                rootDirHandle = handle;
                return true;
            }
            return false;
        } catch (error) {
            console.error("Error requesting directory permission:", error);
            return false;
        }
    },

    async verifyPermission(handle: FileSystemDirectoryHandle): Promise<boolean> {
        const options = { mode: 'readwrite' as const };
        // FIX: The 'queryPermission' method is not part of the standard FileSystemDirectoryHandle type. Cast to 'any' to access it.
        if (await (handle as any).queryPermission(options) === 'granted') {
            return true;
        }
        // FIX: The 'requestPermission' method is not part of the standard FileSystemDirectoryHandle type. Cast to 'any' to access it.
        if (await (handle as any).requestPermission(options) === 'granted') {
            return true;
        }
        return false;
    },

    async getDirectory(path: string[], create = false): Promise<FileSystemDirectoryHandle | null> {
        if (!rootDirHandle) return null;
        let currentDir = rootDirHandle;
        for (const part of path) {
            try {
                currentDir = await currentDir.getDirectoryHandle(part, { create });
            } catch (error) {
                console.error(`Error getting/creating directory ${part} in ${path.join('/')}`, error);
                return null;
            }
        }
        return currentDir;
    },

    async writeFile(path: string, content: Blob | string): Promise<void> {
        const parts = path.split('/').filter(p => p);
        const fileName = parts.pop();
        if (!fileName) throw new Error("Invalid file path for writing.");
        
        const dir = await this.getDirectory(parts, true);
        if (!dir) throw new Error("Could not access or create directory.");

        const fileHandle = await dir.getFileHandle(fileName, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(content);
        await writable.close();
    },

    async readFile(path: string): Promise<File | null> {
        const parts = path.split('/').filter(p => p);
        const fileName = parts.pop();
        if (!fileName) return null;

        const dir = await this.getDirectory(parts, false);
        if (!dir) return null;

        try {
            const fileHandle = await dir.getFileHandle(fileName);
            return await fileHandle.getFile();
        } catch (error) {
            console.error(`File not found: ${path}`, error);
            return null;
        }
    },

    async remove(path: string): Promise<void> {
        const parts = path.split('/').filter(p => p);
        const nameToRemove = parts.pop();
        if (!nameToRemove) return;
        
        const parentDir = await this.getDirectory(parts);
        if (!parentDir) return;
        
        await parentDir.removeEntry(nameToRemove, { recursive: true });
    },
};