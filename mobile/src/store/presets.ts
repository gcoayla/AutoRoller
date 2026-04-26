// Presets / escenas: combinaciones de posiciones para varios dispositivos.
// Sólo en la app (no en el firmware).

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { Preset, PresetItem } from '@/lib/types';

type State = {
    presets: Preset[];

    add: (name: string, items?: PresetItem[], icon?: string) => Preset | null;
    rename: (id: string, name: string) => boolean;
    setIcon: (id: string, icon: string) => void;
    setItems: (id: string, items: PresetItem[]) => void;
    remove: (id: string) => void;

    /** Llamar cuando un dispositivo se borra para no dejar referencias. */
    pruneDevice: (deviceId: string) => void;
};

const newId = () =>
    `preset-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

export const usePresets = create<State>()(
    persist(
        (set, get) => ({
            presets: [],

            add: (name, items = [], icon) => {
                const trimmed = name.trim();
                if (!trimmed) return null;
                if (get().presets.some((p) => p.name.toLowerCase() === trimmed.toLowerCase())) {
                    return null;
                }
                const p: Preset = { id: newId(), name: trimmed, items, icon };
                set((s) => ({ presets: [...s.presets, p] }));
                return p;
            },

            rename: (id, name) => {
                const trimmed = name.trim();
                if (!trimmed) return false;
                const dup = get().presets.some(
                    (p) => p.id !== id && p.name.toLowerCase() === trimmed.toLowerCase(),
                );
                if (dup) return false;
                set((s) => ({
                    presets: s.presets.map((p) => (p.id === id ? { ...p, name: trimmed } : p)),
                }));
                return true;
            },

            setIcon: (id, icon) =>
                set((s) => ({
                    presets: s.presets.map((p) => (p.id === id ? { ...p, icon } : p)),
                })),

            setItems: (id, items) =>
                set((s) => ({
                    presets: s.presets.map((p) => (p.id === id ? { ...p, items } : p)),
                })),

            remove: (id) =>
                set((s) => ({ presets: s.presets.filter((p) => p.id !== id) })),

            pruneDevice: (deviceId) =>
                set((s) => ({
                    presets: s.presets.map((p) => ({
                        ...p,
                        items: p.items.filter((it) => it.deviceId !== deviceId),
                    })),
                })),
        }),
        {
            name: 'autoroller.presets',
            storage: createJSONStorage(() => AsyncStorage),
            version: 1,
            migrate: (persisted: any, _version) => {
                if (!persisted) return persisted;
                const presets: Preset[] = Array.isArray(persisted.presets)
                    ? persisted.presets
                          .filter((p: any) => p && typeof p.id === 'string' && typeof p.name === 'string')
                          .map((p: any) => ({
                              id:    p.id,
                              name:  p.name,
                              icon:  typeof p.icon === 'string' ? p.icon : undefined,
                              items: Array.isArray(p.items)
                                  ? p.items.filter(
                                        (it: any) =>
                                            it && typeof it.deviceId === 'string' &&
                                            typeof it.target_pct === 'number',
                                    )
                                  : [],
                          }))
                    : [];
                return { ...persisted, presets };
            },
        },
    ),
);
