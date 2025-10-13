import React, { useState } from 'react';
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { useSettingsStore } from '../stores/useSettingsStore';
import { useAppStore } from '../stores/useAppStore';
import { useEmployeeStore } from '../stores/useEmployeeStore';
import { generateAttendanceSummary } from '../utils/reports';
import { JALALI_MONTHS } from '../constants';
import { Employee } from '../types';

interface IndividualAiAnalysisProps {
    employee: Employee;
    projectId: string;
}

const IndividualAiAnalysis: React.FC<IndividualAiAnalysisProps> = ({ employee, projectId }) => {
    const { selectedYear, selectedMonth } = useAppStore();
    const settings = useSettingsStore().getSettings(projectId);
    const { attendance } = useEmployeeStore().getProjectData(projectId);

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
            
            const summaryData = generateAttendanceSummary([employee], attendance, settings, selectedYear, selectedMonth)[0];
             if (!summaryData) {
                setAnalysis("داده‌ای برای تحلیل این کارمند در ماه انتخاب شده وجود ندارد.");
                setIsLoading(false);
                return;
            }
            
            const promptData = `کارمند: ${summaryData.lastName} ${summaryData.firstName}\nحضور: ${summaryData.presenceDays} روز\nمرخصی: ${summaryData.leaveDays} روز\nغیبت: ${summaryData.absentDays} روز\nجمعه کاری: ${summaryData.fridayWorkDays} روز\nتعطیل کاری: ${summaryData.holidayWorkDays} روز\nاضافه کاری: ${summaryData.overtimeHours} ساعت\nکل روزهای کارکرد: ${summaryData.totalWorkedDays} روز`;
            const analysisPeriod = `ماه ${JALALI_MONTHS[selectedMonth-1]} ${selectedYear}`;

            const prompt = `
به عنوان یک مدیر منابع انسانی، داده‌های کارکرد کارمند زیر را که مربوط به ${analysisPeriod} است، تحلیل کن.

یک تحلیل کوتاه و حرفه‌ای (در حد ۳-۴ جمله) از عملکرد این کارمند در این ماه ارائه بده. به مواردی مانند نظم کاری (با توجه به غیبت)، تعهد کاری (با توجه به اضافه کاری و کار در روزهای تعطیل) و مقایسه کلی عملکرد با یک کارمند استاندارد اشاره کن.

تحلیل باید مثبت و سازنده باشد مگر اینکه تعداد غیبت‌ها زیاد باشد که در این صورت باید به صورت محترمانه به آن اشاره شود.

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
    
    return (
        <div className="bg-base-100 p-6 rounded-lg shadow border-l-4 border-secondary">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                    <div>
                        <h2 className="text-xl font-bold">تحلیل هوشمند عملکرد فردی</h2>
                        <p className="text-sm text-base-content/70">تحلیل عملکرد {employee.lastName} {employee.firstName} در ماه {JALALI_MONTHS[selectedMonth-1]}</p>
                    </div>
                </div>
                 <button className="btn btn-secondary" onClick={handleGenerateAnalysis} disabled={isLoading}>
                    {isLoading ? <span className="loading loading-spinner"></span> : 'ایجاد تحلیل فردی'}
                 </button>
            </div>
            
            {error && <div className="alert alert-error mt-4 text-sm">{error}</div>}

            {isLoading && (
                 <div className="text-center p-6">
                    <span className="loading loading-dots loading-lg"></span>
                    <p>در حال تحلیل عملکرد کارمند...</p>
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

export default IndividualAiAnalysis;
