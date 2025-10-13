import React, { useState } from 'react';
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { useSettingsStore } from '../stores/useSettingsStore';
import { useAppStore } from '../stores/useAppStore';
import { useEmployeeStore } from '../stores/useEmployeeStore';
import { generateAttendanceSummary } from '../utils/reports';
import { JALALI_MONTHS } from '../constants';

const AiAssistantWidget: React.FC = () => {
    const { currentProjectId, selectedYear, selectedMonth } = useAppStore();
    const { getSettings } = useSettingsStore();
    const { getProjectData } = useEmployeeStore();

    const projectId = currentProjectId || 'default';
    const settings = getSettings(projectId);
    const { employees, attendance } = getProjectData(projectId);
    const activeEmployees = employees.filter(e => !e.isArchived);

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
            const summaryData = generateAttendanceSummary(activeEmployees, attendance, settings, selectedYear, selectedMonth);

            if (summaryData.length === 0) {
                setAnalysis("داده‌ای برای تحلیل در ماه جاری وجود ندارد.");
                setIsLoading(false);
                return;
            }
            
            // Format data for better readability in the prompt
            const formattedData = summaryData.map(emp => (
                `- ${emp.lastName} ${emp.firstName}: حضور=${emp.presenceDays}, مرخصی=${emp.leaveDays}, غیبت=${emp.absentDays}, اضافه کاری=${emp.overtimeHours} ساعت`
            )).join('\n');

            const prompt = `
به عنوان یک تحلیلگر منابع انسانی خبره، خلاصه کارکرد ماهانه زیر را تحلیل کن. یک گزارش کوتاه و هوشمندانه به زبان فارسی ارائه بده. نکات کلیدی مانند کارمندان با اضافه کاری بالا، کارمندان با غیبت زیاد، عملکرد کلی تیم و مشکلات احتمالی را برجسته کن. پاسخ خود را به صورت خوانا و با استفاده از لیست‌های نشانه‌دار (bullet points) قالب‌بندی کن.

داده‌های کارکرد برای ماه ${JALALI_MONTHS[selectedMonth-1]} ${selectedYear}:
${formattedData}
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
        <div className="bg-base-100 p-6 rounded-xl shadow-md border-l-4 border-primary">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                    <div>
                        <h2 className="text-xl font-bold">دستیار هوشمند کارکرد</h2>
                        <p className="text-sm text-base-content/70">تحلیل داده‌های ماه {JALALI_MONTHS[selectedMonth - 1]}</p>
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
                <div className="mt-4 pt-4 border-t border-base-300 whitespace-pre-wrap font-sans leading-relaxed">
                    {analysis}
                </div>
            )}

        </div>
    );
};

export default AiAssistantWidget;
