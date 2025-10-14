import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useAppStore } from '../stores/useAppStore';
import { useEmployeeStore } from '../stores/useEmployeeStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { useNotesStore } from '../stores/useNotesStore';
import { getDaysInJalaliMonth, getFirstDayOfMonthJalali, getFormattedDate } from '../utils/calendar';
import { JALALI_DAYS_OF_WEEK } from '../constants';
import AddEmployeeRow from './AddEmployeeRow';
import { Employee, CustomAttendanceCode } from '../types';
import ExcelActions from './ExcelActions';
import NoteEditorModal from './NoteEditorModal';
import { getContrastingTextColor } from '../utils/color';
import ManageActiveEmployeesModal from './ManageActiveEmployeesModal';
import { useToastStore } from '../stores/useToastStore';

const AttendanceTable: React.FC = () => {
    const { selectedYear, selectedMonth, currentProjectId } = useAppStore();
    const { getProjectData, setAttendance } = useEmployeeStore();
    const { getSettings, setDayOverride } = useSettingsStore();
    const { getNote, addOrUpdateNote } = useNotesStore();
    const addToast = useToastStore(s => s.addToast);

    const projectId = currentProjectId || 'default';
    const { employees, attendance } = getProjectData(projectId);
    const settings = getSettings(projectId);

    const activeEmployees = useMemo(() => employees.filter(e => !e.isArchived).sort((a,b) => a.lastName.localeCompare(b.lastName)), [employees]);

    const daysInMonth = getDaysInJalaliMonth(selectedYear, selectedMonth);
    const firstDay = getFirstDayOfMonthJalali(selectedYear, selectedMonth);
    
    const [noteModalData, setNoteModalData] = useState<{ employee: Employee, date: string } | null>(null);
    const [headerMenu, setHeaderMenu] = useState<{ day: number, x: number, y: number } | null>(null);
    const [manageEmployeesModalOpen, setManageEmployeesModalOpen] = useState(false);
    const headerMenuRef = useRef<HTMLDivElement>(null);

    const customCodeMap = useMemo(() => {
        const map = new Map<string, CustomAttendanceCode>();
        settings.customCodes.forEach(code => map.set(code.char.toLowerCase(), code));
        return map;
    }, [settings.customCodes]);
    
    const validCodeChars = useMemo(() => new Set(settings.customCodes.map(c => c.char.toLowerCase())), [settings.customCodes]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (headerMenuRef.current && !headerMenuRef.current.contains(event.target as Node)) {
                setHeaderMenu(null);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [headerMenuRef]);

    const handleAttendanceChange = (employeeId: string, date: string, value: string) => {
        const trimmedValue = value.trim();
        if (trimmedValue === '') {
            setAttendance(projectId, employeeId, date, '', selectedYear, selectedMonth);
            return;
        }

        const numericValue = parseFloat(trimmedValue);
        const isValidNumber = !isNaN(numericValue) && numericValue >= 1 && numericValue <= 23;
        const isValidCode = validCodeChars.has(trimmedValue.toLowerCase());

        if (isValidNumber || isValidCode) {
            setAttendance(projectId, employeeId, date, trimmedValue, selectedYear, selectedMonth);
        } else {
            addToast(`مقدار وارد شده نامعتبر است. فقط اعداد بین ۱ تا ۲۳ یا کدهای تعریف شده مجاز هستند.`, 'warning');
        }
    };
    
    const handleDayHeaderClick = (e: React.MouseEvent, day: number) => {
        e.preventDefault();
        setHeaderMenu({ day, x: e.clientX, y: e.clientY });
    };

    const handleDayTypeChange = (day: number, type: 'normal' | 'friday' | 'holiday' | null) => {
        const date = getFormattedDate(selectedYear, selectedMonth, day);
        setDayOverride(projectId, date, type);
        setHeaderMenu(null);
    };

    const getDayCellStyle = (value: string): React.CSSProperties => {
        const customCode = customCodeMap.get(String(value).toLowerCase());
        if (customCode) {
            return { backgroundColor: customCode.color, color: getContrastingTextColor(customCode.color) };
        }
        return {};
    };

    if (!currentProjectId) {
         return <div className="text-center p-8 bg-white rounded-lg shadow">لطفاً ابتدا یک پروژه را از منوی بالا انتخاب کنید یا در صفحه تنظیمات یک پروژه جدید بسازید.</div>
    }

    const renderHeader = () => {
        const headers = [];
        for (let i = 0; i < daysInMonth; i++) {
            const day = i + 1;
            const dayOfWeek = (firstDay + i) % 7;
            const date = getFormattedDate(selectedYear, selectedMonth, day);
            const override = settings.dayTypeOverrides[date];
            let cellClass = "bg-gray-100";
            if (override) {
                 if (override === 'holiday') cellClass = 'bg-red-200';
                 if (override === 'friday') cellClass = 'bg-green-200';
                 if (override === 'normal') cellClass = 'bg-blue-200';
            } else if (dayOfWeek === 6) { // Friday
                cellClass = 'bg-green-100';
            } else if (settings.holidays.includes(date)) {
                cellClass = 'bg-red-100';
            }

            headers.push(
                <th 
                    key={i} 
                    className={`p-1 border border-gray-300 text-center sticky top-0 z-10 ${cellClass} min-w-[50px] cursor-pointer`} 
                    onContextMenu={(e) => handleDayHeaderClick(e, day)}
                    title="برای تغییر وضعیت روز، کلیک-راست کنید"
                >
                    <div className="font-normal text-sm">{JALALI_DAYS_OF_WEEK[dayOfWeek]}</div>
                    <div className="font-bold text-lg">{day}</div>
                </th>
            );
        }
        return headers;
    };

    const renderBody = () => {
        return activeEmployees.map((employee, index) => {
            const settlementDateInMonth = employee.settlementDate && employee.settlementDate.startsWith(`${selectedYear}-${String(selectedMonth).padStart(2, '0')}`);
            const rowClass = settlementDateInMonth ? 'bg-purple-50' : 'hover:bg-gray-50';

            return (
            <tr key={employee.id} className={`${rowClass} h-12`}>
                <td className="p-2 border border-gray-300 text-center sticky left-0 bg-white z-10 w-[45px]">{index + 1}</td>
                <td className="p-2 border border-gray-300 sticky left-[45px] bg-white z-10 min-w-[120px] whitespace-nowrap">{employee.lastName}</td>
                <td className="p-2 border border-gray-300 sticky left-[175px] bg-white z-10 min-w-[100px] whitespace-nowrap">{employee.firstName}</td>
                <td className="p-2 border border-gray-300 sticky left-[285px] bg-white z-10 min-w-[120px] whitespace-nowrap">{employee.position}</td>
                {Array.from({ length: daysInMonth }, (_, i) => {
                    const day = i + 1;
                    const date = getFormattedDate(selectedYear, selectedMonth, day);
                    const value = attendance[employee.id]?.[date] || '';
                    const note = getNote(projectId, employee.id, date);
                    return (
                        <td key={date} className="p-0 border border-gray-300 relative group" style={getDayCellStyle(value)}>
                            <input
                                type="text"
                                defaultValue={value}
                                onBlur={(e) => handleAttendanceChange(employee.id, date, e.target.value)}
                                onKeyDown={(e) => { if(e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
                                className="w-full h-full p-2 text-center bg-transparent outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            {note && <div className="absolute top-0.5 right-0.5 w-2 h-2 bg-blue-500 rounded-full" title={note}></div>}
                            <button onClick={() => setNoteModalData({employee, date})} className="absolute bottom-0.5 right-0.5 w-4 h-4 bg-gray-300 text-gray-600 rounded-full text-xs hidden group-hover:flex items-center justify-center opacity-70 hover:opacity-100" title="افزودن/ویرایش یادداشت">
                                i
                            </button>
                        </td>
                    );
                })}
            </tr>
        )});
    };

    return (
        <>
        <div className="bg-white p-4 rounded-lg shadow mb-4 flex justify-between items-center flex-wrap gap-4">
            <h1 className="text-xl font-bold text-gray-800">جدول حضور و غیاب</h1>
            <div className="flex items-center gap-2">
                 <button className="btn btn-outline" onClick={() => setManageEmployeesModalOpen(true)}>
                    مدیریت کارمندان فعال
                </button>
                <ExcelActions employees={employees} attendance={attendance} projectId={projectId} year={selectedYear} month={selectedMonth} />
            </div>
        </div>

        <div className="overflow-x-auto h-[calc(100vh-220px)] bg-white rounded-lg shadow">
            <table className="w-full border-collapse text-sm">
                <thead className="sticky top-0 z-20">
                    <tr>
                        <th className="p-2 border border-gray-300 text-center sticky left-0 z-30 bg-gray-200 w-[45px]">#</th>
                        <th className="p-2 border border-gray-300 sticky left-[45px] z-30 bg-gray-200 min-w-[120px]">نام خانوادگی</th>
                        <th className="p-2 border border-gray-300 sticky left-[175px] z-30 bg-gray-200 min-w-[100px]">نام</th>
                        <th className="p-2 border border-gray-300 sticky left-[285px] z-30 bg-gray-200 min-w-[120px]">سمت</th>
                        {renderHeader()}
                    </tr>
                </thead>
                <tbody>
                    {renderBody()}
                    <AddEmployeeRow colSpan={daysInMonth - 1} projectId={projectId} />
                </tbody>
            </table>
        </div>
        {noteModalData && (
            <NoteEditorModal
                isOpen={!!noteModalData}
                onClose={() => setNoteModalData(null)}
                onSave={(note) => addOrUpdateNote(projectId, noteModalData.employee.id, noteModalData.date, note)}
                initialNote={getNote(projectId, noteModalData.employee.id, noteModalData.date)}
                employeeName={`${noteModalData.employee.lastName} ${noteModalData.employee.firstName}`}
                date={noteModalData.date}
            />
        )}
        {manageEmployeesModalOpen && (
            <ManageActiveEmployeesModal 
                isOpen={manageEmployeesModalOpen} 
                onClose={() => setManageEmployeesModalOpen(false)}
                projectId={projectId}
            />
        )}
        {headerMenu && (
             <div ref={headerMenuRef} className="absolute z-50 bg-white rounded-md shadow-lg p-2" style={{ top: headerMenu.y, left: headerMenu.x }}>
                <ul className="menu menu-sm">
                    <li><a onClick={() => handleDayTypeChange(headerMenu.day, 'holiday')}>تعطیل رسمی</a></li>
                    <li><a onClick={() => handleDayTypeChange(headerMenu.day, 'friday')}>جمعه کاری</a></li>
                    <li><a onClick={() => handleDayTypeChange(headerMenu.day, 'normal')}>روز کاری عادی</a></li>
                    <div className="divider my-1"></div>
                    <li><a onClick={() => handleDayTypeChange(headerMenu.day, null)}>حذف حالت ویژه</a></li>
                </ul>
            </div>
        )}
        </>
    );
};

export default AttendanceTable;
