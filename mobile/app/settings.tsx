// Ajustes globales de la app (no del nodo).
// Por ahora: limpiar lista de dispositivos, info de la app.

import React from 'react';
import { Alert, Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { router } from 'expo-router';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { Section } from '@/components/Section';
import { colors } from '@/lib/colors';
import { useDevices } from '@/store/devices';
import { usePresets } from '@/store/presets';
import { useRooms } from '@/store/rooms';
import { useUi } from '@/store/ui';

export default function SettingsScreen() {
    const clear      = useDevices((s) => s.clear);
    const count      = useDevices((s) => s.devices.length);
    const roomsCount = useRooms((s) => s.rooms.length);
    const presetsCount = usePresets((s) => s.presets.length);
    const toast      = useUi((s) => s.push);

    const askClear = () => {
        Alert.alert(
            'Borrar todos los dispositivos',
            `Vas a quitar ${count} dispositivo${count !== 1 ? 's' : ''} de tu lista local. ` +
            'Los nodos físicos siguen funcionando — sólo se borra el registro de esta app.',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Borrar',
                    style: 'destructive',
                    onPress: () => { clear(); toast('Lista vacía', 'info'); },
                },
            ],
        );
    };

    return (
        <Screen>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: 8, paddingBottom: 40 }}>
                <Card className="mb-3">
                    <Section title="Organización" />
                    <NavRow
                        icon="home-outline"
                        label="Habitaciones"
                        sub={`${roomsCount} creada${roomsCount !== 1 ? 's' : ''}`}
                        onPress={() => router.push('/rooms')}
                    />
                    <View className="h-px my-1" style={{ backgroundColor: colors.border }} />
                    <NavRow
                        icon="albums-outline"
                        label="Presets / escenas"
                        sub={`${presetsCount} creado${presetsCount !== 1 ? 's' : ''}`}
                        onPress={() => router.push('/presets')}
                    />
                </Card>

                <Card className="mb-3">
                    <Section title="Datos guardados" />
                    <Row label="Dispositivos guardados" value={String(count)} />
                    <Button
                        label="Borrar todos los dispositivos"
                        variant="danger"
                        full
                        onPress={askClear}
                        disabled={count === 0}
                        icon={<Ionicons name="trash-outline" size={14} color={colors.danger} />}
                    />
                </Card>

                <Card className="mb-3">
                    <Section title="Acerca de" />
                    <Row label="App" value="AutoRoller" />
                    <Row label="Versión" value={Constants.expoConfig?.version ?? '1.0.0'} />
                    <Row label="Plataforma" value="React Native + Expo" />
                </Card>

                <Card>
                    <Section title="Recursos" />
                    <LinkRow icon="book-outline"      label="Documentación del proyecto" url="https://github.com/" />
                    <LinkRow icon="bluetooth-outline" label="Provisionamiento por BLE"    url="https://github.com/" />
                    <LinkRow icon="code-slash-outline" label="API REST y MQTT"            url="https://github.com/" />
                </Card>
            </ScrollView>
        </Screen>
    );
}

function Row({ label, value }: { label: string; value: string }) {
    return (
        <View className="flex-row items-center justify-between py-2">
            <Text className="text-fg text-sm">{label}</Text>
            <Text className="text-muted text-sm font-mono">{value}</Text>
        </View>
    );
}

function NavRow({
    icon, label, sub, onPress,
}: { icon: keyof typeof Ionicons.glyphMap; label: string; sub?: string; onPress: () => void }) {
    return (
        <Pressable
            onPress={onPress}
            className="flex-row items-center justify-between py-3"
            android_ripple={{ color: 'rgba(255,255,255,0.04)' }}
        >
            <View className="flex-row items-center flex-1">
                <View
                    className="w-9 h-9 rounded-xl items-center justify-center mr-3"
                    style={{ backgroundColor: 'rgba(78,161,255,0.10)' }}
                >
                    <Ionicons name={icon} size={16} color={colors.primary} />
                </View>
                <View>
                    <Text className="text-fg text-sm font-semibold">{label}</Text>
                    {sub ? <Text className="text-muted text-xs mt-0.5">{sub}</Text> : null}
                </View>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.muted} />
        </Pressable>
    );
}

function LinkRow({
    icon, label, url,
}: { icon: keyof typeof Ionicons.glyphMap; label: string; url: string }) {
    return (
        <Pressable
            onPress={() => Linking.openURL(url).catch(() => {})}
            className="flex-row items-center justify-between py-3"
            android_ripple={{ color: 'rgba(255,255,255,0.04)' }}
        >
            <View className="flex-row items-center">
                <Ionicons name={icon} size={16} color={colors.muted} />
                <Text className="text-fg text-sm ml-2">{label}</Text>
            </View>
            <Ionicons name="open-outline" size={14} color={colors.muted} />
        </Pressable>
    );
}
