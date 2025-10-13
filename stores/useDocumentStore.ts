import { create } from 'zustand';
import { Document } from '../types';
import * as db from '../utils/db';

interface DocumentState {
    addDocument: (doc: Omit<Document, 'id' | 'uploadedAt'>) => Promise<void>;
    getDocumentsForEmployee: (projectId: string, employeeId: string) => Promise<Document[]>;
    deleteDocument: (id: string) => Promise<void>;
    removeEmployeeDocuments: (projectId: string, employeeId: string) => Promise<void>;
    removeProjectDocuments: (projectId: string) => Promise<void>;
    getAllDocuments: () => Promise<Document[]>;
    clearAndRestoreDocuments: (documents: Document[]) => Promise<void>;
}

export const useDocumentStore = create<DocumentState>(() => ({
    addDocument: async (docData) => {
        const newDoc: Document = {
            ...docData,
            id: crypto.randomUUID(),
            uploadedAt: new Date().toISOString(),
        };
        await db.addDocument(newDoc);
    },
    getDocumentsForEmployee: async (projectId, employeeId) => {
        return await db.getDocumentsForEmployee(projectId, employeeId);
    },
    deleteDocument: async (id) => {
        await db.deleteDocument(id);
    },
    removeEmployeeDocuments: async (projectId, employeeId) => {
        await db.deleteDocumentsForEmployee(projectId, employeeId);
    },
    removeProjectDocuments: async (projectId) => {
        await db.deleteDocumentsForProject(projectId);
    },
    getAllDocuments: async () => {
        return await db.getAllDocuments();
    },
    clearAndRestoreDocuments: async (documents) => {
        await db.clearAndRestoreDocuments(documents);
    },
}));
