import React from 'react';
import { useAppStore } from '../stores/useAppStore';
import { View } from '../types';
import { ICONS } from '../constants';

const Sidebar: React.FC = () => {
    const { view, setView, isSidebarCollapsed, toggleSidebar } = useAppStore();

    const navItems: { view: View, label: string, icon: React.ReactNode }[] = [
        { view: 'dashboard', label: 'داشبورد', icon: ICONS.dashboard },
        { view: 'attendance', label: 'حضور و غیاب', icon: ICONS.attendance },
        { view: 'reports', label: 'گزارش‌ها', icon: ICONS.reports },
        { view: 'settings', label: 'تنظیمات', icon: ICONS.settings },
    ];

    return (
        <div className={`bg-gray-800 text-white flex flex-col transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'w-20' : 'w-64'}`}>
            <div className="h-16 flex items-center justify-center px-4 border-b border-gray-700">
                <div className="flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400 flex-shrink-0"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                    <span className={`text-2xl font-bold tracking-wider whitespace-nowrap transition-opacity duration-200 ${isSidebarCollapsed ? 'opacity-0 w-0' : 'opacity-100'}`}>KARDA</span>
                </div>
            </div>
            <nav className="flex-1 px-2 py-4 space-y-2">
                {navItems.map(item => (
                    <button
                        key={item.view}
                        onClick={() => setView(item.view)}
                        title={isSidebarCollapsed ? item.label : ''}
                        className={`w-full flex items-center px-4 py-2.5 text-right rounded-lg transition-colors duration-200 relative ${isSidebarCollapsed ? 'justify-center' : ''} ${
                            view === item.view
                                ? 'bg-gray-700 text-white'
                                : 'text-gray-400 hover:bg-gray-600 hover:text-white'
                        }`}
                    >
                        {view === item.view && !isSidebarCollapsed && <span className="absolute right-0 top-2 bottom-2 w-1 bg-blue-500 rounded-l-full"></span>}
                        {item.icon}
                        <span className={`mr-3 whitespace-nowrap transition-all duration-200 overflow-hidden ${isSidebarCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>{item.label}</span>
                    </button>
                ))}
            </nav>
            <div className="p-2 border-t border-gray-700">
                <button 
                    onClick={toggleSidebar}
                    className="w-full flex items-center justify-center p-3 rounded-lg text-gray-400 hover:bg-gray-600 hover:text-white"
                    title={isSidebarCollapsed ? 'باز کردن منو' : 'بستن منو'}
                >
                    {isSidebarCollapsed ? ICONS.chevronLeft : ICONS.chevronRight}
                </button>
            </div>
        </div>
    );
};

export default Sidebar;
