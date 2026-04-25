// Pantalla "Añadir dispositivo": dos modos paralelos.
//   1. BLE (escaneo + provisionamiento por wizard).
//   2. WiFi (manual: hostname o IP).

import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Field } from '@/components/Field';
import { Screen } from '@/components/Screen';
import { Section } from '@/components/Section';
import { SignalIcon } from '@/components/SignalIcon';
import * as ble from '@/lib/ble';
import { api } from '@/lib/http';
import { colors } from '@/lib/colors';
import { useDevices } from '@/store/devices';
import { useUi } from '@/store/ui';

type ScanItem = { id: string; name: string; rssi: number };

export default function AddScreen() {
    const [tab, setTab] = useState<'ble' | 'wifi'>('ble');

    return (
        <Screen>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>
                <View className="flex-row mt-3 mb-4 p-1 rounded-2xl border border-border" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
                    <Tab label="Bluetooth" active={tab === 'ble'}  onPress={() => setTab('ble')}  icon="bluetooth" />
                    <Tab label="WiFi"      active={tab === 'wifi'} onPress={() => setTab('wifi')} icon="wifi" />
                </View>

                {tab === 'ble' ? <BleAdd /> : <WifiAdd />}
            </ScrollView>
        </Screen>
    );
}

function Tab({
    label,
    active,
    onPress,
    icon,
}: {
    label: string;
    active: boolean;
    onPress: () => void;
    icon: keyof typeof Ionicons.glyphMap;
}) {
    return (
        <Pressable
            onPress={onPress}
            className="flex-1 flex-row items-center justify-center py-2.5 rounded-xl"
            style={{
                backgroundColor: active ? 'rgba(78,161,255,0.18)' : 'transparent',
            }}
            android_ripple={{ color: 'rgba(255,255,255,0.05)' }}
        >
            <Ionicons name={icon} size={14} color={active ? colors.primary : colors.muted} style={{ marginRight: 6 }} />
            <Text
                className="text-sm font-semibold"
                style={{ color: active ? colors.primary : colors.muted }}
            >
                {label}
            </Text>
        </Pressable>
    );
}

// ---------------------------------------------------------------------------
//  BLE
// ---------------------------------------------------------------------------
function BleAdd() {
    const [scanning, setScanning] = useState(false);
    const [items, setItems] = useState<ScanItem[]>([]);
    const stopRef = useRef<(() => void) | null>(null);
    const toast = useUi((s) => s.push);

    useEffect(() => () => { stopRef.current?.(); }, []);

    const startScan = async () => {
        const ok = await ble.requestPermissions();
        if (!ok) {
            toast('Permisos Bluetooth denegados', 'error');
            return;
        }
        setItems([]);
        setScanning(true);
        stopRef.current = ble.scan((d) =>
            setItems((prev) => (prev.find((p) => p.id === d.id) ? prev : [...prev, d])),
        8000);
        setTimeout(() => setScanning(false), 8000);
    };

    return (
        <View>
            <Card className="mb-4">
                <View className="flex-row items-center mb-2">
                    <Ionicons name="bluetooth" size={18} color={colors.primary} />
                    <Text className="text-fg font-semibold text-base ml-2">
                        Descubrimiento Bluetooth
                    </Text>
                </View>
                <Text className="text-muted text-sm mb-4">
                    Asegúrate de que el nodo está alimentado y cerca. El nombre
                    BLE empieza por <Text className="text-fg font-mono">AutoRoller-XXXX</Text>.
                </Text>
                <Button
                    label={scanning ? 'Buscando...' : 'Iniciar búsqueda'}
                    onPress={startScan}
                    disabled={scanning}
                    icon={
                        scanning ? (
                            <ActivityIndicator size="small" color="#061226" />
                        ) : (
                            <Ionicons name="search" size={16} color="#061226" />
                        )
                    }
                    full
                />
            </Card>

            <Section title="Dispositivos cercanos" subtitle="Toca para configurar" />
            {items.length === 0 ? (
                <Card className="items-center py-6">
                    <Ionicons name="radio-outline" size={28} color={colors.muted} />
                    <Text className="text-muted text-sm mt-2">
                        {scanning ? 'Buscando nodos...' : 'Sin resultados todavía'}
                    </Text>
                </Card>
            ) : (
                items.map((it) => (
                    <Pressable
                        key={it.id}
                        onPress={() => router.push({ pathname: '/ble-setup', params: { id: it.id, name: it.name } })}
                        android_ripple={{ color: 'rgba(255,255,255,0.05)' }}
                    >
                        <Card className="mb-2 flex-row items-center justify-between">
                            <View>
                                <Text className="text-fg font-semibold">{it.name}</Text>
                                <Text className="text-muted text-xs mt-0.5">{it.id}</Text>
                            </View>
                            <View className="flex-row items-center">
                                <SignalIcon rssi={it.rssi} />
                                <Text className="text-muted text-xs ml-2">{it.rssi} dBm</Text>
                                <Ionicons name="chevron-forward" size={16} color={colors.muted} style={{ marginLeft: 8 }} />
                            </View>
                        </Card>
                    </Pressable>
                ))
            )}
        </View>
    );
}

// ---------------------------------------------------------------------------
//  WiFi (manual)
// ---------------------------------------------------------------------------
function WifiAdd() {
    const [host, setHost] = useState('');
    const [token, setToken] = useState('');
    const [busy, setBusy] = useState(false);
    const add = useDevices((s) => s.add);
    const toast = useUi((s) => s.push);

    const onAdd = async () => {
        const value = host.trim().replace(/^https?:\/\//, '').replace(/\/$/, '');
        if (!value) {
            toast('Introduce un hostname o IP', 'error');
            return;
        }
        setBusy(true);
        try {
            const status = await api.status(value, token || undefined);
            const id = `wifi-${value}`;
            add({
                id,
                hostname: status.device || value,
                ip: status.wifi_ip || (value.match(/^\d/) ? value : undefined),
                apiToken: token || undefined,
                addedAt: Date.now(),
            });
            toast('Dispositivo añadido', 'ok');
            router.replace(`/device/${id}`);
        } catch (e: any) {
            toast(`No responde: ${e.message}`, 'error');
        } finally {
            setBusy(false);
        }
    };

    return (
        <View>
            <Card className="mb-4">
                <View className="flex-row items-center mb-2">
                    <Ionicons name="wifi" size={18} color={colors.primary} />
                    <Text className="text-fg font-semibold text-base ml-2">
                        Añadir por dirección
                    </Text>
                </View>
                <Text className="text-muted text-sm mb-4">
                    Si el nodo ya está en tu WiFi, introduce su hostname mDNS
                    (p. ej. <Text className="text-fg font-mono">autoroller-salon.local</Text>)
                    o su IP.
                </Text>
                <Field
                    label="Hostname o IP"
                    placeholder="autoroller-salon.local"
                    value={host}
                    onChangeText={setHost}
                    autoCapitalize="none"
                    autoCorrect={false}
                />
                <Field
                    label="Token API (opcional)"
                    placeholder="Sólo si el nodo lo exige"
                    value={token}
                    onChangeText={setToken}
                    autoCapitalize="none"
                    autoCorrect={false}
                    secureTextEntry
                />
                <Button
                    label={busy ? 'Comprobando...' : 'Añadir dispositivo'}
                    onPress={onAdd}
                    disabled={busy}
                    full
                    icon={
                        busy ? (
                            <ActivityIndicator size="small" color="#061226" />
                        ) : (
                            <Ionicons name="add" size={16} color="#061226" />
                        )
                    }
                />
            </Card>

            <Card>
                <Text className="text-muted text-xs uppercase tracking-widest mb-2">
                    Consejo
                </Text>
                <Text className="text-muted text-sm">
                    Si es la primera vez que enciendes el nodo, usa la pestaña
                    Bluetooth para configurar la WiFi. Después podrás controlarlo
                    por la red local sin problemas.
                </Text>
            </Card>
        </View>
    );
}
