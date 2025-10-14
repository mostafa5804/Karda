import React, { useState, useMemo, useRef } from 'react';
import { useEmployeeStore } from '../stores/useEmployeeStore';
import { useAppStore } from '../stores/useAppStore';
import { useFinancialStore } from '../stores/useFinancialStore';
import { useNotesStore } from '../stores/useNotesStore';
import { useToastStore } from '../stores/useToastStore';
import { useCompanyStore } from '../stores/useCompanyStore';
import { Employee, PersonnelColumnKey } from '../types';
import EmployeeDetailsModal from './EmployeeDetailsModal';
import ConfirmationModal from './ConfirmationModal';
import { formatCurrency } from '../utils/currency';
import { useSettingsStore } from '../stores/useSettingsStore';
import { useSortableTable } from '../hooks/useSortableTable';
import SortableTableHeader from './SortableTableHeader';
import { ICONS } from '../constants';
import { exportPersonnelToExcel, downloadPersonnelTemplate, importPersonnelFromExcel } from '../utils/excel';
import BulkEditModal from './BulkEditModal';
import { useDocumentStore } from '../stores/useDocumentStore';
import { getCurrentJalaliDate, getFormattedDate } from '../utils/calendar';

const ACTION_ICONS = {
    report: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
    archive: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 4H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-2m-4-1v8m0 0l3-3m-3 3L9 8m-5 5h14" /></svg>,
    unarchive: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>,
    delete: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>,
};


const PersonnelPage: React.FC = () => {
    const { currentProjectId, setView, setReportView, setSelectedEmployeeIdForReport } = useAppStore();
    const { projects } = useCompanyStore();
    const { getProjectData, addEmployee, updateEmployee, toggleEmployeeArchiveStatus, removeEmployee, upsertPersonnel, bulkUpdateEmployees } = useEmployeeStore();
    const { removeEmployeeFinancials } = useFinancialStore();
    const { removeEmployeeNotes } = useNotesStore();
    const { removeEmployeeDocuments } = useDocumentStore();
    const { getSettings, updatePersonnelVisibleColumns } = useSettingsStore();
    const addToast = useToastStore(state => state.addToast);

    const projectId = currentProjectId || 'default';
    const { employees } = getProjectData(projectId);
    const settings = getSettings(projectId);
    const visibleColumns = settings.personnelVisibleColumns;

    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [isBulkEditModalOpen, setIsBulkEditModalOpen] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | undefined>(undefined);
    const [employeeToRemove, setEmployeeToRemove] = useState<Employee | null>(null);
    const [showArchived, setShowArchived] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [importedData, setImportedData] = useState<Partial<Employee>[] | null>(null);
    const fileImportInputRef = useRef<HTMLInputElement>(null);
    const [printMode, setPrintMode] = useState<'color' | 'monochrome'>('monochrome');
    const [printOrientation, setPrintOrientation] = useState<'portrait' | 'landscape'>('landscape');

    const todayString = useMemo(() => {
        const [y, m, d] = getCurrentJalaliDate();
        return getFormattedDate(y, m, d);
    }, []);

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

    const { items: sortedEmployees, requestSort, sortConfig } = useSortableTable<Employee>(filteredEmployees, { key: 'lastName', direction: 'asc' });

    const optionalColumns: { key: PersonnelColumnKey; label: string }[] = [
        { key: 'monthlySalary', label: 'حقوق ماهانه' },
        { key: 'contractStartDate', label: 'تاریخ شروع قرارداد' },
        { key: 'contractEndDate', label: 'تاریخ پایان قرارداد' },
        { key: 'settlementDate', label: 'تاریخ تسویه' },
    ];

    const handleOpenDetailsModal = (employee?: Employee) => {
        setSelectedEmployee(employee);
        setIsDetailsModalOpen(true);
    };

    const handleSaveEmployee = (employeeData: Omit<Employee, 'id' | 'isArchived'>, employeeId?: string) => {
        if (employeeId) {
            updateEmployee(projectId, employeeId, employeeData);
            addToast('اطلاعات کارمند با موفقیت به‌روزرسانی شد.', 'success');
            setIsDetailsModalOpen(false);
        } else {
            const newEmployee = addEmployee(projectId, employeeData);
            setSelectedEmployee(newEmployee); // Keep modal open in edit mode
            addToast('کارمند جدید با موفقیت افزوده شد.', 'success');
        }
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

    const handleConfirmRemove = async () => {
        if (!employeeToRemove) return;
        
        await removeEmployeeDocuments(projectId, employeeToRemove.id);
        removeEmployeeFinancials(projectId, employeeToRemove.id);
        removeEmployeeNotes(projectId, employeeToRemove.id);
        removeEmployee(projectId, employeeToRemove.id);

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
        const styleId = 'dynamic-print-style';
        document.getElementById(styleId)?.remove();

        const style = document.createElement('style');
        style.id = styleId;
        style.innerHTML = `@media print { @page { size: A4 ${printOrientation}; margin: 1cm; } }`;
        document.head.appendChild(style);
        
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
    
    const handleViewIndividualReport = (employeeId: string) => {
        setView('reports');
        setReportView('individual');
        setSelectedEmployeeIdForReport(employeeId);
    };

    if (!currentProjectId) {
        return <div className="text-center p-8 bg-base-100 rounded-lg shadow">لطفاً ابتدا یک پروژه را انتخاب کنید.</div>
    }

    const currentProject = projects.find(p => p.id === projectId);

    return (
        <div className="space-y-6">
            <div className="bg-base-100 p-4 rounded-lg shadow flex justify-between items-center flex-wrap gap-4 no-print">
                <h1 className="text-2xl font-bold">مدیریت پرسنل</h1>
                 <input
                    type="text"
                    placeholder="جستجو (نام، سمت، کد ملی)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="input input-bordered w-full max-w-xs"
                />
                <div className="flex items-center gap-2 flex-wrap">
                     <div className="join">
                        <input className="join-item btn btn-sm btn-outline" type="radio" name="print_orientation_personnel" aria-label="عمودی" value="portrait" checked={printOrientation === 'portrait'} onChange={() => setPrintOrientation('portrait')} />
                        <input className="join-item btn btn-sm btn-outline" type="radio" name="print_orientation_personnel" aria-label="افقی" value="landscape" checked={printOrientation === 'landscape'} onChange={() => setPrintOrientation('landscape')} />
                    </div>
                     <div className="join">
                        <input className="join-item btn btn-sm btn-outline" type="radio" name="print_options_personnel" aria-label="رنگی" value="color" checked={printMode === 'color'} onChange={() => setPrintMode('color')} />
                        <input className="join-item btn btn-sm btn-outline" type="radio" name="print_options_personnel" aria-label="سیاه‌وسفید" value="monochrome" checked={printMode === 'monochrome'} onChange={() => setPrintMode('monochrome')} />
                    </div>
                    <button onClick={handlePrint} className="btn btn-outline">{ICONS.print} <span className="mr-1">چاپ</span></button>
                    <div className="dropdown dropdown-end">
                        <label tabIndex={0} className="btn btn-outline">عملیات اکسل</label>
                        <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52">
                            <li><a onClick={() => fileImportInputRef.current?.click()}>{ICONS.upload}<span className="mr-2">ورود از اکسل</span></a></li>
                            <li><a onClick={() => exportPersonnelToExcel(employees, currentProject?.name || '')}>{ICONS.download}<span className="mr-2">خروجی اکسل</span></a></li>
                            <div className="divider my-1"></div>
                            <li><a onClick={downloadPersonnelTemplate}>دانلود فایل نمونه</a></li>
                        </ul>
                    </div>
                     <input type="file" accept=".xlsx, .xls" className="hidden" ref={fileImportInputRef} onChange={handleImport}/>
                    <div className="dropdown dropdown-end">
                        <label tabIndex={0} className="btn btn-outline">نمایش ستون‌ها</label>
                        <div tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-60" onClick={e => e.stopPropagation()}>
                           {optionalColumns.map(({key, label}) => (
                                <li key={key}>
                                    <label className="label cursor-pointer py-1">
                                        <span className="label-text">{label}</span> 
                                        <input 
                                            type="checkbox" 
                                            checked={!!visibleColumns?.[key]} 
                                            onChange={e => updatePersonnelVisibleColumns(projectId, key, e.target.checked)}
                                            className="checkbox checkbox-sm" 
                                        />
                                    </label>
                                </li>
                           ))}
                        </div>
                    </div>
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

            <div className={`bg-base-100 rounded-lg shadow overflow-x-auto print-area personnel-print-area print-${printMode}`}>
                <div className="hidden print:block p-4">
                    <div className="flex justify-between items-center border-b-2 border-black pb-2">
                        <div className="w-1/4 flex justify-center">
                            {currentProject?.companyLogo && <img src={currentProject.companyLogo} alt="Company Logo" className="h-16 w-auto" />}
                        </div>
                        <div className="w-1/2 text-center">
                            <h1 className="text-xl font-bold">{currentProject?.companyName}</h1>
                            <h2 className="text-lg">لیست پرسنل پروژه: {currentProject?.name}</h2>
                        </div>
                        <div className="w-1/4" />
                    </div>
                </div>
                <table className="w-full text-sm text-right table-alternating-rows">
                    <thead className="bg-base-200 text-base-content/80">
                        <tr>
                            <th className="p-3 no-print"><input type="checkbox" className="checkbox checkbox-sm" onChange={e => handleSelectAll(e.target.checked)} checked={sortedEmployees.length > 0 && selectedIds.size === sortedEmployees.length}/></th>
                            <SortableTableHeader<Employee> sortKey="lastName" sortConfig={sortConfig} requestSort={requestSort} className="p-3">نام خانوادگی</SortableTableHeader>
                            <SortableTableHeader<Employee> sortKey="firstName" sortConfig={sortConfig} requestSort={requestSort} className="p-3">نام</SortableTableHeader>
                            <SortableTableHeader<Employee> sortKey="nationalId" sortConfig={sortConfig} requestSort={requestSort} className="p-3">کد ملی</SortableTableHeader>
                            <SortableTableHeader<Employee> sortKey="position" sortConfig={sortConfig} requestSort={requestSort} className="p-3">سمت</SortableTableHeader>
                            <SortableTableHeader<Employee> sortKey="monthlySalary" sortConfig={sortConfig} requestSort={requestSort} className={`p-3 ${!visibleColumns?.monthlySalary ? 'hidden' : ''}`}>حقوق ماهانه</SortableTableHeader>
                            <SortableTableHeader<Employee> sortKey="contractStartDate" sortConfig={sortConfig} requestSort={requestSort} className={`p-3 ${!visibleColumns?.contractStartDate ? 'hidden' : ''}`}>شروع قرارداد</SortableTableHeader>
                            <SortableTableHeader<Employee> sortKey="contractEndDate" sortConfig={sortConfig} requestSort={requestSort} className={`p-3 ${!visibleColumns?.contractEndDate ? 'hidden' : ''}`}>پایان قرارداد</SortableTableHeader>
                            <SortableTableHeader<Employee> sortKey="settlementDate" sortConfig={sortConfig} requestSort={requestSort} className={`p-3 ${!visibleColumns?.settlementDate ? 'hidden' : ''}`}>تاریخ تسویه</SortableTableHeader>
                            <th className="p-3 text-center no-print">عملیات</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedEmployees.map(emp => {
                            const isExpired = emp.contractEndDate && emp.contractEndDate < todayString;
                            let rowClass = emp.isArchived ? 'bg-base-200 text-base-content/40' : (isExpired ? 'bg-red-50 text-red-800' : 'bg-base-100');
                            if (emp.settlementDate) {
                                rowClass = 'bg-purple-50'; // Settlement color takes precedence
                            }

                            return (
                                <tr key={emp.id} className={`border-t border-base-200 hover:bg-base-200 ${rowClass}`}>
                                    <td className="p-3 no-print"><input type="checkbox" className="checkbox checkbox-sm" checked={selectedIds.has(emp.id)} onChange={e => handleSelect(emp.id, e.target.checked)}/></td>
                                    <td className="p-3 print-no-wrap">{emp.lastName}</td>
                                    <td className="p-3 print-no-wrap">{emp.firstName}</td>
                                    <td className="p-3 font-mono">{emp.nationalId}</td>
                                    <td className="p-3 print-no-wrap">{emp.position}</td>
                                    <td className={`p-3 ${!visibleColumns?.monthlySalary ? 'hidden' : ''}`}>{formatCurrency(emp.monthlySalary, settings.currency)}</td>
                                    <td className={`p-3 ${!visibleColumns?.contractStartDate ? 'hidden' : ''}`}>{emp.contractStartDate || '-'}</td>
                                    <td className={`p-3 ${!visibleColumns?.contractEndDate ? 'hidden' : ''}`}>{emp.contractEndDate || '-'}</td>
                                    <td className={`p-3 ${!visibleColumns?.settlementDate ? 'hidden' : ''} ${emp.settlementDate ? 'font-bold text-purple-600' : ''}`}>{emp.settlementDate || '-'}</td>
                                    <td className="p-3 text-center whitespace-nowrap no-print">
                                        <div className="flex items-center justify-center gap-1">
                                            <button onClick={() => handleOpenDetailsModal(emp)} className="btn btn-xs btn-ghost text-blue-600" title="ویرایش جزئیات">ویرایش</button>
                                            
                                            {!emp.isArchived && (
                                                <button onClick={() => handleViewIndividualReport(emp.id)} className="btn btn-xs btn-ghost text-green-600" title="مشاهده گزارش فردی">
                                                    {ACTION_ICONS.report}
                                                </button>
                                            )}

                                            <button onClick={() => toggleEmployeeArchiveStatus(projectId, emp.id)} className="btn btn-xs btn-ghost text-yellow-600" title={emp.isArchived ? 'فعال‌سازی' : 'بایگانی'}>
                                                {emp.isArchived ? ACTION_ICONS.unarchive : ACTION_ICONS.archive}
                                            </button>
                                            
                                            {emp.isArchived && (
                                                <button onClick={() => setEmployeeToRemove(emp)} className="btn btn-xs btn-ghost text-red-600" title="حذف دائمی">
                                                    {ACTION_ICONS.delete}
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                {sortedEmployees.length === 0 && (
                    <div className="text-center p-6 text-base-content/60">
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