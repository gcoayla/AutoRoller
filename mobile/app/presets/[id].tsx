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
import { colors } from '@/lib/colors';
import { useDevices } from '@/store/devices';
import { usePresets } from '@/store/presets';
import { useRooms } from '@/store/rooms';
import { useUi } from '@/store/ui';
import type { PresetItem } from '@/lib/types';

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
    const [picks, setPicks] = useState<Record<string, number | undefined>>(() => {
        const m: Record<string, number> = {};
        for (const it of existing?.items ?? []) m[it.deviceId] = it.target_pct;
        return m;
    });

    useEffect(() => {
        if (!isNew && !existing) router.back();
    }, [isNew, existing]);

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

    const togglePick = (deviceId: string) =>
        setPicks((prev) => {
            const next = { ...prev };
            if (next[deviceId] === undefined) next[deviceId] = 50;
            else delete next[deviceId];
            return next;
        });

    const setPickValue = (deviceId: string, v: number) =>
        setPicks((prev) => ({ ...prev, [deviceId]: Math.round(v) }));

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
                        <Button label="Guardar" full onPress={onSave} />
                    </View>
                </View>
            </ScrollView>
        </Screen>
    );
}

function PickRow({
    name, color, selected, value, onToggle, onChange,
}: {
    name: string;
    color?: string;
    selected: boolean;
    value: number;
    onToggle: () => void;
    onChange: (v: number) => void;
}) {
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
                    <Text className="text-muted text-xs mb-1">Posición: {Math.round(value)} %</Text>
                    <Slider
                        style={{ width: '100%', height: 28 }}
                        minimumValue={0}
                        maximumValue={100}
                        step={1}
                        value={value}
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
