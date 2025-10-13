import React from 'react';
import { useAppStore } from '../stores/useAppStore';
import { View } from '../types';
import { ICONS } from '../constants';

const Sidebar: React.FC = () => {
    const { view, setView } = useAppStore();

    // FIX: Changed icon type from JSX.Element to React.ReactNode to fix "Cannot find namespace 'JSX'" error.
    const navItems: { view: View, label: string, icon: React.ReactNode }[] = [
        { view: 'dashboard', label: 'داشبورد', icon: ICONS.dashboard },
        { view: 'attendance', label: 'حضور و غیاب', icon: ICONS.attendance },
        { view: 'reports', label: 'گزارش‌ها', icon: ICONS.reports },
        { view: 'settings', label: 'تنظیمات', icon: ICONS.settings },
    ];

    return (
        <div className="w-64 bg-gray-800 text-white flex flex-col">
            <div className="h-16 flex items-center justify-center text-2xl font-bold border-b border-gray-700">
                <span>کارمند یار</span>
            </div>
            <nav className="flex-1 px-2 py-4 space-y-2">
                {navItems.map(item => (
                    <button
                        key={item.view}
                        onClick={() => setView(item.view)}
                        className={`w-full flex items-center px-4 py-2 text-right rounded-lg transition-colors duration-200 ${
                            view === item.view
                                ? 'bg-gray-700 text-white'
                                : 'text-gray-400 hover:bg-gray-700 hover:text-white'
                        }`}
                    >
                        {item.icon}
                        <span className="mr-3">{item.label}</span>
                    </button>
                ))}
            </nav>
            <div className="p-4 border-t border-gray-700 text-center text-xs text-gray-500">
                نسخه 1.0.0
            </div>
        </div>
    );
};

export default Sidebar;
