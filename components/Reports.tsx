import React, { useMemo, useState, useRef, useEffect } from 'react';
import { useEmployeeStore } from '../stores/useEmployeeStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { useAppStore } from '../stores/useAppStore';
import { useCompanyStore } from '../stores/useCompanyStore';
import { useFinancialStore } from '../stores/useFinancialStore';
import { generateReport } from '../utils/reports';
import { exportReportToCSV } from '../utils/export';
import { formatCurrency } from '../utils/currency';
import { JALALI_MONTHS, ICONS } from '../constants';
import AttendanceSummaryReport from './AttendanceSummaryReport';
import AttendanceListReport from './AttendanceListReport';
import IndividualReport from './IndividualReport';
import { ReportDateFilter, ReportView } from '../types';

const currentJalaliYear = new Date().toLocaleDateString('fa-IR-u-nu-latn').split('/')[0];
const years = Array.from({ length: 10 }, (_, i) => parseInt(currentJalaliYear) - i);

const DateSelector: React.FC<{
    date: { year: number, month: number },
    onDateChange: (newDate: { year: number, month: number }) => void,
    label?: string
}> = ({ date, onDateChange, label }) => (
    <div className="join">
        {label && <span className="join-item btn btn-disabled btn-sm">{label}</span>}
        <select
            value={date.year}
            onChange={(e) => onDateChange({ ...date, year: Number(e.target.value) })}
            className="select select-bordered select-sm join-item"
        >
            {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select
            value={date.month}
            onChange={(e) => onDateChange({ ...date, month: Number(e.target.value) })}
            className="select select-bordered select-sm join-item"
        >
            {JALALI_MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
        </select>
    </div>
);

const Reports: React.FC = () => {
    const { 
        currentProjectId, 
        reportView, setReportView, 
        selectedEmployeeIdForReport, setSelectedEmployeeIdForReport, 
        setView, 
        reportDateFilter, setReportDateFilter,
    } = useAppStore();
    
    const { getProjectData } = useEmployeeStore();
    const { getSettings } = useSettingsStore();
    const { projects } = useCompanyStore();
    const { projectFinancials } = useFinancialStore();

    const projectId = currentProjectId || 'default';
    const currentProject = projects.find(p => p.id === projectId);

    const { employees, attendance } = getProjectData(projectId);
    const settings = getSettings(projectId);
    const financialData = projectFinancials[projectId] || {};

    const activeEmployees = useMemo(() => employees.filter(e => !e.isArchived), [employees]);
    
    const [searchQuery, setSearchQuery] = useState('');
    const [isDropdownVisible, setIsDropdownVisible] = useState(false);
    const searchContainerRef = useRef<HTMLDivElement>(null);

    const filteredEmployees = useMemo(() => {
        if (!searchQuery) return [];
        const lowerCaseQuery = searchQuery.toLowerCase();
        return activeEmployees.filter(emp => 
            `${emp.lastName} ${emp.firstName}`.toLowerCase().includes(lowerCaseQuery)
        );
    }, [searchQuery, activeEmployees]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
                setIsDropdownVisible(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const salaryReportData = useMemo(() => {
        if (activeEmployees.length === 0) return [];
        return generateReport(activeEmployees, attendance, settings, financialData, reportDateFilter.from, reportDateFilter.to);
    }, [activeEmployees, attendance, settings, financialData, reportDateFilter]);
    
    const handleExport = () => {
        exportReportToCSV(salaryReportData, projects, projectId, reportDateFilter.from, reportDateFilter.to);
    };

    const handleViewIndividualReport = (employeeId: string) => {
        setView('reports');
        setReportView('individual');
        setSelectedEmployeeIdForReport(employeeId);
    };
    
    const totalPayAllEmployees = salaryReportData.reduce((sum, item) => sum + item.totalPay, 0);

    const selectedEmployee = useMemo(() => {
        return activeEmployees.find(emp => emp.id === selectedEmployeeIdForReport);
    }, [activeEmployees, selectedEmployeeIdForReport]);

    const handleModeChange = (newMode: 'month' | 'range') => {
        setReportDateFilter(currentFilter => {
            const newFilter = { ...currentFilter, mode: newMode };
            if (newMode === 'month') {
                newFilter.to = newFilter.from;
            }
            return newFilter;
        });
    };

    const handleDateChange = (part: 'from' | 'to', newDate: { year: number, month: number }) => {
        setReportDateFilter(currentFilter => {
            if (currentFilter.mode === 'month') {
                return {
                    mode: 'month',
                    from: newDate,
                    to: newDate,
                };
            }
            
            const newFilter = { ...currentFilter, [part]: newDate };

            // Ensure 'from' is not after 'to'
            if (newFilter.from.year > newFilter.to.year || (newFilter.from.year === newFilter.to.year && newFilter.from.month > newFilter.to.month)) {
                if (part === 'from') {
                    newFilter.to = newFilter.from;
                } else {
                    newFilter.from = newFilter.to;
                }
            }
            return newFilter;
        });
    };

    const handleReportViewChange = (newView: ReportView) => {
        // "Attendance List" report only supports month mode.
        // If user switches to it while in range mode, auto-switch to month mode.
        if (newView === 'attendanceList' && reportDateFilter.mode === 'range') {
           setReportDateFilter(f => ({ ...f, mode: 'month', to: f.from }));
        }
        setReportView(newView);
    };
    
    const reportTitle = useMemo(() => {
        const { mode, from, to } = reportDateFilter;
        if (mode === 'month' || (from.year === to.year && from.month === to.month)) {
            return `${JALALI_MONTHS[from.month - 1]} ${from.year}`;
        }
        return `از ${JALALI_MONTHS[from.month - 1]} ${from.year} تا ${JALALI_MONTHS[to.month - 1]} ${to.year}`;
    }, [reportDateFilter]);

    if (!currentProjectId) {
         return <div className="text-center p-8 bg-white rounded-lg shadow">لطفاً ابتدا یک پروژه را از منوی بالا انتخاب کنید یا در صفحه تنظیمات یک پروژه جدید بسازید.</div>
    }
    
    const renderContent = () => {
        switch(reportView) {
            case 'salary':
                return (
                    <div className="bg-white p-6 rounded-lg shadow">
                        <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-800">گزارش مبلغ حقوق - {reportTitle}</h1>
                                <p className="text-gray-600">{currentProject?.companyName} - {currentProject?.name}</p>
                            </div>
                            <button onClick={handleExport} className="btn btn-success no-print" disabled={salaryReportData.length === 0}>خروجی CSV</button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-center">
                                <thead className="bg-gray-100">
                                    <tr>
                                        <th className="p-3 font-semibold">#</th>
                                        <th className="p-3 font-semibold text-right">نام کارمند</th>
                                        <th className="p-3 font-semibold">روزهای موثر</th>
                                        <th className="p-3 font-semibold">مرخصی</th>
                                        <th className="p-3 font-semibold">استعلاجی</th>
                                        <th className="p-3 font-semibold">اضافه کاری (ساعت)</th>
                                        <th className="p-3 font-semibold">مساعده</th>
                                        <th className="p-3 font-semibold">پاداش</th>
                                        <th className="p-3 font-semibold">کسورات</th>
                                        <th className="p-3 font-semibold">حقوق قابل پرداخت ({settings.currency === 'Rial' ? 'ریال' : 'تومان'})</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {salaryReportData.map((item, index) => (
                                        <tr key={item.employeeId} className="border-t border-gray-200 hover:bg-gray-50">
                                            <td className="p-3">{index + 1}</td>
                                            <td className="p-3 text-right">
                                                <button onClick={() => handleViewIndividualReport(item.employeeId)} className="link link-hover text-right">
                                                    {item.employeeName}
                                                </button>
                                            </td>
                                            <td className="p-3 font-bold text-blue-600">{item.effectiveDays}</td>
                                            <td className="p-3">{item.leaveDays}</td>
                                            <td className="p-3">{item.sickDays}</td>
                                            <td className="p-3 font-bold text-purple-600">{item.overtimeHours}</td>
                                            <td className="p-3 text-orange-600">{formatCurrency(item.advance, settings.currency)}</td>
                                            <td className="p-3 text-green-600">{formatCurrency(item.bonus, settings.currency)}</td>
                                            <td className="p-3 text-red-600">{formatCurrency(item.deduction, settings.currency)}</td>
                                            <td className="p-3 font-bold">{formatCurrency(item.totalPay, settings.currency)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="bg-gray-200 font-bold">
                                    <tr>
                                        <td colSpan={9} className="p-3 text-right">جمع کل پرداختی:</td>
                                        <td className="p-3">{formatCurrency(totalPayAllEmployees, settings.currency, true)}</td>
                                    </tr>
                                </tfoot>
                            </table>
                             {salaryReportData.length === 0 && (
                                <div className="text-center p-6 text-gray-500">هیچ کارمند فعالی برای نمایش گزارش حقوق در این بازه وجود ندارد.</div>
                            )}
                        </div>
                    </div>
                );
            case 'attendanceSummary':
                return <AttendanceSummaryReport employees={activeEmployees} attendance={attendance} settings={settings} projectId={projectId} />;
            case 'attendanceList':
                return <AttendanceListReport employees={activeEmployees} attendance={attendance} settings={settings} projectId={projectId} />;
            case 'individual':
                return <IndividualReport employee={selectedEmployee} employees={activeEmployees} projectId={projectId} />;
            default:
                return null;
        }
    }

    return (
        <div className="space-y-6">
            <div className="bg-white p-4 rounded-lg shadow no-print space-y-4">
                 <div role="tablist" className="tabs tabs-boxed">
                    <a role="tab" className={`tab ${reportView === 'salary' ? 'tab-active' : ''}`} onClick={() => handleReportViewChange('salary')}>مبلغ حقوق</a> 
                    <a role="tab" className={`tab ${reportView === 'attendanceSummary' ? 'tab-active' : ''}`} onClick={() => handleReportViewChange('attendanceSummary')}>کارکرد کلی</a>
                    <a role="tab" className={`tab ${reportView === 'attendanceList' ? 'tab-active' : ''}`} onClick={() => handleReportViewChange('attendanceList')}>لیست کارکرد</a>
                    <a role="tab" className={`tab ${reportView === 'individual' ? 'tab-active' : ''}`} onClick={() => handleReportViewChange('individual')}>گزارش فردی</a>
                </div>
                
                 <div className="border-t pt-4">
                    <div role="tablist" className="tabs tabs-sm tabs-bordered">
                        <a role="tab" className={`tab ${reportDateFilter.mode === 'month' ? 'tab-active' : ''}`} onClick={() => handleModeChange('month')}>ماهانه</a>
                        <a role="tab" className={`tab ${reportDateFilter.mode === 'range' ? 'tab-active' : ''} ${reportView === 'attendanceList' ? 'tab-disabled' : ''}`} onClick={() => { if (reportView !== 'attendanceList') { handleModeChange('range'); } }}>بازه زمانی</a>
                    </div>
                    <div className="p-2 flex items-center gap-4 flex-wrap">
                        {reportDateFilter.mode === 'month' ? (
                            <DateSelector
                                date={reportDateFilter.from}
                                onDateChange={d => handleDateChange('from', d)}
                            />
                        ) : (
                             <>
                                <DateSelector
                                    label="از:"
                                    date={reportDateFilter.from}
                                    onDateChange={d => handleDateChange('from', d)}
                                />
                                 <DateSelector
                                    label="تا:"
                                    date={reportDateFilter.to}
                                    onDateChange={d => handleDateChange('to', d)}
                                />
                            </>
                        )}
                    </div>
                 </div>

                 {reportView === 'individual' && (
                    <div ref={searchContainerRef} className="form-control relative w-full max-w-xs">
                        <input 
                            type="text"
                            className="input input-bordered w-full"
                            placeholder="جستجوی کارمند..."
                            value={isDropdownVisible ? searchQuery : (selectedEmployee ? `${selectedEmployee.lastName} ${selectedEmployee.firstName}` : searchQuery)}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                if (!isDropdownVisible) setIsDropdownVisible(true);
                            }}
                            onFocus={() => {
                                setIsDropdownVisible(true);
                                setSearchQuery('');
                            }}
                        />
                        {isDropdownVisible && filteredEmployees.length > 0 && (
                            <ul className="absolute z-20 w-full mt-1 menu p-2 shadow bg-base-100 rounded-box max-h-60 overflow-y-auto">
                                {filteredEmployees.map(emp => (
                                    <li key={emp.id}>
                                        <a
                                            onClick={() => {
                                                setSelectedEmployeeIdForReport(emp.id);
                                                setSearchQuery('');
                                                setIsDropdownVisible(false);
                                            }}
                                        >
                                            {emp.lastName} {emp.firstName}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        )}
                         {activeEmployees.length === 0 && <p className="text-sm text-gray-500 mt-2">هیچ کارمند فعالی برای انتخاب وجود ندارد.</p>}
                    </div>
                )}
            </div>
            
            {renderContent()}

        </div>
    );
};

export default Reports;