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
import { storageManager } from './utils/db';

const App: React.FC = () => {
    const { view } = useAppStore();
    const { theme } = useThemeStore();
    const [isStorageReady, setIsStorageReady] = useState(false);
    const [storageError, setStorageError] = useState('');

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
    }, [theme]);

    // Storage Initialization
    useEffect(() => {
        const initApp = async () => {
            const { success, message } = await storageManager.initialize();
            if (success) {
                setIsStorageReady(true);
            } else {
                setStorageError(message);
            }
        };
        initApp();
    }, []); 

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
        if (!isStorageReady) {
            return (
                <div className="flex flex-col items-center justify-center h-full text-center">
                    {storageError ? (
                        <div className="alert alert-error">
                            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            <span>خطا در راه‌اندازی ذخیره‌سازی: {storageError}</span>
                        </div>
                    ) : (
                        <>
                            <span className="loading loading-lg loading-spinner"></span>
                            <p>در حال آماده‌سازی برنامه...</p>
                        </>
                    )}
                </div>
            )
        }
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
