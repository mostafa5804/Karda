import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Document } from '../types';
import { fileSystemManager } from '../utils/db';

interface DocumentState {
    projectDocuments: { [projectId: string]: Document[] };
    addDocument: (docData: Omit<Document, 'id' | 'uploadedAt' | 'filePath'>, file: File) => Promise<boolean>;
    getDocumentsForEmployee: (projectId: string, employeeId: string) => Document[];
    getDownloadableFile: (doc: Document) => Promise<File | null>;
    deleteDocument: (docToDelete: Document) => Promise<void>;
    removeEmployeeDocuments: (projectId: string, employeeId: string) => Promise<void>;
    removeProjectDocuments: (projectId: string) => Promise<void>;
    getAllDocuments: () => Document[];
    clearAndRestoreDocuments: (documents: Document[]) => Promise<void>; // Used for backup/restore
}

export const useDocumentStore = create(
    persist<DocumentState>(
        (set, get) => ({
            projectDocuments: {},
            
            addDocument: async (docData, file) => {
                const { projectId, employeeId, fileName } = docData;
                const filePath = `documents/${projectId}/${employeeId}/${fileName}`;
                
                try {
                    await fileSystemManager.writeFile(filePath, file);
                    const newDoc: Document = {
                        ...docData,
                        id: crypto.randomUUID(),
                        filePath: filePath,
                        uploadedAt: new Date().toISOString(),
                    };

                    set(state => {
                        const projectDocs = state.projectDocuments[projectId] || [];
                        return {
                            projectDocuments: {
                                ...state.projectDocuments,
                                [projectId]: [...projectDocs, newDoc]
                            }
                        };
                    });
                    return true;
                } catch (error) {
                    console.error("Failed to add document:", error);
                    return false;
                }
            },

            getDocumentsForEmployee: (projectId, employeeId) => {
                const projectDocs = get().projectDocuments[projectId] || [];
                return projectDocs.filter(doc => doc.employeeId === employeeId);
            },

            getDownloadableFile: async (doc) => {
                return fileSystemManager.readFile(doc.filePath);
            },

            deleteDocument: async (docToDelete) => {
                try {
                    await fileSystemManager.remove(docToDelete.filePath);
                    set(state => {
                        const projectDocs = state.projectDocuments[docToDelete.projectId] || [];
                        const updatedDocs = projectDocs.filter(d => d.id !== docToDelete.id);
                        return {
                            projectDocuments: {
                                ...state.projectDocuments,
                                [docToDelete.projectId]: updatedDocs
                            }
                        };
                    });
                } catch (error) {
                     console.error("Failed to delete document:", error);
                }
            },

            removeEmployeeDocuments: async (projectId, employeeId) => {
                const employeeDirPath = `documents/${projectId}/${employeeId}`;
                await fileSystemManager.remove(employeeDirPath);
                set(state => {
                    const projectDocs = state.projectDocuments[projectId] || [];
                    const remainingDocs = projectDocs.filter(d => d.employeeId !== employeeId);
                    return {
                        projectDocuments: {
                            ...state.projectDocuments,
                            [projectId]: remainingDocs,
                        }
                    };
                });
            },

            removeProjectDocuments: async (projectId) => {
                const projectDirPath = `documents/${projectId}`;
                await fileSystemManager.remove(projectDirPath);
                set(state => {
                    const newProjectDocuments = { ...state.projectDocuments };
                    delete newProjectDocuments[projectId];
                    return { projectDocuments: newProjectDocuments };
                });
            },
            
            getAllDocuments: () => {
                return Object.values(get().projectDocuments).flat();
            },

            clearAndRestoreDocuments: async (documents) => {
                // This is a simplified restore. It assumes files are already in place.
                // It just restores the metadata.
                const docsByProject: { [projectId: string]: Document[] } = {};
                documents.forEach(doc => {
                    if (!docsByProject[doc.projectId]) {
                        docsByProject[doc.projectId] = [];
                    }
                    docsByProject[doc.projectId].push(doc);
                });
                set({ projectDocuments: docsByProject });
            },

        }),
        {
            name: 'document-metadata-storage',
            storage: createJSONStorage(() => localStorage),
        }
    )
);
