import React from 'react';
import { useAppStore } from '../stores/useAppStore';
import { useCompanyStore } from '../stores/useCompanyStore';
import { JALALI_MONTHS } from '../constants';

const AppHeader: React.FC = () => {
    const { projects } = useCompanyStore();
    const { selectedYear, selectedMonth, goToPreviousMonth, goToNextMonth, view, currentProjectId, setCurrentProjectId } = useAppStore();

    const currentProject = projects.find(p => p.id === currentProjectId);
    const companyName = currentProject?.companyName || 'KARDA';
    const companyLogo = currentProject?.companyLogo || '';

    return (
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
            <div className="flex items-center gap-4">
                {companyLogo && <img src={companyLogo} alt="لوگوی شرکت" className="h-12 w-auto object-contain"/>}
                <div>
                    <h1 className="text-xl font-semibold text-gray-800">{companyName}</h1>
                    {projects.length > 1 ? (
                        <select
                            value={currentProjectId || ''}
                            onChange={(e) => setCurrentProjectId(e.target.value)}
                            className="select select-ghost select-xs -mr-2"
                        >
                            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    ) : (
                         <p className="text-sm text-gray-500">{currentProject?.name}</p>
                    )}
                </div>
            </div>
            {view === 'attendance' && (
                 <div className="flex items-center space-x-4 space-x-reverse">
                    <button onClick={goToPreviousMonth} className="p-2 rounded-full hover:bg-gray-200 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                    </button>
                    <div className="w-40 text-center text-lg font-semibold">
                       {JALALI_MONTHS[selectedMonth - 1]} {selectedYear}
                    </div>
                    <button onClick={goToNextMonth} className="p-2 rounded-full hover:bg-gray-200 transition-colors">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                    </button>
                </div>
            )}
        </header>
    );
};

export default AppHeader;
