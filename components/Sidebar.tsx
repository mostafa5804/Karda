import React from 'react';
import { useAppStore } from '../stores/useAppStore';
import { View } from '../types';
import { ICONS } from '../constants';
import { useThemeStore } from '../stores/useThemeStore';

const ICONS_THEME = {
    sun: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>,
    moon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>,
};


const Sidebar: React.FC = () => {
    const { view, setView, isSidebarCollapsed, toggleSidebar } = useAppStore();
    const { theme, toggleTheme } = useThemeStore();

    const navItems: { view: View, label: string, icon: React.ReactNode }[] = [
        { view: 'dashboard', label: 'داشبورد', icon: ICONS.dashboard },
        { view: 'attendance', label: 'حضور و غیاب', icon: ICONS.attendance },
        { view: 'personnel', label: 'پرسنل', icon: ICONS.personnel },
        { view: 'reports', label: 'گزارش‌ها', icon: ICONS.reports },
        { view: 'settings', label: 'تنظیمات', icon: ICONS.settings },
    ];

    return (
        <div className={`bg-neutral text-neutral-content flex flex-col transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'w-20' : 'w-64'}`}>
            <div className="h-16 flex items-center justify-center px-4 border-b border-neutral-focus">
                <div className="flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary flex-shrink-0"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line><path d="m9 16 2 2 4-4"></path></svg>
                    <span className={`text-2xl font-bold tracking-wider whitespace-nowrap transition-opacity duration-200 ${isSidebarCollapsed ? 'opacity-0 w-0' : 'opacity-100'}`}>کارکرد</span>
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
                                ? 'bg-neutral-focus text-neutral-content'
                                : 'text-neutral-content/70 hover:bg-neutral-focus/50 hover:text-neutral-content'
                        }`}
                    >
                        {view === item.view && !isSidebarCollapsed && <span className="absolute right-0 top-2 bottom-2 w-1 bg-primary rounded-l-full"></span>}
                        {item.icon}
                        <span className={`mr-3 whitespace-nowrap transition-all duration-200 overflow-hidden ${isSidebarCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>{item.label}</span>
                    </button>
                ))}
            </nav>
            <div className="p-2 border-t border-neutral-focus space-y-1">
                <button
                    onClick={toggleTheme}
                    className="w-full flex items-center justify-center p-3 rounded-lg text-neutral-content/70 hover:bg-neutral-focus/50 hover:text-neutral-content"
                    title={theme === 'light' ? 'حالت تاریک' : 'حالت روشن'}
                >
                   {theme === 'light' ? ICONS_THEME.moon : ICONS_THEME.sun}
                </button>
                <button 
                    onClick={toggleSidebar}
                    className="w-full flex items-center justify-center p-3 rounded-lg text-neutral-content/70 hover:bg-neutral-focus/50 hover:text-neutral-content"
                    title={isSidebarCollapsed ? 'باز کردن منو' : 'بستن منو'}
                >
                    {isSidebarCollapsed ? ICONS.chevronLeft : ICONS.chevronRight}
                </button>
            </div>
        </div>
    );
};

export default Sidebar;