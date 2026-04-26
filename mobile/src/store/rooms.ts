// Habitaciones (sólo en la app). Asignación dispositivo→habitación opcional.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { Room } from '@/lib/types';
import { useDevices } from './devices';

type State = {
    rooms: Room[];

    add: (name: string, icon?: string, color?: string) => Room | null;
    rename: (id: string, name: string) => boolean;
    setIcon: (id: string, icon: string) => void;
    remove: (id: string) => void;
    reorder: (ids: string[]) => void;

    findByName: (name: string) => Room | undefined;
};

const newId = () =>
    `room-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

export const useRooms = create<State>()(
    persist(
        (set, get) => ({
            rooms: [],

            add: (name, icon, color) => {
                const trimmed = name.trim();
                if (!trimmed) return null;
                if (get().rooms.some((r) => r.name.toLowerCase() === trimmed.toLowerCase())) {
                    return null;     // nombre duplicado
                }
                const room: Room = {
                    id: newId(),
                    name: trimmed,
                    icon,
                    color,
                    order: get().rooms.length,
                };
                set((s) => ({ rooms: [...s.rooms, room] }));
                return room;
            },

            rename: (id, name) => {
                const trimmed = name.trim();
                if (!trimmed) return false;
                const dup = get().rooms.some(
                    (r) => r.id !== id && r.name.toLowerCase() === trimmed.toLowerCase(),
                );
                if (dup) return false;
                set((s) => ({
                    rooms: s.rooms.map((r) => (r.id === id ? { ...r, name: trimmed } : r)),
                }));
                return true;
            },

            setIcon: (id, icon) =>
                set((s) => ({
                    rooms: s.rooms.map((r) => (r.id === id ? { ...r, icon } : r)),
                })),

            remove: (id) => {
                // Cascada: dispositivos asignados pasan a "Sin habitación".
                try { useDevices.getState().pruneRoom(id); } catch {}
                set((s) => ({
                    rooms: s.rooms
                        .filter((r) => r.id !== id)
                        .map((r, idx) => ({ ...r, order: idx })),
                }));
            },

            reorder: (ids) =>
                set((s) => ({
                    rooms: s.rooms
                        .map((r) => ({ ...r, order: ids.indexOf(r.id) }))
                        .sort((a, b) => a.order - b.order),
                })),

            findByName: (name) =>
                get().rooms.find((r) => r.name.toLowerCase() === name.toLowerCase()),
        }),
        {
            name: 'autoroller.rooms',
            storage: createJSONStorage(() => AsyncStorage),
        },
    ),
);
