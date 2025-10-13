import React, { useState, useMemo } from 'react';
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { useSettingsStore } from '../stores/useSettingsStore';
import { useAppStore } from '../stores/useAppStore';
import { useEmployeeStore } from '../stores/useEmployeeStore';
import { generateAttendanceSummary } from '../utils/reports';
import { JALALI_MONTHS } from '../constants';

const AiAssistantWidget: React.FC = () => {
    const { currentProjectId, selectedYear, selectedMonth, dashboardDateFilter } = useAppStore();
    const { getSettings } = useSettingsStore();
    const { getProjectData } = useEmployeeStore();

    const projectId = currentProjectId || 'default';
    const settings = getSettings(projectId);
    const { employees, attendance } = getProjectData(projectId);
    const activeEmployees = useMemo(() => employees.filter(e => !e.isArchived), [employees]);

    const [analysis, setAnalysis] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleGenerateAnalysis = async () => {
        if (!navigator.onLine) {
            setError('برای استفاده از دستیار هوشمند، اتصال به اینترنت لازم است.');
            return;
        }
        if (!settings.geminiApiKey) {
            setError('لطفاً کلید API Gemini را در صفحه تنظیمات وارد کنید.');
            return;
        }

        setIsLoading(true);
        setError('');
        setAnalysis('');

        try {
            const ai = new GoogleGenAI({ apiKey: settings.geminiApiKey });
            
            let promptData = '';
            let analysisPeriod = '';

            if (dashboardDateFilter.mode === 'month') {
                const summaryData = generateAttendanceSummary(activeEmployees, attendance, settings, { year: selectedYear, month: selectedMonth }, { year: selectedYear, month: selectedMonth });
                if (summaryData.length === 0) {
                    setAnalysis("داده‌ای برای تحلیل در این ماه وجود ندارد.");
                    setIsLoading(false);
                    return;
                }
                promptData = summaryData.map(emp => 
                    `- ${emp.lastName} ${emp.firstName}: حضور=${emp.presenceDays}, مرخصی=${emp.leaveDays}, غیبت=${emp.absentDays}, اضافه کاری=${emp.overtimeHours}`
                ).join('\n');
                analysisPeriod = `ماه ${JALALI_MONTHS[selectedMonth-1]} ${selectedYear}`;

            } else { // mode 'all'
                const allTimeSummary = new Map<string, { name: string; totalLeave: number; totalOvertime: number; totalAbsence: number; }>();
                activeEmployees.forEach(emp => {
                    allTimeSummary.set(emp.id, {
                        name: `${emp.lastName} ${emp.firstName}`,
                        totalLeave: 0,
                        totalOvertime: 0,
                        totalAbsence: 0,
                    });
                });

                const allMonths = new Set<string>();
                Object.values(attendance).forEach(empAtt => {
                    Object.keys(empAtt).forEach(date => allMonths.add(date.substring(0, 7)));
                });

                allMonths.forEach(monthStr => {
                    const [year, month] = monthStr.split('-').map(Number);
                    // FIX: Pass 'from' and 'to' objects to generateAttendanceSummary as required by its signature.
                    const monthlySummary = generateAttendanceSummary(activeEmployees, attendance, settings, { year, month }, { year, month });
                    monthlySummary.forEach(empSummary => {
                        const summary = allTimeSummary.get(empSummary.employeeId);
                        if (summary) {
                            summary.totalLeave += empSummary.leaveDays;
                            summary.totalOvertime += empSummary.overtimeHours;
                            summary.totalAbsence += empSummary.absentDays;
                        }
                    });
                });

                if (allTimeSummary.size === 0) {
                    setAnalysis("هیچ داده‌ای برای تحلیل در کل پروژه وجود ندارد.");
                    setIsLoading(false);
                    return;
                }
                
                promptData = Array.from(allTimeSummary.values()).map(summary => 
                    `- ${summary.name}: مرخصی کل=${summary.totalLeave}, غیبت کل=${summary.totalAbsence}, اضافه کاری کل=${summary.totalOvertime}`
                ).join('\n');
                analysisPeriod = "کل دوره پروژه";
            }

            const prompt = `
به عنوان یک تحلیلگر ارشد منابع انسانی، داده‌های کارکرد زیر را که مربوط به ${analysisPeriod} است، تحلیل کن.

ابتدا، یک **تحلیل کلی و خلاصه** در حد ۲ الی ۳ جمله از وضعیت کلی تیم (مانند نظم، میزان اضافه کاری، و...) ارائه بده.

سپس، به صورت دقیق و با استفاده از لیست‌های نشانه‌دار (bullet points)، موارد زیر را مشخص کن:
- **بیشترین اضافه کاری:** (لیست ۳ نفر برتر با ذکر میزان ساعت)
- **کمترین اضافه کاری:** (لیست ۳ نفر از بین کسانی که حداقل یک ساعت اضافه کاری داشته‌اند)
- **بیشترین مرخصی:** (لیست ۳ نفر برتر با ذکر تعداد روز)
- **بیشترین غیبت:** (لیست ۳ نفر برتر با ذکر تعداد روز)

پاسخ باید کاملاً به زبان فارسی، ساختاریافته، و برای ارائه به مدیر مناسب باشد.

داده‌ها:
${promptData}
            `;

            const response: GenerateContentResponse = await ai.models.generateContent({
              model: 'gemini-2.5-flash',
              contents: prompt,
            });
            
            setAnalysis(response.text);

        } catch (e) {
            console.error(e);
            setError('خطا در ارتباط با سرویس هوش مصنوعی. لطفاً کلید API و اتصال اینترنت خود را بررسی کنید.');
        } finally {
            setIsLoading(false);
        }
    };
    
    const analysisTitle = useMemo(() => {
        if (dashboardDateFilter.mode === 'month') {
            return `تحلیل داده‌های ماه ${JALALI_MONTHS[selectedMonth - 1]}`;
        }
        return 'تحلیل داده‌های کل پروژه';
    }, [dashboardDateFilter, selectedMonth]);

    return (
        <div className="bg-base-100 p-6 rounded-xl shadow-md border-l-4 border-primary">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                    <div>
                        <h2 className="text-xl font-bold">دستیار هوشمند کارکرد</h2>
                        <p className="text-sm text-base-content/70">{analysisTitle}</p>
                    </div>
                </div>
                 <button className="btn btn-primary" onClick={handleGenerateAnalysis} disabled={isLoading}>
                    {isLoading ? <span className="loading loading-spinner"></span> : 'ایجاد تحلیل'}
                 </button>
            </div>
            
            {error && <div className="alert alert-error mt-4 text-sm">{error}</div>}

            {isLoading && (
                 <div className="text-center p-6">
                    <span className="loading loading-dots loading-lg"></span>
                    <p>در حال تحلیل داده‌ها...</p>
                </div>
            )}
            
            {analysis && (
                <div className="prose prose-sm max-w-none mt-4 pt-4 border-t border-base-300 whitespace-pre-wrap font-sans leading-relaxed">
                    {analysis}
                </div>
            )}

        </div>
    );
};

export default AiAssistantWidget;