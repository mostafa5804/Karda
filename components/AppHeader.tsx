import React, { useState, useEffect } from 'react';
import { useAppStore } from '../stores/useAppStore';
import { useCompanyStore } from '../stores/useCompanyStore';
import { JALALI_MONTHS } from '../constants';

const AppHeader: React.FC = () => {
    const { projects } = useCompanyStore();
    const { selectedYear, selectedMonth, goToPreviousMonth, goToNextMonth, setSelectedDate, view, currentProjectId, setCurrentProjectId } = useAppStore();

    const [yearInputValue, setYearInputValue] = useState(selectedYear.toString());

    useEffect(() => {
        setYearInputValue(selectedYear.toString());
    }, [selectedYear]);

    const currentProject = projects.find(p => p.id === currentProjectId);
    const companyName = currentProject?.companyName || 'KARDA';
    const companyLogo = currentProject?.companyLogo || '';

    const handleMonthSelect = (month: number) => {
        setSelectedDate(selectedYear, month);
        // Blur active element to close dropdown
        if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
        }
    };

    const handleYearSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const yearNum = parseInt(yearInputValue, 10);
        if (!isNaN(yearNum) && yearNum > 1300 && yearNum < 1500) {
            setSelectedDate(yearNum, selectedMonth);
        }
        // Blur active element to close dropdown
        if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
        }
    };

    return (
        <header className="h-16 bg-base-100 border-b border-base-300 flex items-center justify-between px-6">
            <div className="flex items-center gap-4">
                {companyLogo && <img src={companyLogo} alt="لوگوی شرکت" className="h-12 w-auto object-contain"/>}
                <div>
                    <h1 className="text-xl font-semibold text-base-content">{companyName}</h1>
                    {projects.length > 1 ? (
                        <select
                            value={currentProjectId || ''}
                            onChange={(e) => setCurrentProjectId(e.target.value)}
                            className="select select-ghost select-xs -mr-2"
                        >
                            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    ) : (
                         <p className="text-sm text-base-content/70">{currentProject?.name}</p>
                    )}
                </div>
            </div>
            {view === 'attendance' && (
                 <div className="flex items-center space-x-2 space-x-reverse">
                    <button onClick={goToPreviousMonth} className="btn btn-ghost btn-circle">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                    </button>
                    
                    <div className="text-center text-lg font-semibold join">
                        {/* Month Dropdown */}
                        <div className="dropdown dropdown-end">
                            <div tabIndex={0} role="button" className="btn btn-ghost join-item">
                                {JALALI_MONTHS[selectedMonth - 1]}
                            </div>
                            <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52 max-h-96 overflow-y-auto">
                                {JALALI_MONTHS.map((monthName, index) => (
                                    <li key={monthName}>
                                        <a onClick={() => handleMonthSelect(index + 1)} className={selectedMonth === index + 1 ? 'bg-base-300' : ''}>
                                            {monthName}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        
                        {/* Year Dropdown */}
                        <div className="dropdown dropdown-end">
                             <div tabIndex={0} role="button" className="btn btn-ghost join-item">
                                {selectedYear}
                            </div>
                            <div tabIndex={0} className="dropdown-content z-[1] card card-compact w-64 p-2 shadow bg-base-100 text-primary-content">
                                <form onSubmit={handleYearSubmit} className="card-body" onClick={(e) => e.stopPropagation()}>
                                     <h3 className="card-title text-base-content !text-base">سال را وارد کنید</h3>
                                     <div className="flex gap-2">
                                        <input 
                                            type="number" 
                                            value={yearInputValue}
                                            onChange={(e) => setYearInputValue(e.target.value)}
                                            className="input input-bordered w-full text-base-content"
                                            placeholder="مثال: 1403"
                                            autoFocus
                                         />
                                         <button type="submit" className="btn btn-primary">برو</button>
                                     </div>
                                </form>
                            </div>
                        </div>
                    </div>

                    <button onClick={goToNextMonth} className="btn btn-ghost btn-circle">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                    </button>
                </div>
            )}
        </header>
    );
};

export default AppHeader;