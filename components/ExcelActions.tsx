import React, { useRef, useState } from 'react';
import { useEmployeeStore } from '../stores/useEmployeeStore';
import { useCompanyStore } from '../stores/useCompanyStore';
import { importUnifiedDataFromExcel, exportUnifiedDataToExcel, downloadUnifiedTemplate } from '../utils/excel';
import { Employee, EmployeeAttendance, ParsedExcelRow } from '../types';
import { useToastStore } from '../stores/useToastStore';
import ConfirmationModal from './ConfirmationModal';

interface ExcelActionsProps {
    employees: Employee[];
    attendance: EmployeeAttendance;
    projectId: string;
    year: number;
    month: number;
}

const ExcelActions: React.FC<ExcelActionsProps> = ({ employees, attendance, projectId, year, month }) => {
    const { importAndUpsertData } = useEmployeeStore();
    const { projects } = useCompanyStore();
    const addToast = useToastStore(state => state.addToast);
    const fileImportInputRef = useRef<HTMLInputElement>(null);

    const [importedData, setImportedData] = useState<ParsedExcelRow[] | null>(null);

    const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            const data = await importUnifiedDataFromExcel(file, year, month);
            if (data.length > 0) {
                setImportedData(data);
            } else {
                 addToast('هیچ اطلاعات معتبری در فایل اکسل یافت نشد.', 'info');
            }
        } catch (error) {
            console.error(error);
            addToast(`خطا در ورود اطلاعات: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
        } finally {
            if(fileImportInputRef.current) fileImportInputRef.current.value = '';
        }
    };
    
    const handleConfirmImport = () => {
        if (!importedData) return;
        importAndUpsertData(projectId, importedData);
        addToast(`اطلاعات با موفقیت وارد و به‌روزرسانی شد.`, 'success');
        setImportedData(null);
    };

    const handleExport = () => {
        const currentProject = projects.find(p => p.id === projectId);
        exportUnifiedDataToExcel(employees, attendance, year, month, currentProject?.name || 'پروژه');
    }

    return (
        <>
            <div className="flex items-center gap-2 flex-wrap">
                <div className="dropdown">
                    <label tabIndex={0} className="btn btn-primary m-1">عملیات اکسل</label>
                    <ul tabIndex={0} className="dropdown-content z-50 menu p-2 shadow bg-base-100 rounded-box w-52">
                        <li><a onClick={() => fileImportInputRef.current?.click()}>ورود اطلاعات از فایل</a></li>
                        <li><a onClick={handleExport}>خروجی کامل</a></li>
                        <div className="divider my-1"></div>
                        <li><a onClick={() => downloadUnifiedTemplate(year, month)}>دانلود فایل نمونه</a></li>
                    </ul>
                </div>
                <input type="file" accept=".xlsx, .xls" className="hidden" ref={fileImportInputRef} onChange={handleImport}/>
            </div>

            {importedData && (
                <ConfirmationModal
                    isOpen={!!importedData}
                    onClose={() => setImportedData(null)}
                    onConfirm={handleConfirmImport}
                    title="تایید ورود اطلاعات"
                    confirmText="تایید و ورود"
                    confirmClassName="btn-success"
                >
                    <p>{importedData.length} ردیف اطلاعاتی از فایل اکسل خوانده شد. آیا مایل به افزودن/به‌روزرسانی اطلاعات هستید؟</p>
                </ConfirmationModal>
            )}
        </>
    );
};

export default ExcelActions;