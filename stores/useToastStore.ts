import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
    id: number;
    message: string;
    type: ToastType;
}

interface ToastState {
    toasts: Toast[];
    addToast: (message: string, type?: ToastType) => void;
    removeToast: (id: number) => void;
}

let toastId = 0;

export const useToastStore = create<ToastState>((set, get) => ({
    toasts: [],
    addToast: (message, type = 'info') => {
        const id = toastId++;
        set(state => ({ toasts: [...state.toasts, { id, message, type }] }));
        setTimeout(() => {
            get().removeToast(id);
        }, 5000); // Auto-remove after 5 seconds
    },
    removeToast: (id) => {
        set(state => ({ toasts: state.toasts.filter(toast => toast.id !== id) }));
    },
}));
