import React, { useState, useEffect, useRef } from 'react';
import { Employee } from '../types';

// FIX: Exclude documentsFolderName as it's not a user-updatable field and was causing a type error.
type UpdatableFields = Omit<Employee, 'id' | 'isArchived' | 'firstName' | 'lastName' | 'nationalId' | 'fatherName' | 'documentsFolderName'>;

interface BulkEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (updates: Partial<UpdatableFields>) => void;
    employeeCount: number;
}

const initialFormState: Partial<UpdatableFields> = {
    position: '',
    monthlySalary: 0,
    maritalStatus: undefined,
    militaryServiceStatus: undefined,
    contractStartDate: '',
    contractEndDate: '',
    settlementDate: '',
    baseSalary: 0,
    housingAllowance: 0,
    childAllowance: 0,
    otherBenefits: 0,
};

const initialFieldsToUpdateState: Record<keyof UpdatableFields, boolean> = {
    position: false,
    monthlySalary: false,
    phone: false,
    maritalStatus: false,
    childrenCount: false,
    militaryServiceStatus: false,
    address: false,
    iban: false,
    contractStartDate: false,
    contractEndDate: false,
    settlementDate: false,
    baseSalary: false,
    housingAllowance: false,
    childAllowance: false,
    otherBenefits: false,
};


const BulkEditModal: React.FC<BulkEditModalProps> = ({ isOpen, onClose, onSave, employeeCount }) => {
    const [formData, setFormData] = useState(initialFormState);
    const [fieldsToUpdate, setFieldsToUpdate] = useState(initialFieldsToUpdateState);
    const dialogRef = useRef<HTMLDialogElement>(null);

    useEffect(() => {
        const dialog = dialogRef.current;
        if (isOpen) {
            dialog?.showModal();
        } else {
            dialog?.close();
        }
    }, [isOpen]);

    useEffect(() => {
        // Reset state when modal opens
        if (isOpen) {
            setFormData(initialFormState);
            setFieldsToUpdate(initialFieldsToUpdateState);
        }
    }, [isOpen]);

    const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, checked } = e.target;
        setFieldsToUpdate(prev => ({ ...prev, [name]: checked }));
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };
    
    const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: parseInt(value, 10) || 0 }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const updates: Partial<UpdatableFields> = {};
        for (const key in fieldsToUpdate) {
            if (fieldsToUpdate[key as keyof UpdatableFields]) {
                (updates as any)[key] = formData[key as keyof UpdatableFields];
            }
        }
        onSave(updates);
    };

    return (
        <dialog ref={dialogRef} className="modal" onCancel={onClose}>
            <div className="modal-box w-11/12 max-w-2xl">
                <form onSubmit={handleSubmit}>
                    <h3 className="font-bold text-lg mb-4 border-b pb-2">
                        ویرایش گروهی {employeeCount} کارمند
                    </h3>
                    <p className="text-sm text-base-content/70 mb-4">فقط فیلدهایی که تیک آن‌ها را بزنید برای کارمندان انتخاب شده تغییر خواهد کرد.</p>

                    <div className="space-y-4 max-h-[60vh] overflow-y-auto p-2">
                        {/* Position */}
                        <div className="flex items-center gap-2">
                            <input type="checkbox" name="position" checked={fieldsToUpdate.position} onChange={handleCheckboxChange} className="checkbox" />
                            <div className="form-control flex-grow">
                                <label className="label"><span className="label-text">سمت شغلی</span></label>
                                <input type="text" name="position" value={formData.position} onChange={handleChange} className="input input-bordered" disabled={!fieldsToUpdate.position} />
                            </div>
                        </div>

                        {/* Monthly Salary */}
                        <div className="flex items-center gap-2">
                            <input type="checkbox" name="monthlySalary" checked={fieldsToUpdate.monthlySalary} onChange={handleCheckboxChange} className="checkbox" />
                            <div className="form-control flex-grow">
                                <label className="label"><span className="label-text">حقوق ماهانه (تومان)</span></label>
                                <input type="number" name="monthlySalary" value={formData.monthlySalary} onChange={handleNumberChange} className="input input-bordered" disabled={!fieldsToUpdate.monthlySalary} />
                            </div>
                        </div>
                        
                        {/* Marital Status */}
                         <div className="flex items-center gap-2">
                            <input type="checkbox" name="maritalStatus" checked={fieldsToUpdate.maritalStatus} onChange={handleCheckboxChange} className="checkbox" />
                            <div className="form-control flex-grow">
                                <label className="label"><span className="label-text">وضعیت تاهل</span></label>
                                <select name="maritalStatus" value={formData.maritalStatus} onChange={handleChange} className="select select-bordered" disabled={!fieldsToUpdate.maritalStatus}>
                                    <option value="single">مجرد</option>
                                    <option value="married">متاهل</option>
                                </select>
                            </div>
                        </div>

                        {/* Contract Dates */}
                         <div className="flex items-center gap-2">
                            <input type="checkbox" name="contractStartDate" checked={fieldsToUpdate.contractStartDate} onChange={handleCheckboxChange} className="checkbox" />
                            <div className="form-control flex-grow">
                                <label className="label"><span className="label-text">تاریخ شروع قرارداد</span></label>
                                <input type="text" name="contractStartDate" placeholder="مثال: 1403-01-15" value={formData.contractStartDate} onChange={handleChange} className="input input-bordered" disabled={!fieldsToUpdate.contractStartDate} />
                            </div>
                        </div>
                         <div className="flex items-center gap-2">
                            <input type="checkbox" name="contractEndDate" checked={fieldsToUpdate.contractEndDate} onChange={handleCheckboxChange} className="checkbox" />
                            <div className="form-control flex-grow">
                                <label className="label"><span className="label-text">تاریخ پایان قرارداد</span></label>
                                <input type="text" name="contractEndDate" placeholder="مثال: 1404-01-14" value={formData.contractEndDate} onChange={handleChange} className="input input-bordered" disabled={!fieldsToUpdate.contractEndDate} />
                            </div>
                        </div>
                        {/* Settlement Date */}
                         <div className="flex items-center gap-2">
                            <input type="checkbox" name="settlementDate" checked={fieldsToUpdate.settlementDate} onChange={handleCheckboxChange} className="checkbox" />
                            <div className="form-control flex-grow">
                                <label className="label"><span className="label-text">تاریخ تسویه</span></label>
                                <input type="text" name="settlementDate" placeholder="YYYY-MM-DD یا خالی برای حذف" value={formData.settlementDate} onChange={handleChange} className="input input-bordered" disabled={!fieldsToUpdate.settlementDate} />
                            </div>
                        </div>
                    </div>

                    <div className="modal-action space-x-2 space-x-reverse pt-4">
                        <button type="button" onClick={onClose} className="btn">انصراف</button>
                        <button type="submit" className="btn btn-primary">ذخیره تغییرات</button>
                    </div>
                </form>
            </div>
            <form method="dialog" className="modal-backdrop">
                <button type="button" onClick={onClose}>close</button>
            </form>
        </dialog>
    );
};

export default BulkEditModal;