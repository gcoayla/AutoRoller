// Ajustes globales de la app (no del nodo).
// Por ahora: limpiar lista de dispositivos, info de la app.

import React from 'react';
import { Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { Section } from '@/components/Section';
import { colors } from '@/lib/colors';
import { useDevices } from '@/store/devices';
import { useUi } from '@/store/ui';

export default function SettingsScreen() {
    const clear = useDevices((s) => s.clear);
    const count = useDevices((s) => s.devices.length);
    const toast = useUi((s) => s.push);

    return (
        <Screen>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: 8, paddingBottom: 40 }}>
                <Card className="mb-3">
                    <Section title="Datos guardados" />
                    <Row label="Dispositivos guardados" value={String(count)} />
                    <Button
                        label="Borrar todos los dispositivos"
                        variant="danger"
                        full
                        onPress={() => { clear(); toast('Lista vacía', 'info'); }}
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
