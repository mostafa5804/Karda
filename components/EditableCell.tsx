import React, { useState, useEffect } from 'react';

interface EditableCellProps {
    value: string | number;
    onSave: (newValue: string) => void;
    type?: 'text' | 'number';
    disabled?: boolean;
}

const EditableCell: React.FC<EditableCellProps> = ({ value, onSave, type = 'text', disabled = false }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [currentValue, setCurrentValue] = useState(String(value));

    useEffect(() => {
        setCurrentValue(String(value));
    }, [value]);

    const handleSave = () => {
        if (currentValue.trim() === '' && type === 'text') {
            setCurrentValue(String(value)); // Revert if empty
        } else {
            onSave(currentValue);
        }
        setIsEditing(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleSave();
        } else if (e.key === 'Escape') {
            setCurrentValue(String(value));
            setIsEditing(false);
        }
    };
    
    const handleStartEditing = () => {
        if (!disabled) {
            setIsEditing(true);
        }
    }

    if (isEditing) {
        return (
            <input
                type={type}
                value={currentValue}
                onChange={(e) => setCurrentValue(e.target.value)}
                onBlur={handleSave}
                onKeyDown={handleKeyDown}
                autoFocus
                className="w-full h-full px-2 py-3 border-none outline-none ring-2 ring-blue-500 rounded-md bg-white text-center"
            />
        );
    }

    return (
        <div
            onClick={handleStartEditing}
            onKeyDown={(e) => { if(e.key === 'Enter') handleStartEditing(); }}
            tabIndex={disabled ? -1 : 0}
            className={`w-full h-full px-2 py-3 flex items-center justify-center text-center ${disabled ? 'cursor-not-allowed' : 'cursor-pointer hover:bg-gray-100 rounded-md'}`}
        >
            {type === 'number' ? Number(value).toLocaleString('fa-IR') : value}
        </div>
    );
};

export default EditableCell;