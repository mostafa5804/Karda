import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Document, Employee } from '../types';
import { fileSystemManager } from '../utils/db';
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

                const dirPath = `documents/${projectId}/${folderName}`;
                const filePath = `${dirPath}/${fileName}`;
                
                try {
                    const dirHandle = await fileSystemManager.getDirectoryHandle(dirPath, { create: true });
                    if (!dirHandle) throw new Error('Could not get/create directory handle.');

                    const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
                    const writable = await fileHandle.createWritable();
                    await writable.write(file);
                    await writable.close();
                    
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
                 try {
                    const fileHandle = await fileSystemManager.getFileHandle(doc.filePath);
                    if (fileHandle) {
                        return await fileHandle.getFile();
                    }
                    return null;
                } catch (error) {
                    console.error('Error getting downloadable file:', error);
                    return null;
                }
            },

            deleteDocument: async (docToDelete) => {
                try {
                    const pathParts = docToDelete.filePath.split('/');
                    const fileName = pathParts.pop();
                    const dirPath = pathParts.join('/');
                    if (!fileName) return;

                    const dirHandle = await fileSystemManager.getDirectoryHandle(dirPath);
                    if (dirHandle) {
                        await dirHandle.removeEntry(fileName);
                    }
                } catch (error) {
                     // If the file doesn't exist, we still want to remove the metadata.
                     if (error instanceof DOMException && error.name === 'NotFoundError') {
                        console.log('File not found on disk, removing metadata entry.');
                     } else {
                        console.error("Failed to delete document file, but removing metadata anyway:", error);
                     }
                }
                
                // This state update now happens regardless of the file deletion outcome,
                // ensuring the UI is always consistent with the user's action.
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
            },

            removeEmployeeDocuments: async (projectId, employeeId) => {
                const employee = useEmployeeStore.getState().getProjectData(projectId).employees.find(e => e.id === employeeId);
                const folderName = getEmployeeFolderName(employee);
                if (!folderName) return;

                const projectDirPath = `documents/${projectId}`;
                
                try {
                    const projectDirHandle = await fileSystemManager.getDirectoryHandle(projectDirPath);
                    if (projectDirHandle) {
                        await projectDirHandle.removeEntry(folderName, { recursive: true });
                    }
                } catch (error) {
                    // Ignore error if directory doesn't exist
                    if (!(error instanceof DOMException && error.name === 'NotFoundError')) {
                         console.warn(`Could not remove directory for employee ${employeeId}:`, error);
                    }
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
                 const projectDirPath = `documents/${projectId}`;
                try {
                    const documentsDirHandle = await fileSystemManager.getDirectoryHandle('documents');
                    if (documentsDirHandle) {
                        await documentsDirHandle.removeEntry(projectId, { recursive: true });
                    }
                } catch (error) {
                     if (!(error instanceof DOMException && error.name === 'NotFoundError')) {
                        console.warn(`Could not remove project directory ${projectId}:`, error);
                     }
                }

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
                // This only restores metadata. The user is responsible for restoring files.
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