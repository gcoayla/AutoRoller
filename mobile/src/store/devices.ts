// Zustand store para la lista de dispositivos (persistente con AsyncStorage).
// El estado en vivo (DeviceStatus) se mantiene en memoria, no se persiste.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { DeviceStatus, SavedDevice } from '@/lib/types';
import { usePresets } from './presets';

type State = {
    devices: SavedDevice[];
    statuses: Record<string, DeviceStatus>;       // not persisted
    onlineMap: Record<string, boolean>;            // not persisted

    add: (dev: SavedDevice) => void;
    update: (id: string, patch: Partial<SavedDevice>) => void;
    remove: (id: string) => void;
    /** Limpia el roomId de todos los devices que apuntan a `roomId`. */
    pruneRoom: (roomId: string) => void;
    setStatus: (id: string, st: DeviceStatus) => void;
    setOnline: (id: string, online: boolean) => void;
    toggleFavorite: (id: string) => void;
    findByHostname: (host: string) => SavedDevice | undefined;
    clear: () => void;
};

const PALETTE = [
    '#4EA1FF', '#B14EFF', '#4EFFB1', '#FFB04E',
    '#FF4E78', '#FFE74E', '#4EE6FF', '#FF7BD3',
];

export const useDevices = create<State>()(
    persist(
        (set, get) => ({
            devices: [],
            statuses: {},
            onlineMap: {},

            add: (dev) =>
                set((s) => {
                    if (s.devices.some((d) => d.id === dev.id)) return s;
                    const color = dev.color ?? PALETTE[s.devices.length % PALETTE.length];
                    return { devices: [...s.devices, { ...dev, color }] };
                }),

            update: (id, patch) =>
                set((s) => ({
                    devices: s.devices.map((d) =>
                        d.id === id ? { ...d, ...patch } : d,
                    ),
                })),

            remove: (id) => {
                // Cascada: quita las referencias en presets antes de borrar.
                try { usePresets.getState().pruneDevice(id); } catch {}
                set((s) => ({
                    devices: s.devices.filter((d) => d.id !== id),
                    statuses: Object.fromEntries(
                        Object.entries(s.statuses).filter(([k]) => k !== id),
                    ),
                    onlineMap: Object.fromEntries(
                        Object.entries(s.onlineMap).filter(([k]) => k !== id),
                    ),
                }));
            },

            pruneRoom: (roomId) =>
                set((s) => ({
                    devices: s.devices.map((d) =>
                        d.roomId === roomId ? { ...d, roomId: undefined } : d,
                    ),
                })),

            setStatus: (id, st) =>
                set((s) => ({ statuses: { ...s.statuses, [id]: st } })),

            setOnline: (id, online) =>
                set((s) => ({ onlineMap: { ...s.onlineMap, [id]: online } })),

            toggleFavorite: (id) =>
                set((s) => ({
                    devices: s.devices.map((d) =>
                        d.id === id ? { ...d, favorite: !d.favorite } : d,
                    ),
                })),

            findByHostname: (host) =>
                get().devices.find(
                    (d) => d.hostname.toLowerCase() === host.toLowerCase(),
                ),

            clear: () => set({ devices: [], statuses: {}, onlineMap: {} }),
        }),
        {
            name: 'autoroller.devices',
            storage: createJSONStorage(() => AsyncStorage),
            // No persistimos status/onlineMap.
            partialize: (state) => ({ devices: state.devices }) as any,
        },
    ),
);
