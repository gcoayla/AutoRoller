// Estado de UI (no persistente) — toasts, sheet abierto, etc.

import { create } from 'zustand';

type Toast = {
    id: number;
    text: string;
    kind: 'ok' | 'error' | 'info';
};

type State = {
    toasts: Toast[];
    push: (text: string, kind?: Toast['kind']) => void;
    remove: (id: number) => void;
};

let nextId = 1;

export const useUi = create<State>()((set) => ({
    toasts: [],
    push: (text, kind = 'info') => {
        const id = nextId++;
        set((s) => ({ toasts: [...s.toasts, { id, text, kind }] }));
        setTimeout(() => {
            set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
        }, 3000);
    },
    remove: (id) =>
        set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
