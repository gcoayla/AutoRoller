// Home — lista de dispositivos agrupados por habitación, con acciones de
// grupo y acceso rápido a presets.

import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { DeviceCard } from '@/components/DeviceCard';
import { Screen } from '@/components/Screen';
import { useDeviceStatus } from '@/hooks/useDeviceStatus';
import { apiFor } from '@/lib/device-client';
import { colors } from '@/lib/colors';
import { useDevices } from '@/store/devices';
import { usePresets } from '@/store/presets';
import { useRooms } from '@/store/rooms';
import { useUi } from '@/store/ui';
import type { Preset, SavedDevice } from '@/lib/types';

function DeviceRow({ device }: { device: SavedDevice }) {
    useDeviceStatus(device);
    const percent    = useDevices((s) => s.statuses[device.id]?.percent ?? 0);
    const state      = useDevices((s) => s.statuses[device.id]?.state);
    const calibrated = useDevices((s) => s.statuses[device.id]?.calibrated);
    const wifi_rssi  = useDevices((s) => s.statuses[device.id]?.wifi_rssi);
    const online     = useDevices((s) => s.onlineMap[device.id]);
    const status = { percent, state, calibrated, wifi_rssi };
    const toast  = useUi((s) => s.push);
    const client = apiFor(device);

    const onQuick = useCallback(
        async (a: 'open' | 'close' | 'stop') => {
            try {
                await client[a]();
                toast(a === 'open' ? 'Subiendo' : a === 'close' ? 'Bajando' : 'Parando', 'ok');
            } catch (e: any) {
                toast(`Error: ${e.message}`, 'error');
            }
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [device.id, device.ip, device.apiToken, toast],
    );

    return <DeviceCard device={device} status={status} online={online} onQuick={onQuick} />;
}

export default function HomeScreen() {
    const devices = useDevices((s) => s.devices);
    const rooms   = useRooms((s) => s.rooms);
    const presets = usePresets((s) => s.presets);
    const onlineMap = useDevices((s) => s.onlineMap);
    const toast   = useUi((s) => s.push);
    const [refreshing, setRefreshing] = useState(false);

    const onlineCount = Object.values(onlineMap).filter(Boolean).length;

    const grouped = useMemo(() => {
        const byRoom = new Map<string, SavedDevice[]>();
        const noRoom: SavedDevice[] = [];
        for (const d of devices) {
            if (d.roomId && rooms.find((r) => r.id === d.roomId)) {
                const arr = byRoom.get(d.roomId) ?? [];
                arr.push(d);
                byRoom.set(d.roomId, arr);
            } else {
                noRoom.push(d);
            }
        }
        const sortedRooms = rooms
            .slice()
            .sort((a, b) => a.order - b.order)
            .filter((r) => (byRoom.get(r.id) ?? []).length > 0);
        return { sortedRooms, byRoom, noRoom };
    }, [devices, rooms]);

    const onRefresh = async () => {
        setRefreshing(true);
        await new Promise((r) => setTimeout(r, 500));
        setRefreshing(false);
    };

    const groupAction = async (target: SavedDevice[], a: 'open' | 'close' | 'stop') => {
        if (target.length === 0) return;
        const results = await Promise.allSettled(target.map((d) => apiFor(d)[a]()));
        const ok = results.filter((r) => r.status === 'fulfilled').length;
        toast(`${ok}/${target.length} actualizados`, ok === target.length ? 'ok' : 'info');
    };

    const applyPreset = async (p: Preset) => {
        const valid = p.items.filter((it) => devices.some((d) => d.id === it.deviceId));
        if (valid.length === 0) {
            toast('Preset vacío', 'error');
            return;
        }
        const results = await Promise.allSettled(
            valid.map((it) => {
                const d = devices.find((x) => x.id === it.deviceId)!;
                return apiFor(d).set(it.target_pct);
            }),
        );
        const ok = results.filter((r) => r.status === 'fulfilled').length;
        toast(`${p.name}: ${ok}/${valid.length}`, ok === valid.length ? 'ok' : 'info');
    };

    return (
        <Screen>
            <ScrollView
                contentContainerStyle={{ paddingBottom: 100 }}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
                }
                showsVerticalScrollIndicator={false}
            >
                {/* Encabezado */}
                <View className="flex-row items-end justify-between mt-4 mb-6">
                    <View>
                        <Text className="text-muted text-xs uppercase tracking-widest">
                            Estación de control
                        </Text>
                        <Text className="text-fg text-3xl font-bold">AutoRoller</Text>
                        <Text className="text-muted text-sm mt-1">
                            {devices.length === 0
                                ? 'Sin dispositivos'
                                : `${devices.length} dispositivo${devices.length !== 1 ? 's' : ''} · ${onlineCount} online`}
                        </Text>
                    </View>
                    <Pressable
                        onPress={() => router.push('/settings')}
                        className="w-10 h-10 rounded-full items-center justify-center border border-border"
                        style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}
                        android_ripple={{ color: 'rgba(255,255,255,0.08)', borderless: true }}
                    >
                        <Ionicons name="settings-outline" size={18} color={colors.fg} />
                    </Pressable>
                </View>

                {/* Presets en chips horizontales */}
                {presets.length > 0 ? (
                    <View className="mb-4">
                        <View className="flex-row items-center justify-between mb-2">
                            <Text className="text-muted text-xs uppercase tracking-widest">
                                Escenas rápidas
                            </Text>
                            <Pressable onPress={() => router.push('/presets')} android_ripple={{ color: 'rgba(255,255,255,0.05)' }}>
                                <Text className="text-primary text-xs font-semibold">Ver todas</Text>
                            </Pressable>
                        </View>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            <View className="flex-row gap-2">
                                {presets.map((p) => (
                                    <Pressable
                                        key={p.id}
                                        onPress={() => applyPreset(p)}
                                        android_ripple={{ color: 'rgba(255,255,255,0.05)' }}
                                    >
                                        <View className="flex-row items-center px-4 py-2.5 rounded-2xl border border-border" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
                                            <Ionicons
                                                name={(p.icon ?? 'albums-outline') as any}
                                                size={16}
                                                color={colors.primary}
                                                style={{ marginRight: 8 }}
                                            />
                                            <Text className="text-fg text-sm font-semibold">{p.name}</Text>
                                        </View>
                                    </Pressable>
                                ))}
                                <Pressable
                                    onPress={() => router.push('/presets/new')}
                                    android_ripple={{ color: 'rgba(255,255,255,0.05)' }}
                                >
                                    <View className="flex-row items-center px-4 py-2.5 rounded-2xl border border-border" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
                                        <Ionicons name="add" size={16} color={colors.muted} style={{ marginRight: 6 }} />
                                        <Text className="text-muted text-sm font-semibold">Nuevo</Text>
                                    </View>
                                </Pressable>
                            </View>
                        </ScrollView>
                    </View>
                ) : null}

                {/* Acciones de grupo globales */}
                {devices.length > 1 ? (
                    <Card className="mb-4">
                        <Text className="text-muted text-xs uppercase tracking-widest mb-2">
                            Control global
                        </Text>
                        <View className="flex-row gap-2">
                            <View className="flex-1">
                                <Button label="Subir todo" full
                                    onPress={() => groupAction(devices, 'open')}
                                    icon={<Ionicons name="arrow-up" size={14} color="#061226" />} />
                            </View>
                            <View className="flex-1">
                                <Button label="Parar" variant="warn" full
                                    onPress={() => groupAction(devices, 'stop')}
                                    icon={<Ionicons name="square" size={14} color={colors.warn} />} />
                            </View>
                            <View className="flex-1">
                                <Button label="Bajar todo" full
                                    onPress={() => groupAction(devices, 'close')}
                                    icon={<Ionicons name="arrow-down" size={14} color="#061226" />} />
                            </View>
                        </View>
                    </Card>
                ) : null}

                {/* Empty state */}
                {devices.length === 0 ? (
                    <EmptyState />
                ) : (
                    <>
                        {grouped.sortedRooms.map((room) => {
                            const list = grouped.byRoom.get(room.id) ?? [];
                            return (
                                <View key={room.id} className="mb-3">
                                    <RoomHeader
                                        name={room.name}
                                        icon={room.icon}
                                        count={list.length}
                                        onUp={() => groupAction(list, 'open')}
                                        onStop={() => groupAction(list, 'stop')}
                                        onDown={() => groupAction(list, 'close')}
                                    />
                                    {list.map((d) => <DeviceRow key={d.id} device={d} />)}
                                </View>
                            );
                        })}
                        {grouped.noRoom.length > 0 ? (
                            <View>
                                {grouped.sortedRooms.length > 0 ? (
                                    <RoomHeader
                                        name="Sin habitación"
                                        count={grouped.noRoom.length}
                                        muted
                                    />
                                ) : null}
                                {grouped.noRoom.map((d) => <DeviceRow key={d.id} device={d} />)}
                            </View>
                        ) : null}
                    </>
                )}
            </ScrollView>

            {/* FAB añadir */}
            <Pressable
                onPress={() => router.push('/add')}
                className="absolute right-5 bottom-6 rounded-full overflow-hidden"
                style={{ elevation: 8 }}
                android_ripple={{ color: 'rgba(255,255,255,0.15)', borderless: true }}
            >
                <LinearGradient
                    colors={[colors.primary, colors.accent]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{ width: 60, height: 60, alignItems: 'center', justifyContent: 'center' }}
                >
                    <Ionicons name="add" size={28} color="#061226" />
                </LinearGradient>
            </Pressable>
        </Screen>
    );
}

function RoomHeader({
    name, icon, count, onUp, onStop, onDown, muted,
}: {
    name: string;
    icon?: string;
    count: number;
    onUp?: () => void;
    onStop?: () => void;
    onDown?: () => void;
    muted?: boolean;
}) {
    return (
        <View className="flex-row items-center mb-2">
            {icon ? (
                <Ionicons
                    name={icon as any}
                    size={16}
                    color={muted ? colors.muted : colors.primary}
                    style={{ marginRight: 6 }}
                />
            ) : null}
            <Text
                className="text-xs uppercase tracking-widest font-semibold"
                style={{ color: muted ? colors.muted : colors.fg }}
            >
                {name}
            </Text>
            <Text className="text-muted text-xs ml-2">·  {count}</Text>
            <View className="flex-1" />
            {onUp ? (
                <View className="flex-row gap-1">
                    <RoomBtn icon="arrow-up"     onPress={onUp} />
                    <RoomBtn icon="square"       onPress={onStop!} kind="warn" />
                    <RoomBtn icon="arrow-down"   onPress={onDown!} />
                </View>
            ) : null}
        </View>
    );
}

function RoomBtn({
    icon, onPress, kind,
}: { icon: keyof typeof Ionicons.glyphMap; onPress: () => void; kind?: 'warn' }) {
    const tint = kind === 'warn' ? colors.warn : colors.primary;
    return (
        <Pressable
            onPress={onPress}
            android_ripple={{ color: 'rgba(255,255,255,0.05)', borderless: true }}
            className="w-7 h-7 rounded-md items-center justify-center"
            style={{ backgroundColor: tint + '14', borderWidth: 1, borderColor: tint + '33' }}
        >
            <Ionicons name={icon} size={12} color={tint} />
        </Pressable>
    );
}

function EmptyState() {
    return (
        <View className="items-center justify-center mt-12 px-6">
            <View
                className="w-24 h-24 rounded-full items-center justify-center mb-6"
                style={{
                    backgroundColor: 'rgba(78,161,255,0.10)',
                    borderWidth: 1,
                    borderColor: colors.border,
                }}
            >
                <Ionicons name="bluetooth" size={36} color={colors.primary} />
            </View>
            <Text className="text-fg text-lg font-semibold text-center">
                Aún no tienes dispositivos
            </Text>
            <Text className="text-muted text-sm text-center mt-2 mb-6">
                Pulsa el botón "+" para descubrir un nodo AutoRoller por
                Bluetooth o añadirlo por su dirección IP.
            </Text>
            <Button
                label="Añadir mi primer dispositivo"
                onPress={() => router.push('/add')}
                icon={<Ionicons name="add" size={16} color="#061226" />}
            />
        </View>
    );
}
