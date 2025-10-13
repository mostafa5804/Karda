import React, { useMemo, useEffect, useRef } from 'react';
import { useEmployeeStore } from '../stores/useEmployeeStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { useFinancialStore } from '../stores/useFinancialStore';
import { useAppStore } from '../stores/useAppStore';
import { useCompanyStore } from '../stores/useCompanyStore';
import { calculateAllDashboardData } from '../utils/dashboard';
import { JALALI_MONTHS } from '../constants';
import { getCurrentJalaliDate } from '../utils/calendar';
import { formatCurrency } from '../utils/currency';

const ICONS = {
    present: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.653-.124-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.653.124-1.283.356-1.857m0 0a3.001 3.001 0 015.288 0M12 14a4 4 0 100-8 4 4 0 000 8z" /></svg>,
    onLeave: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    absent: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>,
    money: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v.01M12 16v-1m0-1c-1.11 0-2.08-.402-2.599-1M12 16c-1.657 0-3-.895-3-2s1.343-2 3-2m0 8v1m0-1c1.657 0 3-.895 3-2s-1.343-2-3-2M9 12a2.25 2.25 0 012.25-2.25A2.25 2.25 0 0113.5 12a2.25 2.25 0 01-2.25 2.25A2.25 2.25 0 019 12z" /></svg>,
    overtime: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6l4 2" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 22a10 10 0 100-20 10 10 0 000 20z" /></svg>,
    absence: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
};

const StatCard: React.FC<{ 
    title: string; 
    value: string | number; 
    icon: React.ReactNode; 
    colorClass: string; 
}> = ({ title, value, icon, colorClass }) => (
    <div className="bg-white p-5 rounded-xl shadow-md flex items-center gap-4 transition-all hover:shadow-lg hover:-translate-y-1">
        <div className={`rounded-full p-3 ${colorClass}`}>
            {icon}
        </div>
        <div>
            <p className="text-3xl font-bold text-gray-800">{value}</p>
            <h3 className="text-gray-500 font-semibold text-sm">{title}</h3>
        </div>
    </div>
);

const MonthlyStat: React.FC<{ title: string; value: string | number; description: string; icon: React.ReactNode; }> = ({ title, value, description, icon }) => (
    <div className="flex items-center p-4">
        <div className="p-3 rounded-full text-blue-600 bg-blue-100 mr-4">
            {icon}
        </div>
        <div>
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <p className="text-xl font-bold text-gray-800">
                {value} <span className="text-sm font-normal text-gray-600">{description}</span>
            </p>
        </div>
    </div>
);

const ChartWrapper: React.FC<{ children: React.ReactNode; hasData: boolean; noDataMessage: string; className?: string }> = ({ children, hasData, noDataMessage, className }) => (
    <div className={`relative ${className}`}>
        {!hasData && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 z-10">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" /></svg>
                <p className="text-sm">{noDataMessage}</p>
            </div>
        )}
        <div className={!hasData ? 'opacity-0' : ''}>{children}</div>
    </div>
);


const Dashboard: React.FC = () => {
    const { currentProjectId, dashboardDateFilter, setDashboardDateFilter, selectedYear, selectedMonth } = useAppStore();
    const { getProjectData } = useEmployeeStore();
    const { getSettings } = useSettingsStore();
    const { projectFinancials } = useFinancialStore();
    const { projects } = useCompanyStore();
    const salaryChartRef = useRef<HTMLCanvasElement>(null);
    const trendChartRef = useRef<HTMLCanvasElement>(null);

    const projectId = currentProjectId || 'default';
    const { employees, attendance } = getProjectData(projectId);
    const settings = getSettings(projectId);
    const financialData = projectFinancials[projectId] || {};
    
    const allDashboardData = useMemo(() => {
        return calculateAllDashboardData(employees, attendance, settings, financialData, dashboardDateFilter);
    }, [employees, attendance, settings, financialData, dashboardDateFilter]);

    useEffect(() => {
        const chartCanvas = salaryChartRef.current;
        if (!chartCanvas) return;
        const existingChart = (window as any).salaryChartInstance;
        if(existingChart) existingChart.destroy();

        if (allDashboardData.salaryDistribution && allDashboardData.salaryDistribution.data.length > 0) {
            const ctx = chartCanvas.getContext('2d');
            if (ctx) {
                (window as any).salaryChartInstance = new (window as any).Chart(ctx, {
                    type: 'doughnut',
                    data: {
                        labels: allDashboardData.salaryDistribution.labels,
                        datasets: [{
                            data: allDashboardData.salaryDistribution.data,
                            backgroundColor: ['#36A2EB', '#FF6384', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#c9cbcf'],
                            borderColor: '#fff',
                            borderWidth: 2,
                        }],
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { display: false },
                            tooltip: {
                                callbacks: {
                                    label: (tooltipItem) => {
                                        const label = tooltipItem.label || '';
                                        const value = tooltipItem.raw as number;
                                        return `${label}: ${formatCurrency(value, settings.currency, true)}`;
                                    }
                                }
                            }
                        }
                    },
                });
            }
        }
    }, [allDashboardData.salaryDistribution, settings.currency]);
    
     useEffect(() => {
        const chartCanvas = trendChartRef.current;
        if (!chartCanvas) return;
        const existingChart = (window as any).trendChartInstance;
        if(existingChart) existingChart.destroy();

        if (allDashboardData.employeeTrend && allDashboardData.employeeTrend.data.length > 0) {
            const ctx = chartCanvas.getContext('2d');
            if (ctx) {
                (window as any).trendChartInstance = new (window as any).Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: allDashboardData.employeeTrend.labels,
                        datasets: [{
                            label: 'تعداد کارمندان فعال',
                            data: allDashboardData.employeeTrend.data,
                            fill: true,
                            borderColor: 'rgb(54, 162, 235)',
                            tension: 0.3,
                            backgroundColor: 'rgba(54, 162, 235, 0.2)',
                        }],
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
                    }
                });
            }
        }
    }, [allDashboardData.employeeTrend]);
    
    const currentProject = projects.find(p => p.id === projectId);
    const [todayY, todayM, todayD] = getCurrentJalaliDate();

    if (!currentProjectId) {
        return <div className="text-center p-8 bg-white rounded-lg shadow">لطفاً ابتدا یک پروژه را از منوی بالا انتخاب کنید یا در صفحه تنظیمات یک پروژه جدید بسازید.</div>
    }

    const { dailyStats, monthlyStats, projectWideStats, salaryDistribution, employeeTrend } = allDashboardData;

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center flex-wrap gap-4">
                <h1 className="text-2xl font-bold text-gray-800">داشبورد پروژه: {currentProject?.name}</h1>
                <div className="flex items-center gap-2 bg-white p-1 rounded-full shadow-sm">
                    <button onClick={() => setDashboardDateFilter({mode: 'all'})} className={`btn btn-sm ${dashboardDateFilter.mode === 'all' ? 'btn-primary' : 'btn-ghost'} rounded-full`}>کل پروژه</button>
                    <button onClick={() => setDashboardDateFilter({mode: 'month', year: selectedYear, month: selectedMonth})} className={`btn btn-sm ${dashboardDateFilter.mode === 'month' ? 'btn-primary' : 'btn-ghost'} rounded-full`}>
                        {JALALI_MONTHS[selectedMonth - 1]} {selectedYear}
                    </button>
                </div>
            </div>
            
            <div>
                <h2 className="text-xl font-bold text-gray-700 mb-4">
                    خلاصه وضعیت امروز
                    <span className="text-sm font-normal text-gray-500 mr-2">({`${todayD} ${JALALI_MONTHS[todayM - 1]}`})</span>
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    <StatCard title="حاضر" value={dailyStats.present} icon={ICONS.present} colorClass="bg-green-100" />
                    <StatCard title="مرخصی" value={dailyStats.onLeave} icon={ICONS.onLeave} colorClass="bg-yellow-100" />
                    <StatCard title="غایب" value={dailyStats.absent} icon={ICONS.absent} colorClass="bg-red-100" />
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-md">
                <h2 className="text-xl font-semibold mb-2 border-b pb-3">
                    {dashboardDateFilter.mode === 'all' ? 'آمار کلی پروژه (از ابتدا تا کنون)' : `آمار ماه ${JALALI_MONTHS[dashboardDateFilter.month! - 1]} ${dashboardDateFilter.year}`}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-gray-200 divide-x-reverse">
                    {dashboardDateFilter.mode === 'all' && projectWideStats && (
                        <>
                           <MonthlyStat title="جمع کل حقوق پرداختی" value={formatCurrency(projectWideStats.totalSalaryPaid, settings.currency)} description={settings.currency === 'Rial' ? 'ریال' : 'تومان'} icon={ICONS.money} />
                           <MonthlyStat title="جمع کل روزهای کاری" value={projectWideStats.totalWorkDays.toLocaleString('fa-IR')} description="روز" icon={ICONS.present} />
                           <MonthlyStat title="جمع کل اضافه کاری" value={projectWideStats.totalOvertimeHours.toLocaleString('fa-IR')} description="ساعت" icon={ICONS.overtime} />
                        </>
                    )}
                    {dashboardDateFilter.mode === 'month' && monthlyStats && (
                        <>
                            <MonthlyStat title="جمع کل پرداختی ماه" value={formatCurrency(monthlyStats.totalPayForMonth, settings.currency)} description={settings.currency === 'Rial' ? 'ریال' : 'تومان'} icon={ICONS.money} />
                            <MonthlyStat title="جمع اضافه کاری ماه" value={monthlyStats.totalOvertimeHours} description="ساعت" icon={ICONS.overtime} />
                            <MonthlyStat title="جمع غیبت‌های ماه" value={monthlyStats.totalAbsences} description="روز" icon={ICONS.absence} />
                        </>
                    )}
                </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <div className="lg:col-span-3 bg-white p-6 rounded-xl shadow-md">
                     <h2 className="text-xl font-semibold mb-4">روند تعداد کارمندان</h2>
                      <ChartWrapper hasData={employeeTrend && employeeTrend.data.length > 0} noDataMessage="داده‌ای برای نمایش روند کارمندان وجود ندارد." className="h-64">
                        <canvas ref={trendChartRef}></canvas>
                    </ChartWrapper>
                </div>
                <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-md">
                    <h2 className="text-xl font-semibold mb-4">توزیع حقوق ماه</h2>
                     <ChartWrapper
                        hasData={salaryDistribution && salaryDistribution.data.length > 0}
                        noDataMessage={dashboardDateFilter.mode === 'month' ? 'داده‌ای برای نمایش وجود ندارد.' : 'برای مشاهده نمودار، یک ماه خاص را انتخاب کنید.'}
                        className="h-64"
                     >
                        <canvas ref={salaryChartRef}></canvas>
                    </ChartWrapper>
                </div>
            </div>

        </div>
    );
};

export default Dashboard;
