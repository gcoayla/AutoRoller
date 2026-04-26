// Editor de preset. `id` puede ser "new" o un id existente.

import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Field } from '@/components/Field';
import { IconPicker } from '@/components/IconPicker';
import { Screen } from '@/components/Screen';
import { Section } from '@/components/Section';
import { apiFor } from '@/lib/device-client';
import { colors } from '@/lib/colors';
import { useDevices } from '@/store/devices';
import { usePresets } from '@/store/presets';
import { useRooms } from '@/store/rooms';
import { useUi } from '@/store/ui';
import type { PresetItem, SavedDevice } from '@/lib/types';

type Limits = { open: number; close: number };

export default function PresetEditor() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const isNew = id === 'new';

    const presets   = usePresets((s) => s.presets);
    const addPreset = usePresets((s) => s.add);
    const rename    = usePresets((s) => s.rename);
    const setItems  = usePresets((s) => s.setItems);
    const setIcon   = usePresets((s) => s.setIcon);
    const devices   = useDevices((s) => s.devices);
    const rooms     = useRooms((s) => s.rooms);
    const toast     = useUi((s) => s.push);

    const existing = isNew ? null : presets.find((p) => p.id === id);

    const [name, setName] = useState(existing?.name ?? '');
    const [icon, setIconState] = useState<string | undefined>(existing?.icon ?? 'film-outline');
    // Map de deviceId → target_pct (undefined = no incluido).
    // Filtramos ítems huérfanos (apuntan a un device borrado) al cargar.
    const [picks, setPicks] = useState<Record<string, number | undefined>>(() => {
        const m: Record<string, number> = {};
        const ids = new Set(devices.map((d) => d.id));
        for (const it of existing?.items ?? []) {
            if (ids.has(it.deviceId)) m[it.deviceId] = it.target_pct;
        }
        return m;
    });

    // Cache de límites por device. Se rellena en background al montar; el
    // slider usa 0..100 hasta que llegan, y luego se reapunta.
    const [limits, setLimits] = useState<Record<string, Limits>>({});

    useEffect(() => {
        if (!isNew && !existing) router.back();
    }, [isNew, existing]);

    useEffect(() => {
        let alive = true;
        (async () => {
            const entries = await Promise.allSettled(
                devices.map(async (d) => {
                    try {
                        const cfg = await apiFor(d).config();
                        return [
                            d.id,
                            {
                                open:  typeof cfg.limit_open  === 'number' ? cfg.limit_open  : 0,
                                close: typeof cfg.limit_close === 'number' ? cfg.limit_close : 100,
                            },
                        ] as const;
                    } catch {
                        return [d.id, { open: 0, close: 100 }] as const;
                    }
                }),
            );
            if (!alive) return;
            const next: Record<string, Limits> = {};
            for (const e of entries) if (e.status === 'fulfilled') next[e.value[0]] = e.value[1];
            setLimits(next);
        })();
        return () => { alive = false; };
    }, [devices]);

    // Detecta orfandad si el preset tenía ítems que ya no están.
    const orphanCount = useMemo(() => {
        if (!existing) return 0;
        const ids = new Set(devices.map((d) => d.id));
        return existing.items.filter((it) => !ids.has(it.deviceId)).length;
    }, [existing, devices]);
    useEffect(() => {
        if (orphanCount > 0) {
            toast(`${orphanCount} dispositivo${orphanCount > 1 ? 's' : ''} ya no existe — se ignora${orphanCount > 1 ? 'n' : ''}`, 'info');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [orphanCount]);

    const grouped = useMemo(() => {
        const byRoom: Record<string, typeof devices> = {};
        const noRoom: typeof devices = [];
        for (const d of devices) {
            if (d.roomId && rooms.find((r) => r.id === d.roomId)) {
                (byRoom[d.roomId] = byRoom[d.roomId] ?? []).push(d);
            } else {
                noRoom.push(d);
            }
        }
        return { byRoom, noRoom };
    }, [devices, rooms]);

    const onSave = () => {
        const items: PresetItem[] = Object.entries(picks)
            .filter(([, v]) => v !== undefined)
            .map(([deviceId, v]) => ({ deviceId, target_pct: v as number }));
        if (!name.trim()) {
            toast('Pon un nombre al preset', 'error');
            return;
        }
        if (items.length === 0) {
            toast('Selecciona al menos un dispositivo', 'error');
            return;
        }
        if (isNew) {
            const p = addPreset(name, items, icon);
            if (!p) {
                toast('Nombre duplicado', 'error');
                return;
            }
        } else if (existing) {
            const ok = rename(existing.id, name);
            if (!ok) { toast('Nombre duplicado', 'error'); return; }
            if (icon) setIcon(existing.id, icon);
            setItems(existing.id, items);
        }
        toast(isNew ? 'Preset creado' : 'Preset guardado', 'ok');
        router.back();
    };

    const clampForDevice = (deviceId: string, v: number) => {
        const lim = limits[deviceId] ?? { open: 0, close: 100 };
        return Math.min(lim.close, Math.max(lim.open, Math.round(v)));
    };

    const togglePick = (deviceId: string) =>
        setPicks((prev) => {
            const next = { ...prev };
            if (next[deviceId] === undefined) {
                const lim = limits[deviceId] ?? { open: 0, close: 100 };
                next[deviceId] = clampForDevice(deviceId, Math.round((lim.open + lim.close) / 2));
            } else {
                delete next[deviceId];
            }
            return next;
        });

    const setPickValue = (deviceId: string, v: number) =>
        setPicks((prev) => ({ ...prev, [deviceId]: clampForDevice(deviceId, v) }));

    return (
        <Screen>
            <ScrollView contentContainerStyle={{ paddingTop: 12, paddingBottom: 80 }}>
                <Card className="mb-3">
                    <Section title={isNew ? 'Nuevo preset' : 'Editar preset'} subtitle="Detalles" />
                    <Field
                        label="Nombre"
                        value={name}
                        onChangeText={setName}
                        placeholder="Modo Cine, Buenas Noches…"
                        maxLength={32}
                    />
                    <Text className="text-muted text-xs uppercase tracking-widest mb-1">Icono</Text>
                    <IconPicker value={icon} onChange={setIconState} kind="preset" />
                </Card>

                <Card className="mb-3">
                    <Section
                        title="Dispositivos"
                        subtitle={`${Object.keys(picks).length} seleccionado${Object.keys(picks).length !== 1 ? 's' : ''}`}
                    />
                    {devices.length === 0 ? (
                        <Text className="text-muted text-sm">
                            Aún no tienes dispositivos. Añade alguno antes de crear un preset.
                        </Text>
                    ) : (
                        <>
                            {rooms
                                .slice()
                                .sort((a, b) => a.order - b.order)
                                .map((room) => {
                                    const list = grouped.byRoom[room.id] ?? [];
                                    if (list.length === 0) return null;
                                    return (
                                        <View key={room.id}>
                                            <Text className="text-muted text-xs uppercase tracking-widest mt-3 mb-1">
                                                {room.name}
                                            </Text>
                                            {list.map((d) => (
                                                <PickRow
                                                    key={d.id}
                                                    name={d.hostname}
                                                    color={d.color}
                                                    selected={picks[d.id] !== undefined}
                                                    value={picks[d.id] ?? 50}
                                                    limits={limits[d.id]}
                                                    onToggle={() => togglePick(d.id)}
                                                    onChange={(v) => setPickValue(d.id, v)}
                                                />
                                            ))}
                                        </View>
                                    );
                                })}
                            {grouped.noRoom.length > 0 ? (
                                <View>
                                    <Text className="text-muted text-xs uppercase tracking-widest mt-3 mb-1">
                                        Sin habitación
                                    </Text>
                                    {grouped.noRoom.map((d) => (
                                        <PickRow
                                            key={d.id}
                                            name={d.hostname}
                                            color={d.color}
                                            selected={picks[d.id] !== undefined}
                                            value={picks[d.id] ?? 50}
                                            limits={limits[d.id]}
                                            onToggle={() => togglePick(d.id)}
                                            onChange={(v) => setPickValue(d.id, v)}
                                        />
                                    ))}
                                </View>
                            ) : null}
                        </>
                    )}
                </Card>

                <View className="flex-row gap-2">
                    <View className="flex-1">
                        <Button label="Cancelar" variant="ghost" full onPress={() => router.back()} />
                    </View>
                    <View className="flex-1">
                        <Button
                            label="Guardar"
                            full
                            onPress={onSave}
                            disabled={
                                !name.trim() ||
                                Object.values(picks).filter((v) => v !== undefined).length === 0
                            }
                        />
                    </View>
                </View>
            </ScrollView>
        </Screen>
    );
}

function PickRow({
    name, color, selected, value, limits, onToggle, onChange,
}: {
    name: string;
    color?: string;
    selected: boolean;
    value: number;
    limits?: Limits;
    onToggle: () => void;
    onChange: (v: number) => void;
}) {
    const lim = limits ?? { open: 0, close: 100 };
    const restricted = lim.open > 0 || lim.close < 100;
    return (
        <View
            className="rounded-xl px-3 py-2 mb-2"
            style={{
                backgroundColor: selected ? 'rgba(78,161,255,0.10)' : 'rgba(255,255,255,0.03)',
                borderWidth: 1,
                borderColor: selected ? colors.primary + '55' : colors.border,
            }}
        >
            <Pressable
                onPress={onToggle}
                className="flex-row items-center justify-between py-1"
                android_ripple={{ color: 'rgba(255,255,255,0.05)' }}
            >
                <View className="flex-row items-center flex-1">
                    <View
                        className="w-2 h-2 rounded-full mr-2"
                        style={{ backgroundColor: color || colors.primary }}
                    />
                    <Text className="text-fg text-sm font-semibold">{name}</Text>
                </View>
                {selected ? (
                    <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                ) : (
                    <Ionicons name="add-circle-outline" size={20} color={colors.muted} />
                )}
            </Pressable>
            {selected ? (
                <View className="mt-1">
                    <Text className="text-muted text-xs mb-1">
                        Posición: {Math.round(value)} %
                        {restricted ? `  (límites ${lim.open}–${lim.close})` : ''}
                    </Text>
                    <Slider
                        style={{ width: '100%', height: 28 }}
                        minimumValue={lim.open}
                        maximumValue={lim.close}
                        step={1}
                        value={Math.min(lim.close, Math.max(lim.open, value))}
                        minimumTrackTintColor={color || colors.primary}
                        maximumTrackTintColor="rgba(255,255,255,0.10)"
                        thumbTintColor={color || colors.primary}
                        onValueChange={onChange}
                    />
                </View>
            ) : null}
        </View>
    );
}
