// Tarjeta de un dispositivo en la lista del Home.

import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';

import { StatusPill } from '@/components/StatusPill';
import { colors } from '@/lib/colors';
import type { DeviceStatus, SavedDevice } from '@/lib/types';

type Props = {
    device: SavedDevice;
    status?: DeviceStatus;
    online?: boolean;
    onQuick?: (action: 'open' | 'close' | 'stop') => void;
};

export function DeviceCard({ device, status, online, onQuick }: Props) {
    const tint = device.color || colors.primary;
    const pct  = status?.percent ?? 0;

    return (
        <Pressable
            onPress={() => router.push(`/device/${device.id}`)}
            className="mb-3"
            android_ripple={{ color: 'rgba(255,255,255,0.05)' }}
        >
            <View className="rounded-2xl overflow-hidden border border-border">
                <LinearGradient
                    colors={[`${tint}1A`, 'transparent']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{ padding: 16 }}
                >
                    <View className="flex-row items-start justify-between">
                        <View className="flex-1 pr-3">
                            <View className="flex-row items-center mb-1">
                                <View
                                    className="w-2.5 h-2.5 rounded-full mr-2"
                                    style={{
                                        backgroundColor: tint,
                                        shadowColor: tint,
                                        shadowOpacity: 0.8,
                                        shadowRadius: 6,
                                    }}
                                />
                                <Text className="text-fg text-base font-semibold">
                                    {device.hostname}
                                </Text>
                                {device.favorite ? (
                                    <Ionicons
                                        name="star"
                                        size={14}
                                        color={colors.warn}
                                        style={{ marginLeft: 6 }}
                                    />
                                ) : null}
                            </View>
                            <Text className="text-muted text-xs">
                                {device.ip ?? `${device.hostname}.local`}
                                {status?.wifi_rssi != null ? ` · ${status.wifi_rssi} dBm` : ''}
                            </Text>
                        </View>
                        <StatusPill state={status?.state} online={online} />
                    </View>

                    {/* Barra de posición + porcentaje */}
                    <View className="mt-4 mb-2">
                        <View
                            className="h-1.5 rounded-full overflow-hidden"
                            style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}
                        >
                            <View
                                className="h-full"
                                style={{
                                    width: `${pct}%`,
                                    backgroundColor: tint,
                                }}
                            />
                        </View>
                        <View className="flex-row justify-between mt-1">
                            <Text className="text-muted text-xs">{Math.round(pct)} % cerrada</Text>
                            <Text className="text-muted text-xs">
                                {status?.calibrated ? 'Calibrada' : 'Sin calibrar'}
                            </Text>
                        </View>
                    </View>

                    {/* Acciones rápidas */}
                    <View className="flex-row gap-2 mt-2">
                        <QuickAction icon="chevron-up"   label="Subir"  onPress={() => onQuick?.('open')}  tint={tint} />
                        <QuickAction icon="square"       label="Parar"  onPress={() => onQuick?.('stop')}  tint={colors.warn} />
                        <QuickAction icon="chevron-down" label="Bajar"  onPress={() => onQuick?.('close')} tint={tint} />
                    </View>
                </LinearGradient>
            </View>
        </Pressable>
    );
}

function QuickAction({
    icon,
    label,
    onPress,
    tint,
}: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    onPress?: () => void;
    tint: string;
}) {
    return (
        <Pressable
            onPress={onPress}
            android_ripple={{ color: 'rgba(255,255,255,0.05)' }}
            className="flex-1 flex-row items-center justify-center py-2.5 rounded-xl"
            style={{
                backgroundColor: `${tint}14`,
                borderWidth: 1,
                borderColor: `${tint}33`,
            }}
        >
            <Ionicons name={icon} size={14} color={tint} style={{ marginRight: 6 }} />
            <Text className="text-xs font-semibold" style={{ color: tint }}>
                {label}
            </Text>
        </Pressable>
    );
}
