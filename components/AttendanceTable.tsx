import React, { useMemo, useState, useCallback, useRef } from 'react';
import { useEmployeeStore } from '../stores/useEmployeeStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { useAppStore } from '../stores/useAppStore';
import { useToastStore } from '../stores/useToastStore';
import { getDaysInJalaliMonth, getFirstDayOfMonthJalali, getFormattedDate } from '../utils/calendar';
import { formatCurrency } from '../utils/currency';
import { getContrastingTextColor } from '../utils/color';
import { JALALI_DAYS_ABBR } from '../constants';
import AddEmployeeRow from './AddEmployeeRow';
import EditableCell from './EditableCell';
import ExcelActions from './ExcelActions';
import ConfirmationModal from './ConfirmationModal';
import { useFinancialStore } from '../stores/useFinancialStore';

const ResizableHeader: React.FC<{
    title: string;
    width: number;
    onResize: (e: React.MouseEvent, key: string) => void;
    columnKey: string;
    className?: string;
}> = ({ title, width, onResize, columnKey, className }) => (
    <th 
        className={`p-1 border border-gray-300 text-center sticky top-0 z-20 bg-gray-200 select-none ${className ?? ''}`}
        style={{ width: `${width}px` }}
    >
        <div className="flex justify-between items-center h-full">
            <span className="flex-1 px-1">{title}</span>
            <div 
                onMouseDown={(e) => onResize(e, columnKey)}
                className="w-1.5 h-full cursor-col-resize hover:bg-blue-300 active:bg-blue-400"
            />
        </div>
    </th>
);

const AttendanceTable: React.FC = () => {
    const { currentProjectId, selectedYear, selectedMonth, setView, setReportView, setSelectedEmployeeIdForReport } = useAppStore();
    const { getProjectData, updateEmployee, updateAttendance, toggleEmployeeArchiveStatus, removeEmployeePermanently } = useEmployeeStore();
    const { getSettings } = useSettingsStore();
    const addToast = useToastStore(state => state.addToast);
    
    const [employeeToModify, setEmployeeToModify] = useState<{ id: string; name: string; action: 'archive' | 'unarchive' | 'delete' } | null>(null);
    const projectId = currentProjectId || 'default';
    const { employees, attendance } = getProjectData(projectId);
    const settings = getSettings(projectId);
    const [showArchived, setShowArchived] = useState(false);

    const [columnWidths, setColumnWidths] = useState({
        lastName: 120,
        firstName: 100,
        position: 100,
        monthlySalary: 130,
    });

    const isResizing = useRef<string | null>(null);
    const startX = useRef(0);
    const startWidth = useRef(0);

    const onMouseMove = useCallback((e: MouseEvent) => {
        if (!isResizing.current) return;
        const deltaX = e.clientX - startX.current;
        // In RTL, dragging right increases width, which means clientX decreases
        const newWidth = Math.max(60, startWidth.current - deltaX);
        setColumnWidths(prev => ({ ...prev, [isResizing.current!]: newWidth }));
    }, []);

    const onMouseUp = useCallback(() => {
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
        isResizing.current = null;
    }, [onMouseMove]);

    const handleMouseDown = useCallback((e: React.MouseEvent, columnKey: string) => {
        isResizing.current = columnKey;
        startX.current = e.clientX;
        startWidth.current = columnWidths[columnKey as keyof typeof columnWidths];
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
        e.preventDefault();
    }, [columnWidths, onMouseMove, onMouseUp]);


    const daysInMonth = useMemo(() => getDaysInJalaliMonth(selectedYear, selectedMonth), [selectedYear, selectedMonth]);
    const firstDayOfMonth = useMemo(() => getFirstDayOfMonthJalali(selectedYear, selectedMonth), [selectedYear, selectedMonth]);
    const visibleEmployees = useMemo(() => employees.filter(e => showArchived || !e.isArchived), [employees, showArchived]);
    const customCodeMap = useMemo(() => new Map(settings.customCodes.map(c => [c.char, c])), [settings.customCodes]);

    const handleConfirmEmployeeAction = () => {
        if (!employeeToModify) return;
        const { id, name, action } = employeeToModify;
        if (action === 'archive' || action === 'unarchive') {
            toggleEmployeeArchiveStatus(projectId, id);
            addToast(`کارمند "${name}" ${action === 'archive' ? 'بایگانی' : 'از بایگانی خارج'} شد.`, 'success');
        } else if (action === 'delete') {
            removeEmployeePermanently(projectId, id);
            addToast(`کارمند "${name}" برای همیشه حذف شد.`, 'success');
        }
        setEmployeeToModify(null);
    };
    
    const handleViewIndividualReport = (employeeId: string) => {
        setView('reports');
        setReportView('individual');
        setSelectedEmployeeIdForReport(employeeId);
    };
    
    if (!currentProjectId) {
        return <div className="text-center p-8 bg-white rounded-lg shadow">لطفاً ابتدا یک پروژه را از منوی بالا انتخاب کنید یا در صفحه تنظیمات یک پروژه جدید بسازید.</div>
    }

    const renderTableHeader = () => {
        const headers = [];
        for (let day = 1; day <= daysInMonth; day++) {
            const date = getFormattedDate(selectedYear, selectedMonth, day);
            const dayOfWeek = (firstDayOfMonth + day - 1) % 7;
            const override = settings.dayTypeOverrides[date];
            let dayType = 'normal';

            if (override) {
                dayType = override;
            } else if (dayOfWeek === 6) { 
                dayType = 'friday';
            } else if (settings.holidays.includes(date)) {
                dayType = 'holiday';
            }
            
            let cellClass = "bg-gray-100";
            if(dayType === 'friday') cellClass = "bg-green-200";
            if(dayType === 'holiday') cellClass = "bg-yellow-200";

            headers.push(
                <th key={day} className={`p-1 border border-gray-300 text-center sticky top-0 z-10 ${cellClass}`}>
                    <div className="text-xs font-normal">{JALALI_DAYS_ABBR[dayOfWeek]}</div>
                    <div className="font-semibold">{day}</div>
                </th>
            );
        }
        return headers;
    };
    
    return (
        <div className="bg-white p-4 rounded-lg shadow-lg h-full flex flex-col">
            <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
                <ExcelActions employees={employees} attendance={attendance} projectId={projectId} year={selectedYear} month={selectedMonth} />
                <div className="form-control">
                    <label className="label cursor-pointer">
                        <span className="label-text mr-2">نمایش بایگانی شده‌ها</span>
                        <input type="checkbox" checked={showArchived} onChange={() => setShowArchived(!showArchived)} className="toggle toggle-primary" />
                    </label>
                </div>
            </div>

            <div className="flex-1 overflow-auto">
                <table className="w-full border-collapse text-sm table-fixed">
                    <thead className="align-top">
                        <tr>
                            <th className="p-1 border border-gray-300 text-center sticky top-0 z-20 bg-gray-200" style={{width: '3rem'}}>#</th>
                            <th className="p-1 border border-gray-300 text-center sticky top-0 z-20 bg-gray-200" style={{width: '8rem'}}>عملیات</th>
                            <ResizableHeader title="نام خانوادگی" width={columnWidths.lastName} onResize={handleMouseDown} columnKey="lastName" />
                            <ResizableHeader title="نام" width={columnWidths.firstName} onResize={handleMouseDown} columnKey="firstName" />
                            <ResizableHeader title="سمت" width={columnWidths.position} onResize={handleMouseDown} columnKey="position" />
                            <ResizableHeader title={`حقوق ماهانه (${settings.currency === 'Rial' ? 'ریال' : 'تومان'})`} width={columnWidths.monthlySalary} onResize={handleMouseDown} columnKey="monthlySalary" />
                            {renderTableHeader()}
                        </tr>
                    </thead>
                    <tbody>
                        {visibleEmployees.map((emp, index) => (
                             <tr key={emp.id} className={`hover:bg-blue-50 ${emp.isArchived ? 'bg-gray-200 opacity-60' : ''}`}>
                                <td className="p-1 border border-gray-300 text-center text-gray-500">{index + 1}</td>
                                <td className="p-1 border border-gray-300 text-center">
                                    <div className="flex justify-center items-center gap-1">
                                         <button onClick={() => handleViewIndividualReport(emp.id)} className="btn btn-xs btn-ghost" title="مشاهده گزارش فردی">
                                            📊
                                        </button>
                                        <button onClick={() => setEmployeeToModify({ id: emp.id, name: `${emp.lastName} ${emp.firstName}`, action: emp.isArchived ? 'unarchive' : 'archive' })} className="btn btn-xs btn-ghost" title={emp.isArchived ? 'خروج از بایگانی' : 'بایگانی'}>
                                            {emp.isArchived ? '♻️' : '🗄️'}
                                        </button>
                                        <button onClick={() => setEmployeeToModify({ id: emp.id, name: `${emp.lastName} ${emp.firstName}`, action: 'delete' })} className="btn btn-xs btn-ghost text-red-600" title="حذف دائمی">
                                            🗑️
                                        </button>
                                    </div>
                                </td>
                                <td className="p-0 border border-gray-300"><EditableCell value={emp.lastName} onSave={val => updateEmployee(projectId, emp.id, { lastName: val })} /></td>
                                <td className="p-0 border border-gray-300"><EditableCell value={emp.firstName} onSave={val => updateEmployee(projectId, emp.id, { firstName: val })} /></td>
                                <td className="p-0 border border-gray-300"><EditableCell value={emp.position} onSave={val => updateEmployee(projectId, emp.id, { position: val })} /></td>
                                <td className="p-0 border border-gray-300">
                                    <EditableCell 
                                        type="number" 
                                        value={emp.monthlySalary} 
                                        onSave={val => updateEmployee(projectId, emp.id, { monthlySalary: Number(val) || 0 })}
                                        displayFormatter={(val) => formatCurrency(Number(val), settings.currency)}
                                    />
                                </td>
                                {Array.from({ length: daysInMonth }, (_, i) => {
                                    const day = i + 1;
                                    const date = getFormattedDate(selectedYear, selectedMonth, day);
                                    const value = attendance[emp.id]?.[date] || '';
                                    const dayOfWeek = (firstDayOfMonth + i) % 7;

                                    const customCode = customCodeMap.get(value);
                                    let cellBgClass = '';
                                    let cellStyle: React.CSSProperties = {};
                                    let cellTitle = '';
                                    
                                    if (customCode) {
                                        cellStyle.backgroundColor = customCode.color;
                                        cellStyle.color = getContrastingTextColor(customCode.color);
                                        cellTitle = customCode.description;
                                    } else {
                                        const override = settings.dayTypeOverrides[date];
                                        let dayType = override || (dayOfWeek === 6 ? 'friday' : (settings.holidays.includes(date) ? 'holiday' : 'normal'));
                                        if(dayType === 'friday') cellBgClass = 'bg-green-100/50';
                                        if(dayType === 'holiday') cellBgClass = 'bg-yellow-100/50';
                                    }
                                    
                                    return (
                                        <td key={date} className={`p-0 border border-gray-300 w-12 h-12 ${cellBgClass}`} style={cellStyle} title={cellTitle}>
                                            <EditableCell value={value} onSave={val => updateAttendance(projectId, emp.id, date, val)} />
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                        <AddEmployeeRow colSpan={daysInMonth} projectId={projectId} />
                    </tbody>
                </table>
            </div>

            <ConfirmationModal
                isOpen={!!employeeToModify}
                onClose={() => setEmployeeToModify(null)}
                onConfirm={handleConfirmEmployeeAction}
                title={`تایید عملیات کارمند`}
                confirmText={
                    employeeToModify?.action === 'delete' ? 'حذف دائمی' :
                    employeeToModify?.action === 'archive' ? 'بایگانی' : 'خروج از بایگانی'
                }
                confirmClassName={employeeToModify?.action === 'delete' ? 'btn-error' : 'btn-warning'}
            >
                {employeeToModify?.action === 'delete' && <p>آیا از حذف دائمی کارمند <strong className="px-1">"{employeeToModify.name}"</strong> اطمینان دارید؟ این عمل غیرقابل بازگشت است و تمام اطلاعات مالی و حضور و غیاب او نیز حذف خواهد شد.</p>}
                {employeeToModify?.action === 'archive' && <p>آیا میخواهید کارمند <strong className="px-1">"{employeeToModify.name}"</strong> را بایگانی کنید؟ او دیگر در گزارش‌ها نمایش داده نخواهد شد اما اطلاعاتش حفظ می‌شود.</p>}
                {employeeToModify?.action === 'unarchive' && <p>آیا میخواهید کارمند <strong className="px-1">"{employeeToModify.name}"</strong> را از بایگانی خارج کنید؟</p>}
            </ConfirmationModal>
        </div>
    );
};

export default AttendanceTable;
