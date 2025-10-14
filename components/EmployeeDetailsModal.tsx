import React, { useState, useEffect, useRef } from 'react';
import { Employee, Document } from '../types';
import { useSettingsStore } from '../stores/useSettingsStore';
import { useAppStore } from '../stores/useAppStore';
import { useToastStore } from '../stores/useToastStore';
import { useDocumentStore } from '../stores/useDocumentStore';
import { isValidJalaliDateString } from '../utils/calendar';
import { formatCurrency } from '../utils/currency';
import { useEmployeeStore } from '../stores/useEmployeeStore';
import { fileSystemManager } from '../utils/db';

interface EmployeeDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (employeeData: Omit<Employee, 'id' | 'isArchived'>, employeeId?: string) => void;
    employee?: Employee;
}

const emptyEmployeeState: Omit<Employee, 'id' | 'isArchived' | 'documentsFolderName'> = {
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

const EmployeeDetailsModal: React.FC<EmployeeDetailsModalProps> = ({ isOpen, onClose, onSave, employee }) => {
    const dialogRef = useRef<HTMLDialogElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const prevEmployeeRef = useRef<Employee | undefined>();
    const [formData, setFormData] = useState(emptyEmployeeState);
    const [activeTab, setActiveTab] = useState('personal');
    const [isUploading, setIsUploading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

    const { currentProjectId, isFileSystemReady } = useAppStore();
    const projectId = currentProjectId || 'default';
    const settings = useSettingsStore().getSettings(projectId);
    const { employees } = useEmployeeStore().getProjectData(projectId);
    const addToast = useToastStore(s => s.addToast);
    const { getDocumentsForEmployee, addDocument, getDownloadableFile, deleteDocument } = useDocumentStore();

    const employeeDocuments = employee ? getDocumentsForEmployee(projectId, employee.id) : [];

    useEffect(() => {
        if (isOpen) {
            setFormData(employee ? { ...emptyEmployeeState, ...employee } : emptyEmployeeState);
            if (!employee) { // Reset tab only when adding a new one
                 setActiveTab('personal');
            }
        }
    }, [isOpen, employee]);

    useEffect(() => {
        // Auto-switch to documents tab after first save
        if (!prevEmployeeRef.current && employee) {
            setActiveTab('documents');
            addToast('کارمند ذخیره شد. اکنون می‌توانید مدارک را بارگذاری کنید.', 'info');
        }
        prevEmployeeRef.current = employee;
    }, [employee, addToast]);
    
    useEffect(() => {
        const dialog = dialogRef.current;
        if (isOpen) {
            dialog?.showModal();
        } else {
            dialog?.close();
        }
    }, [isOpen]);

    useEffect(() => {
        if (settings.salaryMode === 'official') {
            const total = (formData.baseSalary || 0) + (formData.housingAllowance || 0) + (formData.childAllowance || 0) + (formData.otherBenefits || 0);
            if (total !== formData.monthlySalary) {
                setFormData(prev => ({ ...prev, monthlySalary: total }));
            }
        }
    }, [settings.salaryMode, formData.baseSalary, formData.housingAllowance, formData.childAllowance, formData.otherBenefits, formData.monthlySalary]);


    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value === '' ? 0 : parseInt(value, 10) }));
    };

    const validateForm = () => {
        if (!formData.lastName || !formData.firstName) {
            addToast('نام و نام خانوادگی اجباری است.', 'error'); return false;
        }
        if (!formData.nationalId) {
            addToast('کد ملی اجباری است.', 'error'); return false;
        }
        if (!/^\d{10}$/.test(formData.nationalId)) {
            addToast('کد ملی باید ۱۰ رقم و فقط شامل اعداد باشد.', 'error'); return false;
        }
        const isDuplicate = employees.some(e => e.nationalId === formData.nationalId && e.id !== employee?.id);
        if (isDuplicate) {
            addToast('این کد ملی قبلاً برای کارمند دیگری ثبت شده است.', 'error'); return false;
        }
        if (formData.contractStartDate && !isValidJalaliDateString(formData.contractStartDate)) {
            addToast('فرمت تاریخ شروع قرارداد نامعتبر است. (مثال: 1403-01-15)', 'error'); return false;
        }
        if (formData.contractEndDate && !isValidJalaliDateString(formData.contractEndDate)) {
            addToast('فرمت تاریخ پایان قرارداد نامعتبر است. (مثال: 1404-01-14)', 'error'); return false;
        }
        if (formData.settlementDate && formData.settlementDate !== '' && !isValidJalaliDateString(formData.settlementDate)) {
            addToast('فرمت تاریخ تسویه نامعتبر است.', 'error'); return false;
        }
        return true;
    };

    const handleSubmit = () => {
        if (!validateForm()) return;
        const { id, isArchived, documentsFolderName, ...saveData } = formData as Employee;
        onSave(saveData, employee?.id);
    };

    const processFiles = async (files: FileList | null) => {
        if (!files || files.length === 0 || !employee) return;
        setIsUploading(true);
        for (const file of Array.from(files)) {
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
                addToast(`خطا در بارگذاری فایل "${file.name}".`, 'error');
            }
        }
        setIsUploading(false);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        processFiles(e.target.files);
        e.target.value = ''; // Reset file input
    };
    
    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        processFiles(e.dataTransfer.files);
    };

    const handleDownload = async (doc: Document) => {
        const file = await getDownloadableFile(doc);
        if (file) {
            const url = URL.createObjectURL(file);
            const a = document.createElement('a');
            a.href = url;
            a.download = doc.fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } else {
            addToast('فایل یافت نشد. ممکن است حذف شده باشد یا دسترسی به پوشه برنامه قطع شده باشد.', 'error');
        }
    };
    
    const handleDeleteDocument = async (doc: Document) => {
        if (window.confirm(`آیا از حذف فایل "${doc.fileName}" مطمئن هستید؟`)) {
            await deleteDocument(doc);
            addToast('فایل با موفقیت حذف شد.', 'success');
        }
    };

    return (
        <dialog ref={dialogRef} className="modal" onCancel={onClose}>
            <div className="modal-box w-11/12 max-w-3xl">
                <h3 className="font-bold text-lg mb-4">{employee ? `ویرایش اطلاعات ${employee.firstName} ${employee.lastName}` : 'افزودن کارمند جدید'}</h3>
                
                <div role="tablist" className="tabs tabs-boxed mb-4">
                    <a role="tab" className={`tab ${activeTab === 'personal' ? 'tab-active' : ''}`} onClick={() => setActiveTab('personal')}>اطلاعات فردی</a>
                    <a role="tab" className={`tab ${activeTab === 'salary' ? 'tab-active' : ''}`} onClick={() => setActiveTab('salary')}>اطلاعات قرارداد و حقوق</a>
                    <a role="tab" className={`tab ${activeTab === 'documents' ? 'tab-active' : ''} ${!employee ? 'tab-disabled' : ''}`} onClick={() => employee && setActiveTab('documents')}>مدارک</a>
                </div>

                <div className="max-h-[60vh] overflow-y-auto pr-2 space-y-4">
                    {activeTab === 'personal' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="form-control">
                                <label className="label"><span className="label-text">نام خانوادگی (اجباری)</span></label>
                                <input type="text" name="lastName" value={formData.lastName} onChange={handleChange} className="input input-bordered" />
                            </div>
                            <div className="form-control">
                                <label className="label"><span className="label-text">نام (اجباری)</span></label>
                                <input type="text" name="firstName" value={formData.firstName} onChange={handleChange} className="input input-bordered" />
                            </div>
                            <div className="form-control">
                                <label className="label"><span className="label-text">نام پدر</span></label>
                                <input type="text" name="fatherName" value={formData.fatherName} onChange={handleChange} className="input input-bordered" />
                            </div>
                            <div className="form-control">
                                <label className="label"><span className="label-text">کد ملی (اجباری)</span></label>
                                <input type="text" name="nationalId" value={formData.nationalId} onChange={handleChange} className="input input-bordered" />
                            </div>
                            <div className="form-control">
                                <label className="label"><span className="label-text">شماره تلفن</span></label>
                                <input type="text" name="phone" value={formData.phone} onChange={handleChange} className="input input-bordered" />
                            </div>
                            <div className="form-control">
                                <label className="label"><span className="label-text">وضعیت تاهل</span></label>
                                <select name="maritalStatus" value={formData.maritalStatus} onChange={handleChange} className="select select-bordered">
                                    <option value="single">مجرد</option>
                                    <option value="married">متاهل</option>
                                </select>
                            </div>
                             <div className="form-control">
                                <label className="label"><span className="label-text">تعداد فرزندان</span></label>
                                <input type="number" name="childrenCount" value={formData.childrenCount} onChange={handleNumberChange} className="input input-bordered" />
                            </div>
                             <div className="form-control">
                                <label className="label"><span className="label-text">وضعیت نظام وظیفه</span></label>
                                <select name="militaryServiceStatus" value={formData.militaryServiceStatus} onChange={handleChange} className="select select-bordered">
                                    <option value="not_applicable">مشمول نیست</option>
                                    <option value="completed">کارت پایان خدمت</option>
                                    <option value="exempt">کارت معافیت</option>
                                    <option value="pending">در حال خدمت</option>
                                </select>
                            </div>
                             <div className="form-control md:col-span-2">
                                <label className="label"><span className="label-text">آدرس</span></label>
                                <textarea name="address" value={formData.address} onChange={handleChange} className="textarea textarea-bordered h-24"></textarea>
                            </div>
                        </div>
                    )}
                    {activeTab === 'salary' && (
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div className="form-control">
                                <label className="label"><span className="label-text">سمت شغلی</span></label>
                                <input type="text" name="position" value={formData.position} onChange={handleChange} className="input input-bordered" />
                            </div>
                            <div className="form-control">
                                <label className="label"><span className="label-text">شماره شبا (بدون IR)</span></label>
                                <input type="text" name="iban" value={formData.iban} onChange={handleChange} className="input input-bordered ltr" />
                            </div>
                             <div className="form-control">
                                <label className="label"><span className="label-text">تاریخ شروع قرارداد</span></label>
                                <input type="text" name="contractStartDate" placeholder="مثال: 1403-01-15" value={formData.contractStartDate} onChange={handleChange} className="input input-bordered ltr" />
                            </div>
                             <div className="form-control">
                                <label className="label"><span className="label-text">تاریخ پایان قرارداد</span></label>
                                <input type="text" name="contractEndDate" placeholder="مثال: 1404-01-14" value={formData.contractEndDate} onChange={handleChange} className="input input-bordered ltr" />
                            </div>
                             <div className="form-control md:col-span-2">
                                <label className="label"><span className="label-text">تاریخ تسویه</span></label>
                                <input type="text" name="settlementDate" placeholder="YYYY-MM-DD یا خالی برای حذف" value={formData.settlementDate} onChange={handleChange} className="input input-bordered ltr" />
                            </div>
                            <div className="divider md:col-span-2">اطلاعات حقوق</div>
                             {settings.salaryMode === 'project' ? (
                                <div className="form-control md:col-span-2">
                                    <label className="label"><span className="label-text">حقوق ماهانه (مقطوع)</span></label>
                                    <input type="number" name="monthlySalary" value={formData.monthlySalary} onChange={handleNumberChange} className="input input-bordered ltr" />
                                </div>
                             ) : (
                                <>
                                    <div className="form-control">
                                        <label className="label"><span className="label-text">حقوق پایه</span></label>
                                        <input type="number" name="baseSalary" value={formData.baseSalary} onChange={handleNumberChange} className="input input-bordered ltr" />
                                    </div>
                                    <div className="form-control">
                                        <label className="label"><span className="label-text">حق مسکن</span></label>
                                        <input type="number" name="housingAllowance" value={formData.housingAllowance} onChange={handleNumberChange} className="input input-bordered ltr" />
                                    </div>
                                    <div className="form-control">
                                        <label className="label"><span className="label-text">حق اولاد</span></label>
                                        <input type="number" name="childAllowance" value={formData.childAllowance} onChange={handleNumberChange} className="input input-bordered ltr" />
                                    </div>
                                    <div className="form-control">
                                        <label className="label"><span className="label-text">سایر مزایا</span></label>
                                        <input type="number" name="otherBenefits" value={formData.otherBenefits} onChange={handleNumberChange} className="input input-bordered ltr" />
                                    </div>
                                    <div className="form-control md:col-span-2 p-3 bg-base-200 rounded-md">
                                        <label className="label"><span className="label-text font-bold">حقوق ماهانه کل (محاسبه شده)</span></label>
                                        <div className="text-xl font-bold">{formatCurrency(formData.monthlySalary, settings.currency, true)}</div>
                                    </div>
                                </>
                             )}
                        </div>
                    )}
                    {activeTab === 'documents' && (
                         <div>
                            {!employee ? (
                                <div className="alert alert-info">ابتدا کارمند را ذخیره کنید تا بتوانید مدارک را بارگذاری نمایید.</div>
                            ) : !isFileSystemReady ? (
                                <div className="card bg-base-200">
                                    <div className="card-body items-center text-center">
                                        <h2 className="card-title">دسترسی به پوشه لازم است</h2>
                                        <p>برای بارگذاری و مدیریت مدارک، برنامه به دسترسی برای ذخیره فایل‌ها نیاز دارد. لطفاً یک پوشه انتخاب کنید.</p>
                                        <div className="card-actions justify-end">
                                        <button 
                                            className="btn btn-primary"
                                            onClick={async () => {
                                                const { success, message } = await fileSystemManager.requestHandle();
                                                addToast(message, success ? 'success' : 'error');
                                            }}
                                        >انتخاب پوشه</button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div 
                                        className={`relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${isDragging ? 'border-primary bg-primary/10' : 'border-base-300 hover:border-primary'}`}
                                        onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }}
                                        onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); }}
                                        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                        onDrop={handleDrop}
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" multiple />
                                        <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-base-content/40" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                                        <p className="mt-2 text-sm text-base-content/70">فایل‌ها را اینجا بکشید و رها کنید یا برای انتخاب کلیک کنید.</p>
                                        {isUploading && <progress className="progress progress-primary w-full absolute bottom-1 left-0 right-0"></progress>}
                                    </div>

                                    {employeeDocuments.length > 0 ? (
                                        <ul className="space-y-2 mt-4">
                                            {employeeDocuments.map(doc => (
                                                <li key={doc.id} className="flex justify-between items-center p-2 bg-base-200 rounded-md">
                                                    <div className="truncate">
                                                        <p className="font-semibold" title={doc.fileName}>{doc.fileName}</p>
                                                        <p className="text-xs text-base-content/60">
                                                            {(doc.fileSize / 1024).toFixed(1)} KB - {new Date(doc.uploadedAt).toLocaleDateString('fa-IR')}
                                                        </p>
                                                    </div>
                                                    <div className="space-x-2 space-x-reverse flex-shrink-0">
                                                        <button onClick={() => handleDownload(doc)} className="btn btn-xs btn-ghost">دانلود</button>
                                                        <button onClick={() => handleDeleteDocument(doc)} className="btn btn-xs btn-ghost text-error">حذف</button>
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="text-center text-base-content/60 p-4 mt-2">هیچ مدرکی برای این کارمند بارگذاری نشده است.</p>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                </div>

                <div className="modal-action space-x-2 space-x-reverse pt-4">
                    <button type="button" onClick={onClose} className="btn">انصراف</button>
                    <button type="button" onClick={handleSubmit} className="btn btn-primary">ذخیره</button>
                </div>
            </div>
             <form method="dialog" className="modal-backdrop">
                <button type="button" onClick={onClose}>close</button>
            </form>
        </dialog>
    );
};

export default EmployeeDetailsModal;