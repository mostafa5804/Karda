import React, { useEffect, useState } from 'react';
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
    const { view } = useAppStore();
    const { theme } = useThemeStore();
    const { setLastAutoBackupTimestamp } = useSettingsStore();
    const addToast = useToastStore(s => s.addToast);
    const [isFsReady, setIsFsReady] = useState(false);
    const [fsError, setFsError] = useState('');

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
    }, [theme]);

    // File System and Auto-backup initialization
    useEffect(() => {
        const initApp = async () => {
            const { success, message } = await fileSystemManager.initialize();
            if (success) {
                setIsFsReady(true);
                // After FS is ready, check for auto-backup
                // We get the project ID from the store directly to avoid stale closures in the single-run useEffect
                const activeProjectId = useAppStore.getState().currentProjectId;
                if (activeProjectId) {
                    const settings = useSettingsStore.getState().getSettings(activeProjectId);
                    const { autoBackupInterval, lastAutoBackupTimestamp = 0 } = settings;
                    if (autoBackupInterval === 'none') return;

                    const now = Date.now();
                    const oneDay = 24 * 60 * 60 * 1000;
                    const oneWeek = 7 * oneDay;
                    let shouldBackup = false;

                    if (autoBackupInterval === 'daily' && now - lastAutoBackupTimestamp > oneDay) {
                        shouldBackup = true;
                    } else if (autoBackupInterval === 'weekly' && now - lastAutoBackupTimestamp > oneWeek) {
                        shouldBackup = true;
                    }
                    
                    if (shouldBackup) {
                        console.log(`Auto-backup triggered for interval: ${autoBackupInterval}`);
                        addToast(`پشتیبان‌گیری خودکار (${autoBackupInterval === 'daily' ? 'روزانه' : 'هفتگی'}) در حال انجام است...`, 'info');
                        const { success: backupSuccess, fileName } = await runBackup({ isAuto: true });
                        if (backupSuccess) {
                            useSettingsStore.getState().setLastAutoBackupTimestamp(activeProjectId, now);
                            addToast(`پشتیبان‌گیری خودکار با موفقیت در فایل "${fileName}" انجام شد.`, 'success');
                        } else {
                            addToast('پشتیبان‌گیری خودکار با خطا مواجه شد.', 'error');
                        }
                    }
                }
            } else {
                setFsError(message);
            }
        };
        initApp();
    }, []); // Run only once on initial app load


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
                return <SettingsPage onFsReady={() => setIsFsReady(true)} />;
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