import React, { useEffect } from 'react';
import Sidebar from './components/Sidebar';
import AppHeader from './components/AppHeader';
import AttendanceTable from './components/AttendanceTable';
import Dashboard from './components/Dashboard';
import Reports from './components/Reports';
import SettingsPage from './components/SettingsPage';
import PersonnelPage from './components/PersonnelPage'; // Import new component
import { useAppStore } from './stores/useAppStore';
import ToastContainer from './components/ToastContainer';
import { useThemeStore } from './stores/useThemeStore';

const App: React.FC = () => {
    const { view } = useAppStore();
    const { theme } = useThemeStore();

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
    }, [theme]);

    // Register Service Worker for offline capabilities
    useEffect(() => {
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js')
                    .then(registration => {
                        console.log('ServiceWorker registration successful with scope: ', registration.scope);
                    })
                    .catch(err => {
                        console.log('ServiceWorker registration failed: ', err);
                    });
            });
        }
    }, []);


    const renderView = () => {
        switch (view) {
            case 'dashboard':
                return <Dashboard />;
            case 'attendance':
                return <AttendanceTable />;
            case 'personnel': // Add new case
                return <PersonnelPage />;
            case 'reports':
                return <Reports />;
            case 'settings':
                return <SettingsPage />;
            default:
                return <Dashboard />;
        }
    };

    return (
        <div dir="rtl" className="flex h-screen bg-base-200 font-sans" style={{ fontFamily: 'Vazirmatn, sans-serif' }}>
            <Sidebar />
            <div className="flex-1 flex flex-col overflow-hidden">
                <AppHeader />
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-base-100 p-4 md:p-6">
                    {renderView()}
                </main>
            </div>
            <ToastContainer />
        </div>
    );
};

export default App;
