import React, { useState, useRef } from 'react';
import { useSettingsStore } from '../stores/useSettingsStore';
import { useCompanyStore } from '../stores/useCompanyStore';
import { useEmployeeStore } from '../stores/useEmployeeStore';
import { useFinancialStore } from '../stores/useFinancialStore';
import { useAppStore } from '../stores/useAppStore';
import { useToastStore } from '../stores/useToastStore';
import ConfirmationModal from './ConfirmationModal';

const SettingsPage: React.FC = () => {
    const { companyInfo, updateCompanyInfo, addProject, updateProject, removeProject, setCompanyLogo } = useCompanyStore();
    const { currentProjectId, setCurrentProjectId } = useAppStore();
    const addToast = useToastStore(state => state.addToast);
    
    const projectId = currentProjectId || 'default';
    
    const { getSettings, updateSettings, removeProjectSettings } = useSettingsStore();
    const { removeProjectData } = useEmployeeStore();
    const { removeProjectFinancials } = useFinancialStore();
    
    const projectSettings = getSettings(projectId);

    const [companyName, setCompanyName] = useState(companyInfo.companyName);
    const [baseDayCount, setBaseDayCount] = useState(projectSettings.baseDayCount);
    const [newProjectName, setNewProjectName] = useState('');
    const [editingProject, setEditingProject] = useState<{ id: string, name: string } | null>(null);

    // State for confirmation modals
    const [projectToRemove, setProjectToRemove] = useState<{ id: string; name: string } | null>(null);
    const [restoreFile, setRestoreFile] = useState<File | null>(null);
    const restoreFileInputRef = useRef<HTMLInputElement>(null);


    React.useEffect(() => {
        setBaseDayCount(projectSettings.baseDayCount);
    }, [projectId, projectSettings]);

    const handleSaveCompanyInfo = () => {
        updateCompanyInfo({ companyName });
        addToast('اطلاعات شرکت ذخیره شد.', 'success');
    };
    
    const handleSaveSettings = () => {
        updateSettings(projectId, { baseDayCount });
        addToast(`تنظیمات پروژه "${companyInfo.projects.find(p => p.id === projectId)?.name}" ذخیره شد.`, 'success');
    };

    const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const logoDataUrl = e.target?.result as string;
            setCompanyLogo(logoDataUrl);
        };
        reader.readAsDataURL(file);
    };
    
    const handleAddProject = () => {
        if (newProjectName.trim()) {
            const newId = addProject(newProjectName.trim());
            setCurrentProjectId(newId);
            setNewProjectName('');
        }
    };
    
    const handleUpdateProject = () => {
        if (editingProject && editingProject.name.trim()) {
            updateProject(editingProject.id, editingProject.name.trim());
            setEditingProject(null);
        }
    };

    const handleRemoveProject = (id: string, name: string) => {
        if(companyInfo.projects.length <= 1) {
            addToast('نمی‌توانید تنها پروژه موجود را حذف کنید.', 'warning');
            return;
        }
        setProjectToRemove({ id, name });
    };

    const confirmRemoveProject = () => {
        if (!projectToRemove) return;
        const { id, name } = projectToRemove;
        
        removeProject(id);
        removeProjectData(id);
        removeProjectSettings(id);
        removeProjectFinancials(id);
        
        const remainingProject = companyInfo.projects.find(p => p.id !== id);
        setCurrentProjectId(remainingProject ? remainingProject.id : null);
        addToast(`پروژه "${name}" با موفقیت حذف شد.`, 'success');
        setProjectToRemove(null);
    };

    const { getStateForBackup: getEmployeeState, restoreState: restoreEmployeeState } = useEmployeeStore();
    const { getStateForBackup: getSettingsState, restoreState: restoreSettingsState } = useSettingsStore();
    const { getStateForBackup: getCompanyState, restoreState: restoreCompanyState } = useCompanyStore();
    const { getStateForBackup: getFinancialState, restoreState: restoreFinancialState } = useFinancialStore();

    const handleBackup = () => {
        const backupData = {
            company: getCompanyState(),
            employees: getEmployeeState(),
            settings: getSettingsState(),
            financials: getFinancialState(),
            backupVersion: '2.1.0',
            backupDate: new Date().toISOString(),
        };

        const dataStr = JSON.stringify(backupData, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        const fileName = `karmand-yar-backup-${new Date().toLocaleDateString('fa-IR', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-')}.json`;
        linkElement.setAttribute('download', fileName);
        document.body.appendChild(linkElement);
        linkElement.click();
        document.body.removeChild(linkElement);
    };

    const handleRestoreRequest = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        setRestoreFile(file);
    };

    const confirmRestore = () => {
        if (!restoreFile) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target?.result;
                if (typeof text !== 'string') throw new Error('File content is not valid');
                const backupData = JSON.parse(text);

                if (!backupData.employees || !backupData.settings || !backupData.company || !backupData.financials) {
                    throw new Error('فایل پشتیبان معتبر نیست.');
                }

                restoreCompanyState(backupData.company);
                restoreEmployeeState(backupData.employees);
                restoreSettingsState(backupData.settings);
                restoreFinancialState(backupData.financials);

                addToast('اطلاعات با موفقیت بازیابی شد. صفحه مجددا بارگذاری می‌شود.', 'success');
                setTimeout(() => window.location.reload(), 2000);
            } catch (error) {
                console.error('Error restoring data:', error);
                addToast(`خطا در بازیابی اطلاعات: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
            } finally {
                if (restoreFileInputRef.current) restoreFileInputRef.current.value = '';
                setRestoreFile(null);
            }
        };
        reader.readAsText(restoreFile);
    };

    return (
        <div className="space-y-8 max-w-4xl mx-auto">
            {/* Company Info */}
            <div className="bg-white p-6 rounded-lg shadow">
                 <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">اطلاعات شرکت</h2>
                  <div>
                        <label htmlFor="companyName" className="block text-sm font-medium text-gray-700">نام شرکت</label>
                        <input type="text" id="companyName" value={companyName} onChange={(e) => setCompanyName(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
                    </div>
                <div className="mt-6 text-left">
                    <button onClick={handleSaveCompanyInfo} className="btn btn-primary">ذخیره نام شرکت</button>
                </div>
            </div>
            
            {/* Project Management */}
            <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">مدیریت پروژه‌ها</h2>
                <div className="space-y-2">
                    {companyInfo.projects.map(p => (
                        <div key={p.id} className="flex items-center justify-between p-2 rounded-md hover:bg-gray-100">
                            {editingProject?.id === p.id ? (
                                <input type="text" value={editingProject.name} onChange={e => setEditingProject({...editingProject, name: e.target.value})} className="input input-bordered input-sm" autoFocus onBlur={handleUpdateProject} onKeyDown={e => e.key === 'Enter' && handleUpdateProject()} />
                            ) : (
                                <span>{p.name} {p.id === currentProjectId && <span className="badge badge-primary badge-sm ml-2">فعال</span>}</span>
                            )}
                            <div className="space-x-2 space-x-reverse">
                                <button onClick={() => setEditingProject({id: p.id, name: p.name})} className="btn btn-xs btn-ghost">ویرایش</button>
                                <button onClick={() => handleRemoveProject(p.id, p.name)} className="btn btn-xs btn-ghost text-red-500">حذف</button>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="mt-4 pt-4 border-t">
                     <div className="flex items-center gap-2">
                        <input type="text" value={newProjectName} onChange={e => setNewProjectName(e.target.value)} placeholder="نام پروژه جدید" className="input input-bordered w-full max-w-xs" onKeyDown={e => e.key === 'Enter' && handleAddProject()} />
                        <button onClick={handleAddProject} className="btn btn-secondary">افزودن پروژه</button>
                    </div>
                </div>
            </div>

            {/* Logo Upload */}
            <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">لوگوی شرکت</h2>
                 <div className="flex items-center gap-6">
                    {companyInfo.companyLogo ? (<img src={companyInfo.companyLogo} alt="لوگوی شرکت" className="h-24 w-24 object-contain rounded-md border p-1" />) : (<div className="h-24 w-24 bg-gray-100 flex items-center justify-center rounded-md text-gray-400">بدون لوگو</div>)}
                    <div>
                         <label className="block text-sm font-medium text-gray-700 mb-2">برای تغییر یا افزودن لوگو، فایل جدید را انتخاب کنید:</label>
                        <input type="file" accept="image/*" onChange={handleLogoUpload} className="file-input file-input-bordered w-full max-w-xs" />
                    </div>
                </div>
            </div>

            {/* Project-specific Settings */}
             <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">تنظیمات پروژه فعال: "{companyInfo.projects.find(p => p.id === projectId)?.name}"</h2>
                <div className="space-y-4">
                    <div>
                        <label htmlFor="baseDayCount" className="block text-sm font-medium text-gray-700">تعداد روز پایه برای محاسبه حقوق</label>
                        <input type="number" id="baseDayCount" value={baseDayCount} onChange={(e) => setBaseDayCount(Number(e.target.value))}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
                    </div>
                </div>
                <div className="mt-6 text-left">
                    <button onClick={handleSaveSettings} className="btn btn-primary" disabled={!currentProjectId}>ذخیره تنظیمات پروژه</button>
                </div>
            </div>

            {/* Backup and Restore */}
            <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">پشتیبان‌گیری و بازیابی اطلاعات</h2>
                 <p className="text-sm text-gray-600 mb-4">از تمام اطلاعات برنامه (شامل همه پروژه‌ها، کارمندان و تنظیمات) یک فایل پشتیبان تهیه کنید.</p>
                <div className="flex items-center space-x-4 space-x-reverse">
                    <button onClick={handleBackup} className="btn btn-success">دانلود فایل پشتیبان</button>
                    <label className="btn btn-warning">
                        <span>بازیابی از فایل</span>
                        <input ref={restoreFileInputRef} type="file" accept=".json" className="hidden" onChange={handleRestoreRequest} />
                    </label>
                </div>
            </div>

            <ConfirmationModal
                isOpen={!!projectToRemove}
                onClose={() => setProjectToRemove(null)}
                onConfirm={confirmRemoveProject}
                title="تایید حذف پروژه"
                confirmText="حذف دائمی"
                confirmClassName="btn-error"
            >
                <p>آیا از حذف پروژه <strong className="px-1">"{projectToRemove?.name}"</strong> و تمام اطلاعات مرتبط با آن اطمینان دارید؟ <strong className="text-red-600">این عمل غیرقابل بازگشت است.</strong></p>
            </ConfirmationModal>

            <ConfirmationModal
                isOpen={!!restoreFile}
                onClose={() => {
                    setRestoreFile(null);
                    if (restoreFileInputRef.current) restoreFileInputRef.current.value = '';
                }}
                onConfirm={confirmRestore}
                title="تایید بازیابی اطلاعات"
                confirmText="بازیابی کن"
                confirmClassName="btn-warning"
            >
                <p>آیا مطمئن هستید؟ تمام اطلاعات فعلی با اطلاعات فایل پشتیبان <strong className="px-1">({restoreFile?.name})</strong> جایگزین خواهد شد.</p>
            </ConfirmationModal>
        </div>
    );
};

export default SettingsPage;
