import React, { useState, useRef, useEffect } from 'react';
import { useSettingsStore } from '../stores/useSettingsStore';
import { useCompanyStore } from '../stores/useCompanyStore';
import { useEmployeeStore } from '../stores/useEmployeeStore';
import { useFinancialStore } from '../stores/useFinancialStore';
import { useAppStore } from '../stores/useAppStore';
import { useToastStore } from '../stores/useToastStore';
import ConfirmationModal from './ConfirmationModal';
import { Settings, CustomAttendanceCode, Document } from '../types';
import { useNotesStore } from '../stores/useNotesStore';
import { useDocumentStore } from '../stores/useDocumentStore';
import { fileSystemManager } from '../utils/db';
import { runBackup } from '../utils/backup';

const CustomCodeEditor: React.FC<{ projectId: string }> = ({ projectId }) => {
    const { getSettings, addCustomCode, updateCustomCode, removeCustomCode } = useSettingsStore();
    const settings = getSettings(projectId);
    const addToast = useToastStore(state => state.addToast);

    const [newCode, setNewCode] = useState({ char: '', description: '', color: '#E0E0E0' });

    const handleAddCode = () => {
        if (!newCode.char || newCode.char.length > 1 || !newCode.description) {
            addToast('کد باید یک حرفی باشد و توضیحات آن نباید خالی باشد.', 'warning');
            return;
        }
        const success = addCustomCode(projectId, newCode);
        if (success) {
            setNewCode({ char: '', description: '', color: '#E0E0E0' });
            addToast('کد جدید با موفقیت افزوده شد.', 'success');
        } else {
            addToast(`کد "${newCode.char}" قبلا استفاده شده است.`, 'error');
        }
    };
    
    return (
        <>
            <h3 className="font-semibold text-gray-700 mb-2">کدهای کارکرد</h3>
             <p className="text-sm text-gray-600 mb-4">
                کدهای تک-حرفی برای ثبت وضعیت‌های مختلف تعریف کنید. کدهای سیستمی (مانند غیبت و مرخصی) قابل حذف نیستند اما می‌توانید رنگ و توضیحات آن‌ها را ویرایش کنید.
             </p>
            <div className="space-y-2 mb-4">
                {settings.customCodes.sort((a,b) => (a.isSystemCode ? -1 : 1) - (b.isSystemCode ? -1 : 1)).map(code => (
                    <div key={code.id} className="grid grid-cols-12 gap-2 items-center">
                        <input type="text" value={code.char} maxLength={1} onChange={e => updateCustomCode(projectId, code.id, { char: e.target.value })} className="input input-bordered input-sm col-span-1 text-center font-bold" style={{backgroundColor: code.color}} disabled={code.isSystemCode} />
                        <input type="text" value={code.description} onChange={e => updateCustomCode(projectId, code.id, { description: e.target.value })} className="input input-bordered input-sm col-span-6" />
                        <input type="color" value={code.color} onChange={e => updateCustomCode(projectId, code.id, { color: e.target.value })} className="input input-sm p-1 col-span-2" />
                        <div className="col-span-3">
                        {!code.isSystemCode ? (
                            <button onClick={() => removeCustomCode(projectId, code.id)} className="btn btn-sm btn-ghost text-red-500">حذف</button>
                        ) : (
                            <span className="text-xs text-gray-400 p-2">سیستمی</span>
                        )}
                        </div>
                    </div>
                ))}
            </div>

             <div className="grid grid-cols-12 gap-2 items-center pt-4 border-t">
                <input type="text" placeholder="کد" value={newCode.char} maxLength={1} onChange={e => setNewCode(c => ({...c, char: e.target.value}))} className="input input-bordered input-sm col-span-1 text-center font-bold" />
                <input type="text" placeholder="توضیحات" value={newCode.description} onChange={e => setNewCode(c => ({...c, description: e.target.value}))} className="input input-bordered input-sm col-span-6" />
                <input type="color" value={newCode.color} onChange={e => setNewCode(c => ({...c, color: e.target.value}))} className="input input-sm p-1 col-span-2" />
                <button onClick={handleAddCode} className="btn btn-sm btn-secondary col-span-3">افزودن</button>
            </div>
        </>
    );
}

interface SettingsPageProps {
    onFsReady: () => void;
}


const SettingsPage: React.FC<SettingsPageProps> = ({ onFsReady }) => {
    const { projects, addProject, updateProject, removeProject } = useCompanyStore();
    const { currentProjectId, setCurrentProjectId } = useAppStore();
    const addToast = useToastStore(state => state.addToast);
    
    const projectId = currentProjectId || 'default';
    const currentProject = projects.find(p => p.id === projectId);
    
    const { getSettings, updateSettings, removeProjectSettings, restoreState: restoreSettingsState } = useSettingsStore();
    const { removeProjectData, restoreState: restoreEmployeeState } = useEmployeeStore();
    const { removeProjectFinancials, restoreState: restoreFinancialState } = useFinancialStore();
    const { removeProjectNotes, restoreState: restoreNotesState } = useNotesStore();
    const { removeProjectDocuments, clearAndRestoreDocuments } = useDocumentStore();
    
    const projectSettings = getSettings(projectId);

    const [companyName, setCompanyName] = useState(currentProject?.companyName || '');
    const [baseDayCount, setBaseDayCount] = useState(projectSettings.baseDayCount);
    const [currency, setCurrency] = useState(projectSettings.currency);
    const [salaryMode, setSalaryMode] = useState(projectSettings.salaryMode);
    const [isAiAssistantEnabled, setIsAiAssistantEnabled] = useState(projectSettings.isAiAssistantEnabled);
    const [geminiApiKey, setGeminiApiKey] = useState(projectSettings.geminiApiKey);
    const [autoBackupInterval, setAutoBackupInterval] = useState(projectSettings.autoBackupInterval);
    
    const [newProjectName, setNewProjectName] = useState('');
    const [editingProject, setEditingProject] = useState<{ id: string, name: string } | null>(null);

    const [projectToRemove, setProjectToRemove] = useState<{ id: string; name: string } | null>(null);
    const [isRestoring, setIsRestoring] = useState(false);
    
    const [isFsSupported, setIsFsSupported] = useState(true);
    const [isFsHandleSet, setIsFsHandleSet] = useState(false);

    useEffect(() => {
        setIsFsSupported(fileSystemManager.isSupported());
        setIsFsHandleSet(fileSystemManager.hasHandle());
    }, []);

    useEffect(() => {
        const project = projects.find(p => p.id === projectId);
        const settings = getSettings(projectId);
        if (project) {
            setCompanyName(project.companyName);
        }
        setBaseDayCount(settings.baseDayCount);
        setCurrency(settings.currency || 'Toman');
        setSalaryMode(settings.salaryMode || 'project');
        setIsAiAssistantEnabled(settings.isAiAssistantEnabled);
        setGeminiApiKey(settings.geminiApiKey);
        setAutoBackupInterval(settings.autoBackupInterval || 'none');
    }, [projectId, projects, getSettings]);

    const handleRequestDir = async () => {
        const success = await fileSystemManager.requestDirectoryPermission();
        if (success) {
            setIsFsHandleSet(true);
            onFsReady();
            addToast("پوشه با موفقیت انتخاب شد و دسترسی لازم تایید گردید.", 'success');
        } else {
            addToast("عملیات انتخاب پوشه لغو شد یا با خطا مواجه گردید.", 'warning');
        }
    };
    
    const handleSaveProjectDetails = () => {
        if (!currentProject) return;
        updateProject(currentProject.id, { companyName });
        updateSettings(projectId, { baseDayCount, currency, salaryMode, autoBackupInterval });
        addToast(`اطلاعات و تنظیمات پروژه "${currentProject.name}" ذخیره شد.`, 'success');
    };

    const handleSaveAiSettings = () => {
        updateSettings(projectId, { isAiAssistantEnabled, geminiApiKey });
        addToast('تنظیمات دستیار هوشمند ذخیره شد.', 'success');
    };

    const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!currentProject) return;
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const logoDataUrl = e.target?.result as string;
            updateProject(currentProject.id, { companyLogo: logoDataUrl });
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
    
    const handleUpdateProjectName = () => {
        if (editingProject && editingProject.name.trim()) {
            updateProject(editingProject.id, { name: editingProject.name.trim() });
            setEditingProject(null);
        }
    };

    const handleRemoveProject = (id: string, name: string) => {
        if(projects.length <= 1) {
            addToast('نمی‌توانید تنها پروژه موجود را حذف کنید.', 'warning');
            return;
        }
        setProjectToRemove({ id, name });
    };

    const confirmRemoveProject = async () => {
        if (!projectToRemove) return;
        const { id, name } = projectToRemove;

        await removeProjectDocuments(id);
        removeProjectData(id);
        removeProjectSettings(id);
        removeProjectFinancials(id);
        removeProjectNotes(id);
        removeProject(id);
        
        const remainingProject = projects.find(p => p.id !== id);
        setCurrentProjectId(remainingProject ? remainingProject.id : null);
        addToast(`پروژه "${name}" با موفقیت حذف شد.`, 'success');
        setProjectToRemove(null);
    };

    const handleBackup = async () => {
        const { success, fileName } = await runBackup({ isAuto: false });
        if (success) {
            addToast(`فایل پشتیبان با نام "${fileName}" در پوشه backups ذخیره شد.`, 'success');
        } else {
            addToast("عملیات پشتیبان‌گیری با خطا مواجه شد.", "error");
        }
    };
    
    const handleRestoreRequest = async () => {
        try {
            const [fileHandle] = await (window as any).showOpenFilePicker({
                types: [{ description: 'Karda Backup Files', accept: { 'application/json': ['.json'] } }],
            });
            const file = await fileHandle.getFile();
            const text = await file.text();
            const backupData = JSON.parse(text);

             if (!backupData.employees || !backupData.settings || !backupData.projects) {
                throw new Error('فایل پشتیبان معتبر نیست.');
            }
            
            setIsRestoring(true);
            (window as any)._restoreData = backupData;

        } catch (err) {
            console.error("Error selecting restore file:", err);
            if (err instanceof DOMException && err.name === 'AbortError') {
                 addToast('عملیات بازیابی لغو شد.', 'info');
            } else {
                addToast('خطا در انتخاب فایل برای بازیابی.', 'error');
            }
        }
    };

    const confirmRestore = async () => {
        const backupData = (window as any)._restoreData;
        if (!backupData) return;

        try {
            restoreCompanyState({ projects: backupData.projects });
            restoreEmployeeState(backupData.employees);
            restoreSettingsState(backupData.settings);
            restoreFinancialState(backupData.financials || { projectFinancials: {} });
            restoreNotesState(backupData.notes || { projectNotes: {} });
            
            await clearAndRestoreDocuments(backupData.documents || []);

            addToast('اطلاعات با موفقیت بازیابی شد. صفحه مجددا بارگذاری می‌شود.', 'success');
            setTimeout(() => window.location.reload(), 2000);
        } catch(error) {
            console.error("Restore failed:", error);
            addToast(`بازیابی اطلاعات با خطا مواجه شد: ${error instanceof Error ? error.message : ''}`, "error");
        } finally {
            setIsRestoring(false);
            delete (window as any)._restoreData;
        }
    };

    const { restoreState: restoreCompanyState } = useCompanyStore();


    return (
        <div className="space-y-4 max-w-4xl mx-auto">
             <details className="collapse collapse-arrow bg-base-100 shadow-sm" open>
                <summary className="collapse-title text-xl font-bold">مدیریت ذخیره‌سازی</summary>
                <div className="collapse-content">
                     {!isFsSupported ? (
                        <div className="alert alert-error">مرورگر شما از قابلیت ذخیره‌سازی مستقیم پشتیبانی نمی‌کند. لطفاً از آخرین نسخه کروم، اج یا اپرا استفاده کنید.</div>
                     ) : (
                        <div className="p-4 bg-base-200 rounded-lg flex items-center justify-between">
                            <div>
                                <h3 className="font-bold">پوشه ذخیره‌سازی داده‌ها</h3>
                                {isFsHandleSet ? (
                                    <p className="text-sm text-green-600">پوشه با موفقیت انتخاب شده و دسترسی لازم برقرار است.</p>
                                ) : (
                                    <p className="text-sm text-yellow-600">هنوز هیچ پوشه‌ای انتخاب نشده است. برای استفاده از برنامه، انتخاب پوشه الزامی است.</p>
                                )}
                            </div>
                            <button className="btn btn-primary" onClick={handleRequestDir}>
                                {isFsHandleSet ? 'تغییر پوشه' : 'انتخاب پوشه'}
                            </button>
                        </div>
                     )}
                </div>
            </details>

            <details className="collapse collapse-arrow bg-base-100 shadow-sm" open>
                <summary className="collapse-title text-xl font-bold">مدیریت پروژه‌ها</summary>
                <div className="collapse-content">
                    <div className="space-y-2">
                        {projects.map(p => (
                            <div key={p.id} className="flex items-center justify-between p-2 rounded-md hover:bg-base-200">
                                {editingProject?.id === p.id ? (
                                    <input type="text" value={editingProject.name} onChange={e => setEditingProject({...editingProject, name: e.target.value})} className="input input-bordered input-sm" autoFocus onBlur={handleUpdateProjectName} onKeyDown={e => e.key === 'Enter' && handleUpdateProjectName()} />
                                ) : (
                                    <label className="flex items-center cursor-pointer">
                                        <input type="radio" name="currentProject" className="radio radio-sm" checked={p.id === currentProjectId} onChange={() => setCurrentProjectId(p.id)} />
                                        <span className="mr-2">{p.name}</span>
                                    </label>
                                )}
                                <div className="space-x-2 space-x-reverse">
                                    <button onClick={() => setEditingProject({id: p.id, name: p.name})} className="btn btn-xs btn-ghost">ویرایش نام</button>
                                    <button onClick={() => handleRemoveProject(p.id, p.name)} className="btn btn-xs btn-ghost text-red-500">حذف پروژه</button>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="mt-4 pt-4 border-t border-base-300">
                        <div className="flex items-center gap-2">
                            <input type="text" value={newProjectName} onChange={e => setNewProjectName(e.target.value)} placeholder="نام پروژه جدید" className="input input-bordered w-full max-w-xs" onKeyDown={e => e.key === 'Enter' && handleAddProject()} />
                            <button onClick={handleAddProject} className="btn btn-secondary">افزودن پروژه جدید</button>
                        </div>
                    </div>
                </div>
            </details>

            {currentProject && (
            <>
            <details className="collapse collapse-arrow bg-base-100 shadow-sm">
                <summary className="collapse-title text-xl font-bold">اطلاعات و تنظیمات پروژه: "{currentProject.name}"</summary>
                <div className="collapse-content">
                    <div className="space-y-4 pt-2">
                        <div>
                            <label htmlFor="companyName" className="block text-sm font-medium">نام شرکت/پروژه</label>
                            <input type="text" id="companyName" value={companyName} onChange={(e) => setCompanyName(e.target.value)}
                                className="mt-1 block w-full px-3 py-2 input input-bordered" />
                        </div>
                        <div>
                            <label htmlFor="baseDayCount" className="block text-sm font-medium">تعداد روز پایه برای محاسبه حقوق</label>
                            <input type="number" id="baseDayCount" value={baseDayCount} onChange={(e) => setBaseDayCount(Number(e.target.value))}
                                className="mt-1 block w-full input input-bordered" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium">واحد پول</label>
                            <div className="mt-2 flex gap-4">
                                <label className="flex items-center cursor-pointer">
                                    <input type="radio" name="currency" value="Toman" checked={currency === 'Toman'} onChange={(e) => setCurrency(e.target.value as Settings['currency'])} className="radio radio-primary" />
                                    <span className="label-text mr-2">تومان</span> 
                                </label>
                                <label className="flex items-center cursor-pointer">
                                    <input type="radio" name="currency" value="Rial" checked={currency === 'Rial'} onChange={(e) => setCurrency(e.target.value as Settings['currency'])} className="radio radio-primary" />
                                    <span className="label-text mr-2">ریال</span> 
                                </label>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium">روش محاسبه حقوق</label>
                            <div className="mt-2 flex gap-4">
                                <label className="flex items-center cursor-pointer">
                                    <input type="radio" name="salaryMode" value="project" checked={salaryMode === 'project'} onChange={(e) => setSalaryMode(e.target.value as Settings['salaryMode'])} className="radio radio-primary" />
                                    <span className="label-text mr-2">پروژه‌ای (ساده)</span> 
                                </label>
                                <label className="flex items-center cursor-pointer">
                                    <input type="radio" name="salaryMode" value="official" checked={salaryMode === 'official'} onChange={(e) => setSalaryMode(e.target.value as Settings['salaryMode'])} className="radio radio-primary" />
                                    <span className="label-text mr-2">رسمی (قانون کار)</span> 
                                </label>
                            </div>
                        </div>
                        <div className="flex items-center gap-6 pt-4 border-t border-base-300">
                            {currentProject.companyLogo ? (<img src={currentProject.companyLogo} alt="لوگوی شرکت" className="h-24 w-24 object-contain rounded-md border p-1" />) : (<div className="h-24 w-24 bg-base-200 flex items-center justify-center rounded-md text-base-content/50">بدون لوگو</div>)}
                            <div>
                                <label className="block text-sm font-medium mb-2">تغییر یا افزودن لوگو:</label>
                                <input type="file" accept="image/*" onChange={handleLogoUpload} className="file-input file-input-bordered w-full max-w-xs" />
                            </div>
                        </div>
                    </div>
                    <div className="mt-6 text-left">
                        <button onClick={handleSaveProjectDetails} className="btn btn-primary">ذخیره تنظیمات پروژه</button>
                    </div>
                </div>
            </details>
            
            <details className="collapse collapse-arrow bg-base-100 shadow-sm">
                <summary className="collapse-title text-xl font-bold">دستیار هوشمند (Gemini AI)</summary>
                <div className="collapse-content">
                    <div className="space-y-4 pt-2">
                        <div className="form-control">
                            <label className="label cursor-pointer">
                                <span className="label-text">فعال‌سازی دستیار هوشمند در داشبورد</span> 
                                <input type="checkbox" className="toggle toggle-primary" checked={isAiAssistantEnabled} onChange={e => setIsAiAssistantEnabled(e.target.checked)} />
                            </label>
                        </div>
                        <div>
                            <label htmlFor="geminiApiKey" className="block text-sm font-medium">کلید API Gemini</label>
                            <input type="password" id="geminiApiKey" value={geminiApiKey} onChange={(e) => setGeminiApiKey(e.target.value)}
                                className="mt-1 block w-full input input-bordered" />
                            <div className="text-xs text-base-content/60 mt-2">
                                <p>برای استفاده از این قابلیت، به یک کلید API از Google AI Studio نیاز دارید.</p>
                                <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="link link-info">برای دریافت کلید API خود اینجا کلیک کنید.</a>
                            </div>
                        </div>
                    </div>
                     <div className="mt-6 text-left">
                        <button onClick={handleSaveAiSettings} className="btn btn-primary">ذخیره تنظیمات دستیار</button>
                    </div>
                </div>
            </details>

            <details className="collapse collapse-arrow bg-base-100 shadow-sm">
                <summary className="collapse-title text-xl font-bold">مدیریت کدهای اختصاری</summary>
                <div className="collapse-content pt-2">
                    <CustomCodeEditor projectId={projectId} />
                </div>
            </details>
            </>
            )}

            <details className="collapse collapse-arrow bg-base-100 shadow-sm">
                <summary className="collapse-title text-xl font-bold">پشتیبان‌گیری و بازیابی</summary>
                <div className="collapse-content">
                    <div className="space-y-4">
                         <p className="text-sm text-base-content/70">
                            فایل‌های پشتیبان در زیرپوشه‌ای به نام `backups` در پوشه اصلی برنامه شما ذخیره می‌شوند. برای بازیابی، فایل مورد نظر را از سیستم خود انتخاب کنید.
                        </p>
                        <div className="form-control p-4 border rounded-lg">
                            <label className="label font-semibold"><span className="label-text">پشتیبان‌گیری خودکار</span></label>
                             <div className="flex gap-4">
                                <label className="flex items-center cursor-pointer">
                                    <input type="radio" name="autoBackup" value="none" checked={autoBackupInterval === 'none'} onChange={(e) => setAutoBackupInterval(e.target.value as Settings['autoBackupInterval'])} className="radio radio-sm" />
                                    <span className="label-text mr-2">هرگز</span> 
                                </label>
                                <label className="flex items-center cursor-pointer">
                                    <input type="radio" name="autoBackup" value="daily" checked={autoBackupInterval === 'daily'} onChange={(e) => setAutoBackupInterval(e.target.value as Settings['autoBackupInterval'])} className="radio radio-sm" />
                                    <span className="label-text mr-2">روزانه</span> 
                                </label>
                                <label className="flex items-center cursor-pointer">
                                    <input type="radio" name="autoBackup" value="weekly" checked={autoBackupInterval === 'weekly'} onChange={(e) => setAutoBackupInterval(e.target.value as Settings['autoBackupInterval'])} className="radio radio-sm" />
                                    <span className="label-text mr-2">هفتگی</span> 
                                </label>
                            </div>
                            {projectSettings.lastAutoBackupTimestamp ? (
                                <p className="text-xs text-base-content/60 mt-2">آخرین پشتیبان‌گیری خودکار: {new Date(projectSettings.lastAutoBackupTimestamp).toLocaleString('fa-IR')}</p>
                            ) : null}
                        </div>
                    </div>
                   
                    <div className="flex items-center space-x-4 space-x-reverse mt-6 pt-4 border-t border-base-300">
                        <button onClick={handleBackup} className="btn btn-success" disabled={!isFsHandleSet}>ایجاد فایل پشتیبان دستی</button>
                        <button onClick={handleRestoreRequest} className="btn btn-warning" disabled={!isFsHandleSet}>بازیابی از فایل</button>
                    </div>
                </div>
            </details>

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
                isOpen={isRestoring}
                onClose={() => setIsRestoring(false)}
                onConfirm={confirmRestore}
                title="تایید بازیابی اطلاعات"
                confirmText="بازیابی کن"
                confirmClassName="btn-warning"
            >
                <p>آیا مطمئن هستید؟ تمام اطلاعات فعلی برنامه با اطلاعات فایل پشتیبان جایگزین خواهد شد.</p>
            </ConfirmationModal>
        </div>
    );
};

export default SettingsPage;
