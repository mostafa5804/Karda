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

const DirectorySetupPrompt: React.FC<{ error?: string }> = ({ error }) => {
    const { setView } = useAppStore();
    
    useEffect(() => {
        // Force view to settings if the prompt is shown
        setView('settings');
    }, [setView]);

    return (
        <div className="h-screen w-screen bg-base-200 flex items-center justify-center p-4">
            <div className="max-w-2xl text-center bg-base-100 p-10 rounded-2xl shadow-2xl">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-primary mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
                <h1 className="text-3xl font-bold mb-4">به سامانه کاردا خوش آمدید</h1>
                <p className="mb-6 text-base-content/80">
                    برای شروع و جهت تضمین امنیت و پایداری اطلاعات شما، لطفاً یک پوشه روی کامپیوتر خود برای ذخیره‌سازی داده‌های برنامه (مانند اطلاعات پرسنل، مدارک و فایل‌های پشتیبان) انتخاب کنید.
                    تمام اطلاعات به صورت محلی در این پوشه ذخیره خواهد شد.
                </p>
                {error && <div className="alert alert-error mb-4">{error}</div>}
                <p className="text-sm text-base-content/60">
                    لطفاً به صفحه <strong className="font-bold text-secondary">تنظیمات</strong> بروید و در بخش «مدیریت ذخیره‌سازی» پوشه مورد نظر خود را انتخاب نمایید.
                </p>
            </div>
        </div>
    );
};

const App: React.FC = () => {
    const { view, setView } = useAppStore();
    const { theme } = useThemeStore();
    const [isFsReady, setIsFsReady] = useState(false);
    const [fsError, setFsError] = useState('');

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
    }, [theme]);

    useEffect(() => {
        const initFs = async () => {
            const { success, message } = await fileSystemManager.initialize();
            if (success) {
                setIsFsReady(true);
            } else {
                setFsError(message);
                // The prompt will be shown, and it forces the view to settings
            }
        };
        initFs();
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

    if (!isFsReady && view !== 'settings') {
        return (
            <div dir="rtl" className="flex h-screen bg-base-200 font-sans" style={{ fontFamily: 'Vazirmatn, sans-serif' }}>
                 <Sidebar />
                 <div className="flex-1 flex flex-col overflow-hidden">
                    <AppHeader />
                    <main className="flex-1 overflow-x-hidden overflow-y-auto bg-base-100 p-4 md:p-6">
                         <DirectorySetupPrompt error={fsError} />
                    </main>
                    <Footer />
                </div>
                <ToastContainer />
            </div>
        );
    }

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
