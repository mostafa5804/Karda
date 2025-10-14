import { useCompanyStore } from '../stores/useCompanyStore';
import { useEmployeeStore } from '../stores/useEmployeeStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { useFinancialStore } from '../stores/useFinancialStore';
import { useNotesStore } from '../stores/useNotesStore';
import { useDocumentStore } from '../stores/useDocumentStore';
import { fileSystemManager } from './db';

// A helper function to get state from non-hook stores
const getBackupState = () => {
    const companyState = useCompanyStore.getState().getStateForBackup();
    const employeeState = useEmployeeStore.getState().getStateForBackup();
    const settingsState = useSettingsStore.getState().getStateForBackup();
    const financialState = useFinancialStore.getState().getStateForBackup();
    const notesState = useNotesStore.getState().getStateForBackup();
    const documents = useDocumentStore.getState().getAllDocuments();

    return {
        projects: companyState.projects,
        employees: employeeState,
        settings: settingsState,
        financials: financialState,
        notes: notesState,
        documents: documents,
        backupVersion: '3.1.0', // Updated version
        backupDate: new Date().toISOString(),
    };
};

export const runBackup = async ({ isAuto }: { isAuto: boolean }): Promise<{ success: boolean; fileName: string }> => {
    try {
        const backupData = getBackupState();
        const dateStr = new Date().toLocaleDateString('fa-IR-u-nu-latn', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-');
        const timeStr = new Date().toLocaleTimeString('en-GB').replace(/:/g, '-');
        
        const fileName = `karda-backup-${dateStr}-${timeStr}.json`;
        const filePath = isAuto ? `backups/auto/${fileName}` : `backups/${fileName}`;
        
        await fileSystemManager.writeFile(filePath, JSON.stringify(backupData, null, 2));
        
        return { success: true, fileName };

    } catch (error) {
        console.error("Backup failed:", error);
        return { success: false, fileName: '' };
    }
};
