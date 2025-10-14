import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Document, Employee } from '../types';
import { storageManager } from '../utils/db';
import { useEmployeeStore } from './useEmployeeStore';

/**
 * Gets the folder name for an employee's documents.
 * Returns the human-readable name if it exists (for new employees),
 * otherwise falls back to the unique employee ID for backward compatibility.
 * @param employee The employee object.
 * @returns The folder name as a string, or null if employee not found.
 */
const getEmployeeFolderName = (employee: Employee | undefined): string | null => {
    if (!employee) return null;
    return employee.documentsFolderName || employee.id;
};


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
                
                const employee = useEmployeeStore.getState().getProjectData(projectId).employees.find(e => e.id === employeeId);
                const folderName = getEmployeeFolderName(employee);

                if (!folderName) {
                    console.error(`Cannot add document, employee ${employeeId} not found.`);
                    return false;
                }

                const filePath = `documents/${projectId}/${folderName}/${fileName}`;
                
                try {
                    await storageManager.saveFile(filePath, file);
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
                const blob = await storageManager.readFile(doc.filePath);
                if (blob) {
                    return new File([blob], doc.fileName, { type: doc.fileType });
                }
                return null;
            },

            deleteDocument: async (docToDelete) => {
                try {
                    await storageManager.deleteFile(docToDelete.filePath);
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
                const employee = useEmployeeStore.getState().getProjectData(projectId).employees.find(e => e.id === employeeId);
                const folderName = getEmployeeFolderName(employee);

                if (folderName) {
                    const employeeDirPath = `documents/${projectId}/${folderName}/`;
                    await storageManager.deleteDirectory(employeeDirPath);
                } else {
                    console.warn(`Could not determine folder name for employee ${employeeId}. Metadata will be removed, but the folder might remain if it exists under a different name.`);
                }

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
                const projectDirPath = `documents/${projectId}/`;
                await storageManager.deleteDirectory(projectDirPath);
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
                // This is a simplified restore. It assumes files are NOT in place and just restores metadata.
                // The user needs to restore the files manually if needed (e.g. from a separate backup).
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
