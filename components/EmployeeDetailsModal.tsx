import React, { useState, useEffect, useRef } from 'react';
import { Employee } from '../types';

interface EmployeeDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (employeeData: Omit<Employee, 'id' | 'isArchived'>, employeeId?: string) => void;
    employee?: Employee;
}

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
};


const EmployeeDetailsModal: React.FC<EmployeeDetailsModalProps> = ({ isOpen, onClose, onSave, employee }) => {
    const [formData, setFormData] = useState(initialEmployeeState);
    const dialogRef = useRef<HTMLDialogElement>(null);

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
            });
        } else {
            setFormData(initialEmployeeState);
        }
    }, [employee]);

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
        const numValue = parseInt(value, 10);
        setFormData(prev => ({ ...prev, [name]: isNaN(numValue) ? 0 : numValue }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData, employee?.id);
    };

    return (
        <dialog ref={dialogRef} className="modal" onCancel={onClose}>
            <div className="modal-box w-11/12 max-w-4xl">
                <form onSubmit={handleSubmit}>
                    <h3 className="font-bold text-lg mb-4 border-b pb-2">
                        {employee ? `ویرایش اطلاعات ${employee.firstName} ${employee.lastName}` : 'افزودن کارمند جدید'}
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-h-[70vh] overflow-y-auto p-2">
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
                        <div className="form-control">
                            <label className="label"><span className="label-text">حقوق ماهانه (تومان) *</span></label>
                            <input type="number" name="monthlySalary" value={formData.monthlySalary} onChange={handleNumberChange} className="input input-bordered" required />
                        </div>
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
                        
                        <div className="form-control md:col-span-3">
                            <label className="label"><span className="label-text">آدرس</span></label>
                            <textarea name="address" value={formData.address} onChange={handleChange} className="textarea textarea-bordered h-24"></textarea>
                        </div>

                    </div>

                    <div className="modal-action space-x-2 space-x-reverse pt-4">
                        <button type="button" onClick={onClose} className="btn">انصراف</button>
                        <button type="submit" className="btn btn-primary">ذخیره</button>
                    </div>
                </form>
            </div>
            <form method="dialog" className="modal-backdrop">
                <button type="button" onClick={onClose}>close</button>
            </form>
        </dialog>
    );
};

export default EmployeeDetailsModal;
