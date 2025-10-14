import React from 'react';
import { useToastStore } from '../stores/useToastStore';
import { ToastType } from '../stores/useToastStore';

const ToastContainer: React.FC = () => {
    const { toasts, removeToast } = useToastStore();

    if (!toasts.length) {
        return null;
    }
    
    const getToastClassName = (type: ToastType) => {
        switch (type) {
            case 'success': return 'alert-success';
            case 'error': return 'alert-error';
            case 'warning': return 'alert-warning';
            case 'info':
            default: return 'alert-info';
        }
    };

    return (
        <div className="toast toast-top toast-center z-[9999]">
            {toasts.map(toast => (
                <div key={toast.id} className={`alert ${getToastClassName(toast.type)} shadow-lg flex`}>
                    <div className="flex-1">
                        <span>{toast.message}</span>
                    </div>
                    <button onClick={() => removeToast(toast.id)} className="btn btn-ghost btn-sm btn-circle">✕</button>
                </div>
            ))}
        </div>
    );
};

export default ToastContainer;