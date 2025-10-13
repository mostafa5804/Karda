import React, { useState, useMemo, useCallback } from 'react';
import { useEmployeeStore } from '../stores/useEmployeeStore';
import { useAppStore } from '../stores/useAppStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { getDaysInJalaliMonth, getFirstDayOfMonthJalali, getFormattedDate } from '../utils/calendar';
import { JALALI_DAYS_ABBR, ICONS } from '../constants';
import AddEmployeeRow from './AddEmployeeRow';
import EditableCell from './EditableCell';
import type { Employee } from '../types';
import ConfirmationModal from './ConfirmationModal';
import ExcelActions from './ExcelActions';

type SortableKeys = 'lastName' | 'monthlySalary';
type ActionType = 'archive' | 'unarchive' | 'delete';

const AttendanceTable: React.FC = () => {
    const { currentProjectId, selectedYear, selectedMonth, setView, setReportView, setSelectedEmployeeIdForReport } = useAppStore();
    const { getProjectData, updateAttendance, updateEmployee, toggleEmployeeArchiveStatus, removeEmployeePermanently } = useEmployeeStore();
    const { getSettings, setDayOverride } = useSettingsStore();
    
    const [showArchived, setShowArchived] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    
    const projectId = currentProjectId || 'default';

    const { employees, attendance } = getProjectData(projectId);
    const settings = getSettings(projectId);

    const [actionableEmployee, setActionableEmployee] = useState<{ employee: Employee; type: ActionType } | null>(null);
    const [sortConfig, setSortConfig] = useState<{ key: SortableKeys; direction: 'asc' | 'desc' } | null>(null);

    const filteredEmployees = useMemo(() => {
        let employeesToFilter = employees.filter(emp => showArchived || !emp.isArchived);
        if (searchTerm.trim() !== '') {
            employeesToFilter = employeesToFilter.filter(emp => 
                `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
                `${emp.lastName} ${emp.firstName}`.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }
        return employeesToFilter;
    }, [employees, showArchived, searchTerm]);

    const sortedEmployees = useMemo(() => {
        let sortableItems = [...filteredEmployees];
        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                const valA = a[sortConfig.key];
                const valB = b[sortConfig.key];
                if (valA < valB) {
                    return sortConfig.direction === 'asc' ? -1 : 1;
                }
                if (valA > valB) {
                    return sortConfig.direction === 'asc' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableItems;
    }, [filteredEmployees, sortConfig]);

    const requestSort = (key: SortableKeys) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const daysInMonth = getDaysInJalaliMonth(selectedYear, selectedMonth);
    const firstDay = getFirstDayOfMonthJalali(selectedYear, selectedMonth);

    const handleAttendanceChange = (employeeId: string, day: number, value: string) => {
        const date = getFormattedDate(selectedYear, selectedMonth, day);

        if (value.trim() === '') {
            updateAttendance(projectId, employeeId, date, '');
            return;
        }

        const numericValue = parseFloat(value);
        const isValidLetter = ['م', 'ت', 'غ'].includes(value.toLowerCase());
        const isValidNumber = !isNaN(numericValue) && numericValue >= 1 && numericValue <= 23;
        
        if (!isValidLetter && !isValidNumber && value.trim() !== '') return;

        updateAttendance(projectId, employeeId, date, value);

        if (value.toLowerCase() === 'ت') {
            for (let i = day + 1; i <= daysInMonth; i++) {
                const futureDate = getFormattedDate(selectedYear, selectedMonth, i);
                updateAttendance(projectId, employeeId, futureDate, 'ت');
            }
        }
    };
    
    const handleConfirmAction = () => {
        if (!actionableEmployee) return;
        const { employee, type } = actionableEmployee;
        if (type === 'archive' || type === 'unarchive') {
            toggleEmployeeArchiveStatus(projectId, employee.id);
        } else if (type === 'delete') {
            removeEmployeePermanently(projectId, employee.id);
        }
        setActionableEmployee(null);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, rowIndex: number, dayIndex: number) => {
        const { key } = e;
        if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 'Tab'].includes(key)) return;

        e.preventDefault();
        
        let nextRow = rowIndex;
        let nextCol = dayIndex;

        if (key === 'ArrowUp') nextRow = Math.max(0, rowIndex - 1);
        else if (key === 'ArrowDown' || key === 'Enter') nextRow = Math.min(sortedEmployees.length - 1, rowIndex + 1);
        else if (key === 'ArrowLeft' || (key === 'Tab' && e.shiftKey)) nextCol = Math.max(0, dayIndex - 1);
        else if (key === 'ArrowRight' || key === 'Tab') nextCol = Math.min(daysInMonth - 1, dayIndex + 1);

        const nextInput = document.querySelector(`[data-row='${nextRow}'][data-col='${nextCol}']`) as HTMLInputElement;
        nextInput?.focus();
    };

    const getCellClassName = useCallback((value: string) => {
        const lowerCaseValue = String(value).toLowerCase();
        switch (lowerCaseValue) {
            case 'غ': return 'bg-red-200';
            case 'م': return 'bg-yellow-200';
            case 'ت': return 'bg-blue-200';
            default: return 'bg-transparent';
        }
    }, []);
    
    const handleViewIndividualReport = (employeeId: string) => {
        setView('reports');
        setReportView('individual');
        setSelectedEmployeeIdForReport(employeeId);
    };

    if (!currentProjectId) {
        return <div className="text-center p-8 bg-white rounded-lg shadow">لطفاً ابتدا یک پروژه را از منوی بالا انتخاب کنید یا در صفحه تنظیمات یک پروژه جدید بسازید.</div>
    }
    
    const getModalDetails = () => {
        if (!actionableEmployee) return null;
        const { employee, type } = actionableEmployee;
        switch(type) {
            case 'archive':
                return { title: "تایید آرشیو", confirmText: "آرشیو", confirmClassName: "btn-warning", children: <p>آیا از آرشیو کارمند <strong className="px-1">{employee.firstName} {employee.lastName}</strong> اطمینان دارید؟ سوابق او حفظ خواهد شد.</p> };
            case 'unarchive':
                 return { title: "تایید بازیابی", confirmText: "بازیابی", confirmClassName: "btn-success", children: <p>آیا از بازیابی کارمند <strong className="px-1">{employee.firstName} {employee.lastName}</strong> اطمینان دارید؟</p> };
            case 'delete':
                 return { title: "تایید حذف دائمی", confirmText: "حذف دائمی", confirmClassName: "btn-error", children: <p>آیا از حذف دائمی کارمند <strong className="px-1">{employee.firstName} {employee.lastName}</strong> اطمینان دارید؟ <strong className="text-red-600">این عمل غیرقابل بازگشت است و تمام سوابق او برای همیشه پاک می‌شود.</strong></p> };
            // FIX: Using an exhaustive check in the default case helps TypeScript correctly infer the return type of the function, preventing errors where properties of the returned object are typed as `unknown`.
            default:
                // This should be unreachable if 'ActionType' is correct,
                // but it helps guarantee type safety.
                const exhaustiveCheck: never = type;
                return null;
        }
    }
    const modalDetails = getModalDetails();

    return (
        <div className="flex flex-col h-full">
            <div className="bg-white p-4 rounded-lg shadow-sm flex justify-between items-center flex-wrap gap-4 mb-4">
                <ExcelActions employees={employees} attendance={attendance} projectId={projectId} year={selectedYear} month={selectedMonth}/>
                <div className="form-control">
                    <input 
                        type="text" 
                        placeholder="جستجوی کارمند..." 
                        className="input input-bordered input-sm"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="form-control">
                    <label className="label cursor-pointer">
                        <span className="label-text mr-2">نمایش آرشیو شده‌ها</span>
                        <input type="checkbox" checked={showArchived} onChange={() => setShowArchived(!showArchived)} className="checkbox checkbox-primary" />
                    </label>
                </div>
            </div>
            <div className="bg-white shadow-md rounded-lg overflow-auto flex-grow">
                <table className="w-full border-collapse" style={{direction: 'rtl', tableLayout: 'fixed'}}>
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="sticky right-0 bg-gray-200 z-20 p-2 border border-gray-300" style={{width: '50px'}}>#</th>
                            <th className="p-2 border border-gray-300 bg-gray-200" style={{width: '120px'}}>عملیات</th>
                            <th className="sticky right-[50px] bg-gray-200 z-20 p-2 border border-gray-300 cursor-pointer" style={{width: '160px'}} onClick={() => requestSort('lastName')}>نام خانوادگی</th>
                            <th className="p-2 border border-gray-300 bg-gray-200" style={{width: '160px'}}>نام</th>
                            <th className="p-2 border border-gray-300 bg-gray-200" style={{width: '150px'}}>سمت</th>
                            <th className="p-2 border border-gray-300 bg-gray-200 cursor-pointer" style={{width: '160px'}} onClick={() => requestSort('monthlySalary')}>حقوق ماهانه</th>
                            {Array.from({ length: daysInMonth }, (_, i) => {
                                const day = i + 1;
                                const date = getFormattedDate(selectedYear, selectedMonth, day);
                                const dayOfWeek = (firstDay + i) % 7;
                                const override = settings.dayTypeOverrides[date];
                                let dayType = override || (dayOfWeek === 6 ? 'friday' : (settings.holidays.includes(date) ? 'holiday' : 'normal'));
                                let headerBg = dayType === 'friday' ? 'bg-green-200' : (dayType === 'holiday' ? 'bg-red-200' : 'bg-gray-50');
                                return (<th key={day} className={`border border-gray-300 text-center font-normal p-0 ${headerBg}`} style={{width: '50px', minWidth: '50px'}}>
                                    <div className="dropdown dropdown-bottom dropdown-end w-full h-full">
                                    <label tabIndex={day} className="flex flex-col items-center justify-center w-full h-full cursor-pointer p-1">
                                        <div className="text-sm">{day}</div>
                                        {/* FIX: Corrected typo from JALI_DAYS_ABBR to JALALI_DAYS_ABBR */}
                                        <div className="text-xs">{JALALI_DAYS_ABBR[dayOfWeek]}</div>
                                    </label>
                                    <ul tabIndex={day} className="dropdown-content z-[30] menu p-2 shadow bg-base-100 rounded-box w-36">
                                        <li><a onClick={() => setDayOverride(projectId, date, 'normal')}>عادی</a></li>
                                        <li><a onClick={() => setDayOverride(projectId, date, 'friday')}>جمعه</a></li>
                                        <li><a onClick={() => setDayOverride(projectId, date, 'holiday')}>تعطیل</a></li>
                                        <div className="divider my-1"></div>
                                        <li><a onClick={() => setDayOverride(projectId, date, null)}>پیش‌فرض</a></li>
                                    </ul>
                                    </div>
                                </th>);
                            })}
                            <th className="sticky left-0 bg-gray-200 z-10 p-2 border border-gray-300" style={{width: '100px'}}>جمع ساعات</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedEmployees.map((employee, rowIndex) => {
                             const employeeAttendance = attendance[employee.id] || {};
                             const totalHours = Object.values(employeeAttendance).reduce((sum: number, value) => {
                                const hours = parseFloat(value as string);
                                return sum + (isNaN(hours) ? 0 : hours);
                             }, 0);
                             return (
                                <tr key={employee.id} className={`hover:bg-gray-50 ${employee.isArchived ? 'bg-gray-100 text-gray-400' : ''}`}>
                                    <td className="sticky right-0 bg-white p-2 border border-gray-300 text-center z-10">{rowIndex + 1}</td>
                                    <td className="p-2 border border-gray-300 text-center">
                                         <div className="flex justify-center items-center gap-2">
                                            {!employee.isArchived && (
                                                <button
                                                    onClick={() => handleViewIndividualReport(employee.id)}
                                                    className="p-1 rounded-full text-blue-500 hover:bg-blue-100 transition-colors"
                                                    title="مشاهده گزارش فردی"
                                                >
                                                   {ICONS.reports}
                                                </button>
                                            )}
                                            <button
                                                onClick={() => setActionableEmployee({employee, type: employee.isArchived ? 'unarchive' : 'archive'})}
                                                className={`p-1 rounded-full transition-colors ${employee.isArchived ? 'text-yellow-500 hover:bg-yellow-100' : 'text-gray-500 hover:bg-gray-100'}`}
                                                title={employee.isArchived ? "بازیابی کارمند" : "آرشیو کارمند"}
                                            >
                                               {ICONS.archive}
                                            </button>
                                            <button
                                                onClick={() => setActionableEmployee({employee, type: 'delete'})}
                                                className="p-1 rounded-full text-red-500 hover:bg-red-100 transition-colors"
                                                title="حذف دائمی کارمند"
                                            >
                                               {ICONS.userRemove}
                                            </button>
                                        </div>
                                    </td>
                                    <td className={`sticky right-[50px] p-0 border border-gray-300 z-10 ${employee.isArchived ? 'bg-gray-100' : 'bg-white'}`}><EditableCell value={employee.lastName} onSave={(val) => updateEmployee(projectId, employee.id, { lastName: val })} disabled={employee.isArchived}/></td>
                                    <td className={`p-0 border border-gray-300 ${employee.isArchived ? 'bg-gray-100' : 'bg-white'}`}><EditableCell value={employee.firstName} onSave={(val) => updateEmployee(projectId, employee.id, { firstName: val })} disabled={employee.isArchived}/></td>
                                    <td className={`p-0 border border-gray-300 ${employee.isArchived ? 'bg-gray-100' : 'bg-white'}`}><EditableCell value={employee.position} onSave={(val) => updateEmployee(projectId, employee.id, { position: val })} disabled={employee.isArchived}/></td>
                                    <td className={`p-0 border border-gray-300 ${employee.isArchived ? 'bg-gray-100' : 'bg-white'}`}><EditableCell value={employee.monthlySalary} onSave={(val) => updateEmployee(projectId, employee.id, { monthlySalary: Number(val) })} type="number" disabled={employee.isArchived}/></td>
                                    {Array.from({ length: daysInMonth }, (_, i) => {
                                        const day = i + 1;
                                        const date = getFormattedDate(selectedYear, selectedMonth, day);
                                        const dayOfWeek = (firstDay + i) % 7;
                                        const override = settings.dayTypeOverrides[date];
                                        const dayType = override || (dayOfWeek === 6 ? 'friday' : (settings.holidays.includes(date) ? 'holiday' : 'normal'));

                                        let columnBg = '';
                                        if (dayType === 'friday') columnBg = 'bg-green-100';
                                        else if (dayType === 'holiday') columnBg = 'bg-red-100';

                                        const value = employeeAttendance[date] || '';
                                        const cellColorClass = getCellClassName(value);
                                        
                                        const finalBgClass = cellColorClass !== 'bg-transparent' ? cellColorClass : columnBg;

                                        return (<td key={date} className="border border-gray-300 text-center p-0">
                                            <input type="text" value={value} 
                                                onChange={(e) => handleAttendanceChange(employee.id, day, e.target.value)} 
                                                onKeyDown={(e) => handleKeyDown(e, rowIndex, i)}
                                                data-row={rowIndex}
                                                data-col={i}
                                                className={`w-full h-full text-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:z-10 relative ${finalBgClass}`}
                                                disabled={employee.isArchived} />
                                        </td>)
                                    })}
                                    <td className={`sticky left-0 p-2 border border-gray-300 text-center font-bold z-10 ${employee.isArchived ? 'bg-gray-100' : 'bg-white'}`}>{totalHours}</td>
                                </tr>
                             )
                        })}
                         <AddEmployeeRow colSpan={daysInMonth + 1} projectId={projectId} />
                    </tbody>
                </table>
            </div>
            {modalDetails && <ConfirmationModal
                isOpen={!!actionableEmployee}
                onClose={() => setActionableEmployee(null)}
                onConfirm={handleConfirmAction}
                title={modalDetails.title}
                confirmText={modalDetails.confirmText}
                confirmClassName={modalDetails.confirmClassName}
            >
                {modalDetails.children}
            </ConfirmationModal>}
        </>
    );
};

export default AttendanceTable;