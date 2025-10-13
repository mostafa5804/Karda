import React, { useEffect, useRef } from 'react';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    children: React.ReactNode;
    confirmText?: string;
    confirmClassName?: string;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ 
    isOpen, 
    onClose, 
    onConfirm, 
    title, 
    children,
    confirmText = 'تایید',
    confirmClassName = 'btn-error'
}) => {
    const dialogRef = useRef<HTMLDialogElement>(null);

    useEffect(() => {
        const dialog = dialogRef.current;
        if (isOpen) {
            dialog?.showModal();
        } else {
            dialog?.close();
        }
    }, [isOpen]);

    const handleConfirm = () => {
        onConfirm();
    };

    return (
        <dialog ref={dialogRef} className="modal" onCancel={onClose}>
            <div className="modal-box">
                <h3 className="font-bold text-lg">{title}</h3>
                <div className="py-4">{children}</div>
                <div className="modal-action space-x-2 space-x-reverse">
                     <button onClick={onClose} className="btn">
                        انصراف
                    </button>
                    <button onClick={handleConfirm} className={`btn ${confirmClassName}`}>
                        {confirmText}
                    </button>
                </div>
            </div>
            <form method="dialog" className="modal-backdrop">
                <button onClick={onClose}>close</button>
            </form>
        </dialog>
    );
};

export default ConfirmationModal;
