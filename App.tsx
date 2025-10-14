import React, { useEffect } from 'react';
import Sidebar from './components/Sidebar';
import AppHeader from './components/AppHeader';
import AttendanceTable from './components/AttendanceTable';
import Dashboard from './components/Dashboard';
import Reports from './components/Reports';
import SettingsPage from './components/SettingsPage';
import PersonnelPage from './components/PersonnelPage';
import { useAppStore } from './stores/useAppStore';
import ToastContainer from './components/ToastContainer';
import { useThemeStore } from './stores/useThemeStore';
import Footer from './components/Footer';
import { fileSystemManager } from './utils/db';
import { useSettingsStore } from './stores/useSettingsStore';
import { runBackup } from './utils/backup';
import { useToastStore } from './stores/useToastStore';

const App: React.FC = () => {
    const { view, currentProjectId, isFileSystemReady, setIsFileSystemReady } = useAppStore();
    const { theme } = useThemeStore();
    const { getSettings, setLastAutoBackupTimestamp } = useSettingsStore();
    const addToast = useToastStore(s => s.addToast);
    
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
    }, [theme]);

    // Handle Initialization
    useEffect(() => {
        const initApp = async () => {
            const { success } = await fileSystemManager.initialize();
            if (success) {
                setIsFileSystemReady(true);
            }
        };
        initApp();
    }, [setIsFileSystemReady]); 

    // Auto-backup logic
    useEffect(() => {
        if (!isFileSystemReady || !currentProjectId) return;

        const settings = getSettings(currentProjectId);
        const { autoBackupInterval, lastAutoBackupTimestamp = 0 } = settings;

        if (autoBackupInterval === 'none') return;

        const now = Date.now();
        const oneDay = 24 * 60 * 60 * 1000;
        const oneWeek = 7 * oneDay;

        let intervalMs = 0;
        if (autoBackupInterval === 'daily') intervalMs = oneDay;
        if (autoBackupInterval === 'weekly') intervalMs = oneWeek;
        
        if (intervalMs > 0 && now - lastAutoBackupTimestamp > intervalMs) {
            console.log('Performing automatic backup...');
            runBackup({ isAuto: true }).then(({ success, fileName }) => {
                if (success) {
                    addToast(`پشتیبان‌گیری خودکار با نام "${fileName}" انجام شد.`, 'info');
                    setLastAutoBackupTimestamp(currentProjectId, now);
                } else {
                    addToast('پشتیبان‌گیری خودکار با خطا مواجه شد.', 'warning');
                }
            });
        }

    }, [isFileSystemReady, currentProjectId, getSettings, setLastAutoBackupTimestamp, addToast]);


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
            case 'personnel':
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
                <Footer />
            </div>
            <ToastContainer />
        </div>
    );
};

export default App;