import React, { useState } from 'react';
import { useEmployeeStore } from '../stores/useEmployeeStore';
import { useToastStore } from '../stores/useToastStore';
import { ICONS } from '../constants';

interface AddEmployeeRowProps {
    colSpan: number;
    projectId: string;
}

const AddEmployeeRow: React.FC<AddEmployeeRowProps> = ({ colSpan, projectId }) => {
    const [lastName, setLastName] = useState('');
    const [firstName, setFirstName] = useState('');
    const [position, setPosition] = useState('');
    const [monthlySalary, setMonthlySalary] = useState(10000000); // Default monthly salary
    
    const addEmployee = useEmployeeStore(state => state.addEmployee);
    const addToast = useToastStore(state => state.addToast);

    const handleAddEmployee = () => {
        if (lastName.trim() && firstName.trim() && position.trim()) {
            addEmployee(projectId, {
                lastName: lastName.trim(),
                firstName: firstName.trim(),
                position: position.trim(),
                monthlySalary: monthlySalary,
            });
            setLastName('');
            setFirstName('');
            setPosition('');
            setMonthlySalary(10000000);
            addToast('کارمند جدید با موفقیت افزوده شد.', 'success');
        } else {
            addToast('لطفاً تمام اطلاعات کارمند جدید را وارد کنید.', 'warning');
        }
    };
    
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            const target = e.target as HTMLInputElement;
            // Trigger add only if enter is pressed on the last input field
            if (target.name === 'monthlySalary') {
                handleAddEmployee();
            }
        }
    };

    return (
        <tr className="bg-gray-50">
            <td className="p-1 border border-gray-300 text-center text-gray-400">#</td>
            <td className="p-1 border border-gray-300">
                 <button 
                    onClick={handleAddEmployee} 
                    className="w-full h-full flex items-center justify-center text-green-600 hover:text-green-800 disabled:opacity-50"
                    title="افزودن کارمند جدید"
                    disabled={!lastName.trim() || !firstName.trim()}
                >
                    {ICONS.userPlus}
                </button>
            </td>
            <td className="p-1 border border-gray-300">
                <input type="text" name="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} onKeyDown={handleKeyDown} placeholder="نام خانوادگی" className="w-full px-2 py-1 border-gray-300 rounded-md"/>
            </td>
            <td className="p-1 border border-gray-300">
                 <input type="text" name="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} onKeyDown={handleKeyDown} placeholder="نام" className="w-full px-2 py-1 border-gray-300 rounded-md"/>
            </td>
            <td className="p-1 border border-gray-300">
                 <input type="text" name="position" value={position} onChange={(e) => setPosition(e.target.value)} onKeyDown={handleKeyDown} placeholder="سمت" className="w-full px-2 py-1 border-gray-300 rounded-md"/>
            </td>
             <td className="p-1 border border-gray-300">
                 <input type="number" name="monthlySalary" value={monthlySalary} onChange={(e) => setMonthlySalary(Number(e.target.value))} onKeyDown={handleKeyDown} placeholder="حقوق ماهانه" className="w-full px-2 py-1 border-gray-300 rounded-md"/>
            </td>
            <td colSpan={colSpan} className="p-2 border border-gray-300 bg-gray-100 text-center text-sm text-gray-500">
                برای افزودن کارمند جدید، اطلاعات بالا را تکمیل کرده و Enter یا دکمه + را بزنید.
            </td>
        </tr>
    );
};

export default AddEmployeeRow;
