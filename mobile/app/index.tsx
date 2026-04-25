// Home — lista de dispositivos guardados con acciones rápidas y de grupo.

import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
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
import { useUi } from '@/store/ui';
import type { SavedDevice } from '@/lib/types';

function DeviceRow({ device }: { device: SavedDevice }) {
    useDeviceStatus(device);
    // Selectores granulares: en Zustand v5 cada selector retorna primitivas
    // referencialmente estables, así que sólo re-renderiza cuando cambian
    // las que esta tarjeta usa.
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
    const toast   = useUi((s) => s.push);
    const [refreshing, setRefreshing] = useState(false);

    const onlineCount = useDevices(
        useCallback((s) => Object.values(s.onlineMap).filter(Boolean).length, []),
    );

    const onRefresh = async () => {
        setRefreshing(true);
        await new Promise((r) => setTimeout(r, 500));
        setRefreshing(false);
    };

    const groupAction = async (a: 'open' | 'close' | 'stop') => {
        const results = await Promise.allSettled(
            devices.map((d) => apiFor(d)[a]()),
        );
        const ok = results.filter((r) => r.status === 'fulfilled').length;
        toast(`${ok}/${devices.length} actualizados`, ok === devices.length ? 'ok' : 'info');
    };

    const header = useMemo(
        () => (
            <View>
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

                {/* Acciones de grupo */}
                {devices.length > 1 ? (
                    <Card className="mb-4">
                        <Text className="text-muted text-xs uppercase tracking-widest mb-2">
                            Control de grupo
                        </Text>
                        <View className="flex-row gap-2">
                            <View className="flex-1">
                                <Button
                                    label="Subir todo"
                                    icon={<Ionicons name="arrow-up" size={14} color="#061226" />}
                                    onPress={() => groupAction('open')}
                                    full
                                />
                            </View>
                            <View className="flex-1">
                                <Button
                                    label="Parar"
                                    variant="warn"
                                    icon={<Ionicons name="square" size={14} color={colors.warn} />}
                                    onPress={() => groupAction('stop')}
                                    full
                                />
                            </View>
                            <View className="flex-1">
                                <Button
                                    label="Bajar todo"
                                    icon={<Ionicons name="arrow-down" size={14} color="#061226" />}
                                    onPress={() => groupAction('close')}
                                    full
                                />
                            </View>
                        </View>
                    </Card>
                ) : null}
            </View>
        ),
        [devices.length, onlineCount],
    );

    return (
        <Screen>
            <FlatList
                data={devices}
                keyExtractor={(d) => d.id}
                renderItem={({ item }) => <DeviceRow device={item} />}
                ListHeaderComponent={header}
                ListEmptyComponent={<EmptyState />}
                contentContainerStyle={{ paddingBottom: 100 }}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={colors.primary}
                    />
                }
                showsVerticalScrollIndicator={false}
            />

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
                    style={{
                        width: 60,
                        height: 60,
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <Ionicons name="add" size={28} color="#061226" />
                </LinearGradient>
            </Pressable>
        </Screen>
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
