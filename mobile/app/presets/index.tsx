// Lista de presets/escenas. Cada card permite activar el preset o editarlo.

import React from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { Section } from '@/components/Section';
import { apiFor } from '@/lib/device-client';
import { colors } from '@/lib/colors';
import { useDevices } from '@/store/devices';
import { usePresets } from '@/store/presets';
import { useUi } from '@/store/ui';
import type { Preset } from '@/lib/types';

export default function PresetsScreen() {
    const presets = usePresets((s) => s.presets);
    const remove  = usePresets((s) => s.remove);
    const devices = useDevices((s) => s.devices);
    const onlineMap = useDevices((s) => s.onlineMap);
    const toast   = useUi((s) => s.push);

    const apply = async (p: Preset) => {
        const knownItems = p.items.filter((it) => devices.some((d) => d.id === it.deviceId));
        if (knownItems.length === 0) {
            toast('Este preset no tiene dispositivos', 'error');
            return;
        }
        const offline = knownItems.filter((it) => onlineMap[it.deviceId] === false).length;
        if (offline === knownItems.length) {
            toast('Todos los dispositivos del preset están offline', 'error');
            return;
        }

        const results = await Promise.allSettled(
            knownItems.map((it) => {
                const d = devices.find((x) => x.id === it.deviceId)!;
                return apiFor(d).set(it.target_pct);
            }),
        );
        const ok = results.filter((r) => r.status === 'fulfilled').length;
        toast(
            `${p.name}: ${ok}/${knownItems.length} aplicados`,
            ok === knownItems.length ? 'ok' : 'info',
        );
    };

    const askRemove = (p: Preset) => {
        Alert.alert(
            `Eliminar "${p.name}"`,
            'Solo se borra el preset; los dispositivos no se ven afectados.',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Eliminar',
                    style: 'destructive',
                    onPress: () => { remove(p.id); toast('Preset eliminado', 'info'); },
                },
            ],
        );
    };

    return (
        <Screen>
            <ScrollView contentContainerStyle={{ paddingTop: 12, paddingBottom: 60 }}>
                <Card className="mb-3">
                    <Section title="Presets" subtitle="Escenas multi-dispositivo" />
                    <Text className="text-muted text-sm mb-3">
                        Combina posiciones de varias cortinas en un solo botón:
                        "Modo Cine", "Buenas Noches", "Despertador"…
                    </Text>
                    <Button
                        label="Nuevo preset"
                        full
                        onPress={() => router.push('/presets/new')}
                        icon={<Ionicons name="add" size={14} color="#061226" />}
                    />
                </Card>

                {presets.length === 0 ? (
                    <Card className="items-center py-6">
                        <Ionicons name="albums-outline" size={28} color={colors.muted} />
                        <Text className="text-muted text-sm mt-2">Aún no tienes presets</Text>
                    </Card>
                ) : (
                    presets.map((p) => (
                        <PresetCard
                            key={p.id}
                            preset={p}
                            onApply={() => apply(p)}
                            onEdit={() => router.push(`/presets/${p.id}`)}
                            onDelete={() => askRemove(p)}
                        />
                    ))
                )}
            </ScrollView>
        </Screen>
    );
}

function PresetCard({
    preset, onApply, onEdit, onDelete,
}: { preset: Preset; onApply: () => void; onEdit: () => void; onDelete: () => void }) {
    const devices = useDevices((s) => s.devices);
    const valid = preset.items.filter((it) => devices.some((d) => d.id === it.deviceId));

    return (
        <View className="mb-3 rounded-2xl overflow-hidden border border-border">
            <LinearGradient
                colors={['rgba(78,161,255,0.14)', 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ padding: 16 }}
            >
                <View className="flex-row items-center mb-2">
                    <View
                        className="w-10 h-10 rounded-xl items-center justify-center mr-3"
                        style={{ backgroundColor: 'rgba(78,161,255,0.18)' }}
                    >
                        <Ionicons
                            name={(preset.icon ?? 'albums-outline') as any}
                            size={20}
                            color={colors.primary}
                        />
                    </View>
                    <View className="flex-1">
                        <Text className="text-fg text-base font-semibold">{preset.name}</Text>
                        <Text className="text-muted text-xs">
                            {valid.length} dispositivo{valid.length !== 1 ? 's' : ''}
                        </Text>
                    </View>
                    <Pressable onPress={onEdit} className="p-2" android_ripple={{ color: 'rgba(255,255,255,0.05)', borderless: true }}>
                        <Ionicons name="create-outline" size={18} color={colors.muted} />
                    </Pressable>
                    <Pressable onPress={onDelete} className="p-2" android_ripple={{ color: 'rgba(255,255,255,0.05)', borderless: true }}>
                        <Ionicons name="trash-outline" size={18} color={colors.muted} />
                    </Pressable>
                </View>

                {valid.length > 0 ? (
                    <View className="flex-row flex-wrap gap-1.5 mb-3">
                        {valid.slice(0, 4).map((it) => {
                            const d = devices.find((x) => x.id === it.deviceId);
                            return (
                                <View
                                    key={it.deviceId}
                                    className="flex-row items-center px-2 py-1 rounded-md"
                                    style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
                                >
                                    <View
                                        className="w-1.5 h-1.5 rounded-full mr-1.5"
                                        style={{ backgroundColor: d?.color || colors.primary }}
                                    />
                                    <Text className="text-fg text-xs">
                                        {d?.hostname || '?'} · {it.target_pct}%
                                    </Text>
                                </View>
                            );
                        })}
                        {valid.length > 4 ? (
                            <View className="px-2 py-1 rounded-md" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
                                <Text className="text-muted text-xs">+{valid.length - 4} más</Text>
                            </View>
                        ) : null}
                    </View>
                ) : null}

                <Button label="Activar" full onPress={onApply} icon={<Ionicons name="play" size={14} color="#061226" />} />
            </LinearGradient>
        </View>
    );
}
