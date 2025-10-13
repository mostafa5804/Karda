import React, { useMemo, useState } from 'react';
import { useEmployeeStore } from '../stores/useEmployeeStore';
import { Employee } from '../types';
import { useToastStore } from '../stores/useToastStore';

interface ManageActiveEmployeesModalProps {
    isOpen: boolean;
    onClose: () => void;
    projectId: string;
}

const ManageActiveEmployeesModal: React.FC<ManageActiveEmployeesModalProps> = ({ isOpen, onClose, projectId }) => {
    const { getProjectData, toggleEmployeeArchiveStatus } = useEmployeeStore();
    const { employees } = getProjectData(projectId);
    const addToast = useToastStore(state => state.addToast);
    
    const [filter, setFilter] = useState('');

    const filteredEmployees = useMemo(() => {
        return employees.filter(e => 
            `${e.lastName} ${e.firstName}`.toLowerCase().includes(filter.toLowerCase())
        ).sort((a, b) => a.lastName.localeCompare(b.lastName));
    }, [employees, filter]);

    const handleToggle = (employee: Employee) => {
        toggleEmployeeArchiveStatus(projectId, employee.id);
        addToast(`وضعیت ${employee.lastName} ${employee.firstName} به "${employee.isArchived ? 'فعال' : 'بایگانی'}" تغییر کرد.`, 'success');
    };

    return (
         <dialog open={isOpen} className="modal modal-open">
            <div className="modal-box w-11/12 max-w-2xl">
                <h3 className="font-bold text-lg mb-4">مدیریت کارمندان فعال</h3>
                <p className="text-sm text-gray-600 mb-4">در این بخش می‌توانید کارمندانی که در جدول حضور و غیاب نمایش داده می‌شوند را مدیریت کنید. کارمندان بایگانی شده در محاسبات و گزارش‌ها لحاظ نمی‌شوند.</p>
                
                <input
                    type="text"
                    placeholder="جستجوی کارمند..."
                    className="input input-bordered w-full mb-4"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                />

                <div className="max-h-96 overflow-y-auto pr-2">
                    {filteredEmployees.map(employee => (
                        <div key={employee.id} className="flex items-center justify-between p-2 hover:bg-gray-100 rounded-md">
                            <span>{employee.lastName} {employee.firstName}</span>
                             <div className="form-control">
                                <label className="label cursor-pointer gap-2">
                                    <span className={`label-text ${employee.isArchived ? 'text-gray-400' : 'text-green-600'}`}>
                                        {employee.isArchived ? 'بایگانی' : 'فعال'}
                                    </span> 
                                    <input 
                                        type="checkbox" 
                                        checked={!employee.isArchived} 
                                        onChange={() => handleToggle(employee)}
                                        className="toggle toggle-success"
                                    />
                                </label>
                            </div>
                        </div>
                    ))}
                    {filteredEmployees.length === 0 && <p className="text-center text-gray-400 p-4">کارمندی یافت نشد.</p>}
                </div>
                
                <div className="modal-action">
                    <button onClick={onClose} className="btn">بستن</button>
                </div>
            </div>
            <form method="dialog" className="modal-backdrop">
                <button onClick={onClose}>close</button>
            </form>
        </dialog>
    );
};

export default ManageActiveEmployeesModal;
