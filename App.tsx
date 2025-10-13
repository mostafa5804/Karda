import React from 'react';
import Sidebar from './components/Sidebar';
import AppHeader from './components/AppHeader';
import AttendanceTable from './components/AttendanceTable';
import Dashboard from './components/Dashboard';
import Reports from './components/Reports';
import SettingsPage from './components/SettingsPage';
import { useAppStore } from './stores/useAppStore';
import ToastContainer from './components/ToastContainer';

const App: React.FC = () => {
    const { view } = useAppStore();

    const renderView = () => {
        switch (view) {
            case 'dashboard':
                return <Dashboard />;
            case 'attendance':
                return <AttendanceTable />;
            case 'reports':
                return <Reports />;
            case 'settings':
                return <SettingsPage />;
            default:
                return <Dashboard />;
        }
    };

    return (
        <div dir="rtl" className="flex h-screen bg-gray-100 font-sans" style={{ fontFamily: 'Vazirmatn, sans-serif' }}>
            <Sidebar />
            <div className="flex-1 flex flex-col overflow-hidden">
                <AppHeader />
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-4 md:p-6">
                    {renderView()}
                </main>
            </div>
            <ToastContainer />
        </div>
    );
};

export default App;