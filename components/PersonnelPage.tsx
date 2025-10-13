import React, { useState, useMemo, useRef } from 'react';
import { useEmployeeStore } from '../stores/useEmployeeStore';
import { useAppStore } from '../stores/useAppStore';
import { useFinancialStore } from '../stores/useFinancialStore';
import { useNotesStore } from '../stores/useNotesStore';
import { useToastStore } from '../stores/useToastStore';
import { useCompanyStore } from '../stores/useCompanyStore';
import { Employee } from '../types';
import EmployeeDetailsModal from './EmployeeDetailsModal';
import ConfirmationModal from './ConfirmationModal';
import { formatCurrency } from '../utils/currency';
import { useSettingsStore } from '../stores/useSettingsStore';
import { useSortableTable } from '../hooks/useSortableTable';
import SortableTableHeader from './SortableTableHeader';
import { ICONS } from '../constants';
import { exportPersonnelToExcel, downloadPersonnelTemplate, importPersonnelFromExcel } from '../utils/excel';
import BulkEditModal from './BulkEditModal';

const PersonnelPage: React.FC = () => {
    const { currentProjectId } = useAppStore();
    const { projects } = useCompanyStore();
    const { getProjectData, addEmployee, updateEmployee, toggleEmployeeArchiveStatus, removeEmployee, upsertPersonnel, bulkUpdateEmployees } = useEmployeeStore();
    const { removeEmployeeFinancials } = useFinancialStore();
    const { removeEmployeeNotes } = useNotesStore();
    const { getSettings } = useSettingsStore();
    const addToast = useToastStore(state => state.addToast);

    const projectId = currentProjectId || 'default';
    const { employees } = getProjectData(projectId);
    const settings = getSettings(projectId);

    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [isBulkEditModalOpen, setIsBulkEditModalOpen] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | undefined>(undefined);
    const [employeeToRemove, setEmployeeToRemove] = useState<Employee | null>(null);
    const [showArchived, setShowArchived] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [importedData, setImportedData] = useState<Partial<Employee>[] | null>(null);
    const fileImportInputRef = useRef<HTMLInputElement>(null);

    const filteredEmployees = useMemo(() => {
        const lowerCaseQuery = searchQuery.toLowerCase();
        return employees.filter(e =>
            (showArchived ? e.isArchived : !e.isArchived) &&
            (`${e.lastName} ${e.firstName}`.toLowerCase().includes(lowerCaseQuery) ||
             e.position?.toLowerCase().includes(lowerCaseQuery) ||
             e.nationalId?.includes(lowerCaseQuery)
            )
        );
    }, [employees, showArchived, searchQuery]);

    const { items: sortedEmployees, requestSort, sortConfig } = useSortableTable(filteredEmployees, { key: 'lastName', direction: 'asc' });

    const handleOpenDetailsModal = (employee?: Employee) => {
        setSelectedEmployee(employee);
        setIsDetailsModalOpen(true);
    };

    const handleSaveEmployee = (employeeData: Omit<Employee, 'id' | 'isArchived'>, employeeId?: string) => {
        if (employeeId) {
            updateEmployee(projectId, employeeId, employeeData);
            addToast('اطلاعات کارمند با موفقیت به‌روزرسانی شد.', 'success');
        } else {
            addEmployee(projectId, employeeData);
            addToast('کارمند جدید با موفقیت افزوده شد.', 'success');
        }
        setIsDetailsModalOpen(false);
    };
    
    const handleSaveBulkEdit = (updates: Partial<Omit<Employee, 'id'>>) => {
        if (Object.keys(updates).length === 0) {
            addToast('هیچ فیلدی برای ویرایش انتخاب نشده است.', 'info');
            return;
        }
        bulkUpdateEmployees(projectId, Array.from(selectedIds), updates);
        addToast(`${selectedIds.size} کارمند با موفقیت ویرایش شدند.`, 'success');
        setIsBulkEditModalOpen(false);
        setSelectedIds(new Set());
    };

    const handleConfirmRemove = () => {
        if (!employeeToRemove) return;
        removeEmployee(projectId, employeeToRemove.id);
        removeEmployeeFinancials(projectId, employeeToRemove.id);
        removeEmployeeNotes(projectId, employeeToRemove.id);
        addToast(`کارمند "${employeeToRemove.lastName} ${employeeToRemove.firstName}" برای همیشه حذف شد.`, 'success');
        setEmployeeToRemove(null);
    };
    
    const handleSelect = (id: string, isSelected: boolean) => {
        const newSelectedIds = new Set(selectedIds);
        if (isSelected) {
            newSelectedIds.add(id);
        } else {
            newSelectedIds.delete(id);
        }
        setSelectedIds(newSelectedIds);
    };

    const handleSelectAll = (isSelected: boolean) => {
        if (isSelected) {
            setSelectedIds(new Set(sortedEmployees.map(e => e.id)));
        } else {
            setSelectedIds(new Set());
        }
    };
    
    const handlePrint = () => {
        window.print();
    };
    
    const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        try {
            const data = await importPersonnelFromExcel(file);
            if (data.length > 0) setImportedData(data);
            else addToast('هیچ اطلاعات معتبری در فایل اکسل یافت نشد.', 'info');
        } catch (error) {
            addToast(`خطا در ورود اطلاعات: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
        } finally {
            if(fileImportInputRef.current) fileImportInputRef.current.value = '';
        }
    };

    const handleConfirmImport = () => {
        if (!importedData) return;
        upsertPersonnel(projectId, importedData);
        addToast(`اطلاعات با موفقیت وارد و به‌روزرسانی شد.`, 'success');
        setImportedData(null);
    };
    
    if (!currentProjectId) {
        return <div className="text-center p-8 bg-white rounded-lg shadow">لطفاً ابتدا یک پروژه را انتخاب کنید.</div>
    }

    const currentProjectName = projects.find(p => p.id === projectId)?.name || '';

    return (
        <div className="space-y-6">
            <div className="bg-white p-4 rounded-lg shadow flex justify-between items-center flex-wrap gap-4 no-print">
                <h1 className="text-2xl font-bold text-gray-800">مدیریت پرسنل</h1>
                 <input
                    type="text"
                    placeholder="جستجو (نام، سمت، کد ملی)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="input input-bordered w-full max-w-xs"
                />
                <div className="flex items-center gap-2 flex-wrap">
                    <button onClick={handlePrint} className="btn btn-outline">{ICONS.print} <span className="mr-1">چاپ</span></button>
                    <div className="dropdown">
                        <label tabIndex={0} className="btn btn-outline">عملیات اکسل</label>
                        <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52">
                            <li><a onClick={() => fileImportInputRef.current?.click()}>{ICONS.upload}<span className="mr-2">ورود از اکسل</span></a></li>
                            <li><a onClick={() => exportPersonnelToExcel(employees, currentProjectName)}>{ICONS.download}<span className="mr-2">خروجی اکسل</span></a></li>
                            <div className="divider my-1"></div>
                            <li><a onClick={downloadPersonnelTemplate}>دانلود فایل نمونه</a></li>
                        </ul>
                    </div>
                     <input type="file" accept=".xlsx, .xls" className="hidden" ref={fileImportInputRef} onChange={handleImport}/>
                    <div className="form-control">
                        <label className="label cursor-pointer gap-2">
                            <span className="label-text">بایگانی</span>
                            <input type="checkbox" checked={showArchived} onChange={() => setShowArchived(s => !s)} className="toggle toggle-sm" />
                        </label>
                    </div>
                    <button onClick={() => handleOpenDetailsModal()} className="btn btn-primary">افزودن کارمند</button>
                </div>
            </div>
            
            {selectedIds.size > 0 && (
                <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4 rounded-lg flex justify-between items-center no-print">
                    <span>{selectedIds.size} کارمند انتخاب شده است.</span>
                    <button onClick={() => setIsBulkEditModalOpen(true)} className="btn btn-sm btn-info">{ICONS.editGroup}<span className="mr-2">ویرایش گروهی</span></button>
                </div>
            )}

            <div className="bg-white rounded-lg shadow overflow-x-auto print-area personnel-print-area">
                 <h1 className="text-xl font-bold text-center p-4 hidden print:block">لیست پرسنل پروژه: {currentProjectName}</h1>
                <table className="w-full text-sm text-right">
                    <thead className="bg-gray-100 text-gray-600">
                        <tr>
                            <th className="p-3 no-print"><input type="checkbox" className="checkbox checkbox-sm" onChange={e => handleSelectAll(e.target.checked)} checked={sortedEmployees.length > 0 && selectedIds.size === sortedEmployees.length}/></th>
                            {/* FIX: Added children to SortableTableHeader components to provide header text. */}
                            <SortableTableHeader sortKey="lastName" sortConfig={sortConfig} requestSort={requestSort} className="p-3">نام خانوادگی</SortableTableHeader>
                            <SortableTableHeader sortKey="firstName" sortConfig={sortConfig} requestSort={requestSort} className="p-3">نام</SortableTableHeader>
                            <SortableTableHeader sortKey="nationalId" sortConfig={sortConfig} requestSort={requestSort} className="p-3">کد ملی</SortableTableHeader>
                            <SortableTableHeader sortKey="position" sortConfig={sortConfig} requestSort={requestSort} className="p-3">سمت</SortableTableHeader>
                            <SortableTableHeader sortKey="monthlySalary" sortConfig={sortConfig} requestSort={requestSort} className="p-3">حقوق ماهانه</SortableTableHeader>
                            <SortableTableHeader sortKey="contractEndDate" sortConfig={sortConfig} requestSort={requestSort} className="p-3">پایان قرارداد</SortableTableHeader>
                            <th className="p-3 text-center no-print">عملیات</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedEmployees.map(emp => {
                            const isExpired = emp.contractEndDate && new Date(emp.contractEndDate.replace(/-/g, '/')) < new Date();
                            const rowClass = emp.isArchived ? 'bg-gray-100 text-gray-400' : (isExpired ? 'bg-red-50' : '');
                            return (
                                <tr key={emp.id} className={`border-t border-gray-200 hover:bg-gray-50 ${rowClass}`}>
                                    <td className="p-3 no-print"><input type="checkbox" className="checkbox checkbox-sm" checked={selectedIds.has(emp.id)} onChange={e => handleSelect(emp.id, e.target.checked)}/></td>
                                    <td className="p-3">{emp.lastName}</td>
                                    <td className="p-3">{emp.firstName}</td>
                                    <td className="p-3 font-mono">{emp.nationalId}</td>
                                    <td className="p-3">{emp.position}</td>
                                    <td className="p-3">{formatCurrency(emp.monthlySalary, settings.currency)}</td>
                                    <td className={`p-3 ${isExpired ? 'font-bold text-red-600' : ''}`}>{emp.contractEndDate}</td>
                                    <td className="p-3 text-center whitespace-nowrap no-print">
                                        <button onClick={() => handleOpenDetailsModal(emp)} className="btn btn-xs btn-ghost text-blue-600">ویرایش</button>
                                        <button onClick={() => toggleEmployeeArchiveStatus(projectId, emp.id)} className="btn btn-xs btn-ghost text-yellow-600">
                                            {emp.isArchived ? 'فعال‌سازی' : 'بایگانی'}
                                        </button>
                                        {emp.isArchived && (
                                            <button onClick={() => setEmployeeToRemove(emp)} className="btn btn-xs btn-ghost text-red-600">حذف</button>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                {sortedEmployees.length === 0 && (
                    <div className="text-center p-6 text-gray-500">
                        {searchQuery ? 'هیچ کارمندی با این مشخصات یافت نشد.' : (showArchived ? 'هیچ کارمند بایگانی شده‌ای وجود ندارد.' : 'هیچ کارمند فعالی وجود ندارد. برای شروع یک کارمند جدید اضافه کنید.')}
                    </div>
                )}
            </div>

            <EmployeeDetailsModal
                isOpen={isDetailsModalOpen}
                onClose={() => setIsDetailsModalOpen(false)}
                onSave={handleSaveEmployee}
                employee={selectedEmployee}
            />
            <BulkEditModal 
                isOpen={isBulkEditModalOpen}
                onClose={() => setIsBulkEditModalOpen(false)}
                onSave={handleSaveBulkEdit}
                employeeCount={selectedIds.size}
            />
            <ConfirmationModal
                isOpen={!!employeeToRemove}
                onClose={() => setEmployeeToRemove(null)}
                onConfirm={handleConfirmRemove}
                title="تایید حذف کارمند"
                confirmText="حذف دائمی"
            >
                <p>آیا از حذف دائمی کارمند <strong className="px-1">"{employeeToRemove?.lastName} {employeeToRemove?.firstName}"</strong> اطمینان دارید؟ تمام اطلاعات حضور و غیاب و مالی این کارمند نیز حذف خواهد شد. <strong className="text-red-600">این عمل غیرقابل بازگشت است.</strong></p>
            </ConfirmationModal>
             <ConfirmationModal
                isOpen={!!importedData}
                onClose={() => setImportedData(null)}
                onConfirm={handleConfirmImport}
                title="تایید ورود اطلاعات پرسنل"
                confirmText="تایید و ورود"
            >
                <p>{importedData?.length} کارمند از فایل اکسل خوانده شد. کارمندان جدید اضافه و کارمندان موجود (بر اساس کد ملی) به‌روزرسانی خواهند شد. آیا ادامه می‌دهید؟</p>
            </ConfirmationModal>
        </div>
    );
};

export default PersonnelPage;