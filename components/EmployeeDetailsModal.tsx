import React, { useState, useEffect, useRef } from 'react';
import { Employee, Document } from '../types';
import { useAppStore } from '../stores/useAppStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { formatCurrency } from '../utils/currency';
import { useDocumentStore } from '../stores/useDocumentStore';
import { useToastStore } from '../stores/useToastStore';

const ICONS = {
    upload: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>,
    download: <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>,
    delete: <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>,
};


// Sub-component for managing documents
const DocumentManager: React.FC<{ employee: Employee; projectId: string }> = ({ employee, projectId }) => {
    const { addDocument, getDocumentsForEmployee, deleteDocument, getDownloadableFile } = useDocumentStore();
    const documents = getDocumentsForEmployee(projectId, employee.id).sort((a,b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
    const [isUploading, setIsUploading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const addToast = useToastStore(state => state.addToast);

    const handleFileUpload = async (file: File | null | undefined) => {
        if (!file) return;

        setIsUploading(true);
        try {
            const success = await addDocument({
                projectId,
                employeeId: employee.id,
                fileName: file.name,
                fileType: file.type,
                fileSize: file.size,
            }, file);
            
            if (success) {
                addToast(`فایل "${file.name}" با موفقیت بارگذاری شد.`, 'success');
            } else {
                 throw new Error("Failed to save file to disk.");
            }
        } catch (error) {
            console.error("Upload failed:", error);
            addToast("بارگذاری فایل با خطا مواجه شد.", "error");
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };
    
    const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        await handleFileUpload(file);
    };

    const handleDelete = async (doc: Document) => {
        if (window.confirm(`آیا از حذف فایل "${doc.fileName}" اطمینان دارید؟`)) {
            try {
                await deleteDocument(doc);
                addToast(`فایل "${doc.fileName}" حذف شد.`, 'success');
            } catch (error) {
                console.error("Delete failed:", error);
                addToast("حذف فایل با خطا مواجه شد.", "error");
            }
        }
    };

    const handleDownload = async (doc: Document) => {
        const file = await getDownloadableFile(doc);
        if (file) {
            const url = URL.createObjectURL(file);
            const link = document.createElement('a');
            link.href = url;
            link.download = doc.fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } else {
            addToast("فایل یافت نشد یا دسترسی به آن ممکن نیست.", "error");
        }
    };

    const formatBytes = (bytes: number, decimals = 2) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => e.preventDefault();
    const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); setIsDragging(true); };
    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); setIsDragging(false); };
    const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        await handleFileUpload(file);
    };

    return (
        <div className="p-4 space-y-4">
            <div 
                className={`relative p-4 border-2 border-dashed rounded-lg transition-colors text-center cursor-pointer ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}`}
                onClick={() => !isUploading && fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                <input type="file" className="hidden" ref={fileInputRef} onChange={handleFileSelect} multiple={false} disabled={isUploading}/>
                <div className="flex flex-col items-center justify-center pointer-events-none">
                    {ICONS.upload}
                    <p className="mt-2 text-sm text-gray-600">
                        فایل مدرک را به اینجا بکشید و رها کنید، یا
                        <span className="link link-primary mx-1">
                            انتخاب کنید
                        </span>
                    </p>
                    {isUploading && <div className="mt-2"><span className="loading loading-spinner text-secondary"></span><p>در حال بارگذاری...</p></div>}
                </div>
            </div>
            
            <div className="divider my-0">مدارک بارگذاری شده</div>
            
            {documents.length === 0 && (
                <div className="text-center text-gray-500 p-4">هیچ مدرکی برای این کارمند بارگذاری نشده است.</div>
            )}
            
            {documents.length > 0 && (
                <ul className="space-y-2 max-h-64 overflow-y-auto">
                    {documents.map(doc => (
                        <li key={doc.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg hover:bg-gray-100">
                            <div>
                                <p className="font-semibold">{doc.fileName}</p>
                                <p className="text-xs text-gray-500">{formatBytes(doc.fileSize)} - بارگذاری در: {new Date(doc.uploadedAt).toLocaleDateString('fa-IR')}</p>
                            </div>
                            <div className="space-x-2 space-x-reverse">
                                <button onClick={() => handleDownload(doc)} className="btn btn-xs btn-ghost" title="دانلود">{ICONS.download}</button>
                                <button onClick={() => handleDelete(doc)} className="btn btn-xs btn-ghost text-red-500" title="حذف">{ICONS.delete}</button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};


const initialEmployeeState: Omit<Employee, 'id' | 'isArchived'> = {
    firstName: '',
    lastName: '',
    position: '',
    monthlySalary: 0,
    fatherName: '',
    nationalId: '',
    phone: '',
    maritalStatus: 'single',
    childrenCount: 0,
    militaryServiceStatus: 'not_applicable',
    address: '',
    iban: '',
    contractStartDate: '',
    contractEndDate: '',
    settlementDate: '',
    baseSalary: 0,
    housingAllowance: 0,
    childAllowance: 0,
    otherBenefits: 0,
};

interface EmployeeDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (employeeData: Omit<Employee, 'id' | 'isArchived'>, employeeId?: string) => void;
    employee: Employee | undefined;
}

const EmployeeDetailsModal: React.FC<EmployeeDetailsModalProps> = ({ isOpen, onClose, onSave, employee }) => {
    const [formData, setFormData] = useState(initialEmployeeState);
    const [activeTab, setActiveTab] = useState('info');
    const dialogRef = useRef<HTMLDialogElement>(null);
    const { currentProjectId } = useAppStore();
    const { getSettings } = useSettingsStore();
    const settings = getSettings(currentProjectId || 'default');

    useEffect(() => {
        if (employee) {
            setFormData({
                firstName: employee.firstName || '',
                lastName: employee.lastName || '',
                position: employee.position || '',
                monthlySalary: employee.monthlySalary || 0,
                fatherName: employee.fatherName || '',
                nationalId: employee.nationalId || '',
                phone: employee.phone || '',
                maritalStatus: employee.maritalStatus || 'single',
                childrenCount: employee.childrenCount || 0,
                militaryServiceStatus: employee.militaryServiceStatus || 'not_applicable',
                address: employee.address || '',
                iban: employee.iban || '',
                contractStartDate: employee.contractStartDate || '',
                contractEndDate: employee.contractEndDate || '',
                settlementDate: employee.settlementDate || '',
                baseSalary: employee.baseSalary || 0,
                housingAllowance: employee.housingAllowance || 0,
                childAllowance: employee.childAllowance || 0,
                otherBenefits: employee.otherBenefits || 0,
            });
        } else {
            setFormData(initialEmployeeState);
        }
        setActiveTab('info'); // Reset to first tab on open
    }, [employee, isOpen]);

    useEffect(() => {
        const dialog = dialogRef.current;
        if (isOpen) {
            dialog?.showModal();
        } else {
            dialog?.close();
        }
    }, [isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        const numValue = parseInt(value.replace(/,/g, ''), 10);
        setFormData(prev => ({ ...prev, [name]: isNaN(numValue) ? 0 : numValue }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const dataToSave = { ...formData };
        if (settings.salaryMode === 'official') {
            dataToSave.monthlySalary = 
                (formData.baseSalary || 0) + 
                (formData.housingAllowance || 0) +
                (formData.childAllowance || 0) +
                (formData.otherBenefits || 0);
        }
        onSave(dataToSave, employee?.id);
    };

    const totalOfficialSalary = (formData.baseSalary || 0) + (formData.housingAllowance || 0) + (formData.childAllowance || 0) + (formData.otherBenefits || 0);

    return (
        <dialog ref={dialogRef} className="modal" onCancel={onClose}>
            <div className="modal-box w-11/12 max-w-4xl">
                <h3 className="font-bold text-lg mb-4">
                    {employee ? `ویرایش اطلاعات ${employee.firstName} ${employee.lastName}` : 'افزودن کارمند جدید'}
                </h3>

                <div role="tablist" className="tabs tabs-lifted -mb-px">
                    <a role="tab" className={`tab ${activeTab === 'info' ? 'tab-active' : ''}`} onClick={() => setActiveTab('info')}>اطلاعات پایه</a>
                    <a role="tab" className={`tab ${activeTab === 'docs' ? 'tab-active' : ''}`} onClick={() => setActiveTab('docs')} disabled={!employee}>مدارک</a>
                </div>
                
                <div className="border-base-300 bg-base-100 rounded-b-box border-t-0 border p-2">
                    {activeTab === 'info' && (
                        <form onSubmit={handleSubmit}>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-h-[60vh] overflow-y-auto p-2">
                                {/* Basic Info */}
                                <div className="form-control">
                                    <label className="label"><span className="label-text">نام خانوادگی *</span></label>
                                    <input type="text" name="lastName" value={formData.lastName} onChange={handleChange} className="input input-bordered" required />
                                </div>
                                <div className="form-control">
                                    <label className="label"><span className="label-text">نام *</span></label>
                                    <input type="text" name="firstName" value={formData.firstName} onChange={handleChange} className="input input-bordered" required />
                                </div>
                                <div className="form-control">
                                    <label className="label"><span className="label-text">نام پدر</span></label>
                                    <input type="text" name="fatherName" value={formData.fatherName} onChange={handleChange} className="input input-bordered" />
                                </div>
                                <div className="form-control">
                                    <label className="label"><span className="label-text">کد ملی</span></label>
                                    <input type="text" name="nationalId" value={formData.nationalId} onChange={handleChange} className="input input-bordered" />
                                </div>
                                <div className="form-control">
                                    <label className="label"><span className="label-text">شماره تلفن</span></label>
                                    <input type="tel" name="phone" value={formData.phone} onChange={handleChange} className="input input-bordered" />
                                </div>

                                {/* Marital & Military Status */}
                                <div className="form-control">
                                    <label className="label"><span className="label-text">وضعیت تاهل</span></label>
                                    <select name="maritalStatus" value={formData.maritalStatus} onChange={handleChange} className="select select-bordered">
                                        <option value="single">مجرد</option>
                                        <option value="married">متاهل</option>
                                    </select>
                                </div>
                                {formData.maritalStatus === 'married' && (
                                    <div className="form-control">
                                        <label className="label"><span className="label-text">تعداد فرزندان</span></label>
                                        <input type="number" name="childrenCount" value={formData.childrenCount} onChange={handleNumberChange} className="input input-bordered" min="0" />
                                    </div>
                                )}
                                <div className="form-control">
                                    <label className="label"><span className="label-text">وضعیت خدمت سربازی</span></label>
                                    <select name="militaryServiceStatus" value={formData.militaryServiceStatus} onChange={handleChange} className="select select-bordered">
                                        <option value="not_applicable">مشمول نمی‌شود</option>
                                        <option value="completed">کارت پایان خدمت</option>
                                        <option value="exempt">کارت معافیت</option>
                                        <option value="pending">در حال خدمت / مشمول</option>
                                    </select>
                                </div>
                                
                                {/* Job Info */}
                                <div className="form-control md:col-span-3"><div className="divider">اطلاعات شغلی و مالی</div></div>

                                <div className="form-control">
                                    <label className="label"><span className="label-text">سمت شغلی *</span></label>
                                    <input type="text" name="position" value={formData.position} onChange={handleChange} className="input input-bordered" required />
                                </div>

                                {settings.salaryMode === 'project' ? (
                                    <div className="form-control">
                                        <label className="label"><span className="label-text">حقوق ماهانه ({settings.currency === 'Rial' ? 'ریال' : 'تومان'}) *</span></label>
                                        <input type="text" name="monthlySalary" value={(formData.monthlySalary || 0).toLocaleString('fa-IR')} onChange={handleNumberChange} className="input input-bordered" required />
                                    </div>
                                ) : (
                                    <>
                                        <div className="form-control">
                                            <label className="label"><span className="label-text">حقوق پایه ({settings.currency === 'Rial' ? 'ریال' : 'تومان'})</span></label>
                                            <input type="text" name="baseSalary" value={(formData.baseSalary || 0).toLocaleString('fa-IR')} onChange={handleNumberChange} className="input input-bordered" />
                                        </div>
                                        <div className="form-control">
                                            <label className="label"><span className="label-text">حق مسکن ({settings.currency === 'Rial' ? 'ریال' : 'تومان'})</span></label>
                                            <input type="text" name="housingAllowance" value={(formData.housingAllowance || 0).toLocaleString('fa-IR')} onChange={handleNumberChange} className="input input-bordered" />
                                        </div>
                                        <div className="form-control">
                                            <label className="label"><span className="label-text">حق اولاد ({settings.currency === 'Rial' ? 'ریال' : 'تومان'})</span></label>
                                            <input type="text" name="childAllowance" value={(formData.childAllowance || 0).toLocaleString('fa-IR')} onChange={handleNumberChange} className="input input-bordered" />
                                        </div>
                                        <div className="form-control">
                                            <label className="label"><span className="label-text">سایر مزایا ({settings.currency === 'Rial' ? 'ریال' : 'تومان'})</span></label>
                                            <input type="text" name="otherBenefits" value={(formData.otherBenefits || 0).toLocaleString('fa-IR')} onChange={handleNumberChange} className="input input-bordered" />
                                        </div>
                                        <div className="form-control">
                                            <label className="label"><span className="label-text">حقوق ماهانه کل (محاسباتی)</span></label>
                                            <input type="text" value={formatCurrency(totalOfficialSalary, settings.currency, true)} className="input input-bordered bg-gray-100" readOnly />
                                        </div>
                                    </>
                                )}

                                <div className="form-control">
                                    <label className="label"><span className="label-text">شماره شبا (بدون IR)</span></label>
                                    <input type="text" name="iban" value={formData.iban} onChange={handleChange} className="input input-bordered" />
                                </div>

                                <div className="form-control">
                                    <label className="label"><span className="label-text">تاریخ شروع قرارداد</span></label>
                                    <input type="text" name="contractStartDate" value={formData.contractStartDate} onChange={handleChange} placeholder="مثال: 1403-01-15" className="input input-bordered" />
                                </div>
                                <div className="form-control">
                                    <label className="label"><span className="label-text">تاریخ پایان قرارداد</span></label>
                                    <input type="text" name="contractEndDate" value={formData.contractEndDate} onChange={handleChange} placeholder="مثال: 1404-01-14" className="input input-bordered" />
                                </div>
                                 <div className="form-control">
                                    <label className="label"><span className="label-text">تاریخ تسویه</span></label>
                                    <input type="text" name="settlementDate" value={formData.settlementDate} onChange={handleChange} placeholder="از طریق جدول کارکرد ثبت می‌شود" className="input input-bordered" />
                                </div>
                                
                                <div className="form-control md:col-span-3">
                                    <label className="label"><span className="label-text">آدرس</span></label>
                                    <textarea name="address" value={formData.address} onChange={handleChange} className="textarea textarea-bordered h-24"></textarea>
                                </div>
                            </div>
                            <div className="modal-action space-x-2 space-x-reverse pt-4 border-t mt-2">
                                <button type="button" onClick={onClose} className="btn">انصراف</button>
                                <button type="submit" className="btn btn-primary">ذخیره</button>
                            </div>
                        </form>
                    )}
                    
                    {activeTab === 'docs' && employee && (
                         <DocumentManager employee={employee} projectId={currentProjectId || 'default'} />
                    )}
                </div>

            </div>
            <form method="dialog" className="modal-backdrop">
                <button type="button" onClick={onClose}>close</button>
            </form>
        </dialog>
    );
};

export default EmployeeDetailsModal;