import React, { useState, useEffect, useRef } from 'react';

interface NoteEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (note: string) => void;
    initialNote?: string;
    employeeName: string;
    date: string;
}

const NoteEditorModal: React.FC<NoteEditorModalProps> = ({ isOpen, onClose, onSave, initialNote = '', employeeName, date }) => {
    const [note, setNote] = useState(initialNote);
    const dialogRef = useRef<HTMLDialogElement>(null);

    useEffect(() => {
        setNote(initialNote);
    }, [initialNote]);

    useEffect(() => {
        const dialog = dialogRef.current;
        if (isOpen) {
            dialog?.showModal();
        } else {
            dialog?.close();
        }
    }, [isOpen]);
    
    const handleSave = () => {
        onSave(note);
        onClose();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            handleSave();
        }
    };
    
    // Convert YYYY-MM-DD to a more readable format for the title
    const formattedDate = new Date(date.replace(/-/g, '/')).toLocaleDateString('fa-IR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    return (
        <dialog ref={dialogRef} className="modal" onCancel={onClose}>
            <div className="modal-box">
                <h3 className="font-bold text-lg">یادداشت برای "{employeeName}"</h3>
                <p className="py-2 text-sm text-gray-500">تاریخ: {formattedDate}</p>
                <textarea
                    className="textarea textarea-bordered w-full h-32 mt-2"
                    placeholder="یادداشت خود را اینجا بنویسید..."
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    onKeyDown={handleKeyDown}
                    autoFocus
                ></textarea>
                 <p className="text-xs text-gray-400 mt-1">نکته: برای ذخیره کردن می‌توانید از `Ctrl + Enter` استفاده کنید.</p>
                <div className="modal-action space-x-2 space-x-reverse">
                    <button onClick={onClose} className="btn">
                        انصراف
                    </button>
                    <button onClick={handleSave} className="btn btn-primary">
                        ذخیره یادداشت
                    </button>
                </div>
            </div>
            <form method="dialog" className="modal-backdrop">
                <button onClick={onClose}>close</button>
            </form>
        </dialog>
    );
};

export default NoteEditorModal;
