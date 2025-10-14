import { openDB } from 'idb';
import { useAppStore } from '../stores/useAppStore';

const DB_NAME = 'FileSystemHandles';
const DB_VERSION = 1;
const STORE_NAME = 'handles';
const KEY = 'directoryHandle';

let directoryHandle: FileSystemDirectoryHandle | null = null;

const getDb = () => {
    return openDB(DB_NAME, DB_VERSION, {
        upgrade(db) {
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        },
    });
};

const saveHandleToDb = async (handle: FileSystemDirectoryHandle) => {
    const db = await getDb();
    await db.put(STORE_NAME, handle, KEY);
};

const getHandleFromDb = async (): Promise<FileSystemDirectoryHandle | null> => {
    const db = await getDb();
    return await db.get(STORE_NAME, KEY) || null;
};

const verifyPermission = async (handle: FileSystemDirectoryHandle, readWrite: boolean): Promise<boolean> => {
    // FIX: Use an inline type for options as FileSystemHandlePermissionDescriptor is not defined by default.
    const options: { mode?: 'read' | 'readwrite' } = {};
    if (readWrite) {
        options.mode = 'readwrite';
    }
    // FIX: Cast handle to `any` to access experimental File System Access API properties.
    if ((await (handle as any).queryPermission(options)) === 'granted') {
        return true;
    }
    // FIX: Cast handle to `any` to access experimental File System Access API properties.
    if ((await (handle as any).requestPermission(options)) === 'granted') {
        return true;
    }
    return false;
};

export const fileSystemManager = {
    isSupported: () => 'showDirectoryPicker' in window,

    async initialize(): Promise<{ success: boolean, message: string }> {
        if (!this.isSupported()) {
            return { success: false, message: 'مرورگر شما از دسترسی مستقیم به فایل سیستم پشتیبانی نمی‌کند.' };
        }
        
        const handleFromDb = await getHandleFromDb();
        if (handleFromDb) {
            if (await verifyPermission(handleFromDb, true)) {
                directoryHandle = handleFromDb;
                return { success: true, message: 'دسترسی به پوشه با موفقیت بازیابی شد.' };
            }
        }
        
        directoryHandle = null;
        return { success: false, message: 'لطفاً پوشه ذخیره‌سازی را انتخاب کنید.' };
    },

    async requestHandle(): Promise<{ success: boolean, message: string }> {
        try {
            // FIX: Cast window to `any` to access the File System Access API.
            const handle = await (window as any).showDirectoryPicker();
            directoryHandle = handle;
            await saveHandleToDb(handle);
            useAppStore.getState().setIsFileSystemReady(true);
            return { success: true, message: 'پوشه با موفقیت انتخاب شد.' };
        } catch (error) {
            if (error instanceof DOMException && error.name === 'AbortError') {
                return { success: false, message: 'انتخاب پوشه لغو شد.' };
            }
            console.error('Error requesting handle:', error);
            return { success: false, message: 'خطا در انتخاب پوشه.' };
        }
    },

    getHandle: () => directoryHandle,
    hasHandle: () => !!directoryHandle,

    async getFileHandle(path: string, options: { create?: boolean } = {}): Promise<FileSystemFileHandle | null> {
        if (!directoryHandle) return null;

        const pathParts = path.split('/').filter(p => p);
        let currentHandle: FileSystemDirectoryHandle | FileSystemFileHandle = directoryHandle;

        for (let i = 0; i < pathParts.length; i++) {
            const part = pathParts[i];
            const isLastPart = i === pathParts.length - 1;

            if (currentHandle.kind !== 'directory') return null;

            if (isLastPart) {
                currentHandle = await currentHandle.getFileHandle(part, options);
            } else {
                currentHandle = await currentHandle.getDirectoryHandle(part, options);
            }
        }
        return currentHandle.kind === 'file' ? currentHandle : null;
    },
    
    async getDirectoryHandle(path: string, options: { create?: boolean } = {}): Promise<FileSystemDirectoryHandle | null> {
        if (!directoryHandle) return null;
        
        const pathParts = path.split('/').filter(p => p);
        let currentHandle: FileSystemDirectoryHandle = directoryHandle;

        for (const part of pathParts) {
            currentHandle = await currentHandle.getDirectoryHandle(part, options);
        }
        return currentHandle;
    },
};