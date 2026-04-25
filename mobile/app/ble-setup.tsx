// Wizard de provisionamiento por BLE.
// Guía al usuario paso a paso: conectar → escoger WiFi → MQTT (opcional) → fin.

import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Field } from '@/components/Field';
import { Screen } from '@/components/Screen';
import { Section } from '@/components/Section';
import { SignalIcon } from '@/components/SignalIcon';
import { Switch } from '@/components/Switch';
import { BleSession } from '@/lib/ble';
import { colors } from '@/lib/colors';
import type { WifiNetwork } from '@/lib/types';
import { useDevices } from '@/store/devices';
import { useUi } from '@/store/ui';

type Step = 'connecting' | 'identity' | 'wifi' | 'extras' | 'done';

export default function BleSetupScreen() {
    const { id, name, existing } = useLocalSearchParams<{
        id: string; name: string; existing?: string;
    }>();
    const isReconfig = !!existing;
    const [step, setStep] = useState<Step>('connecting');
    const [session, setSession] = useState<BleSession | null>(null);
    const [hostname, setHostname] = useState(String(name || 'autoroller'));
    const [networks, setNetworks] = useState<WifiNetwork[]>([]);
    const [scanning, setScanning] = useState(false);
    const [ssid, setSsid]         = useState('');
    const [pass, setPass]         = useState('');
    const [mqttOn, setMqttOn]     = useState(false);
    const [mqttHost, setMqttHost] = useState('');
    const [mqttPort, setMqttPort] = useState('1883');
    const [mqttBase, setMqttBase] = useState('autoroller');
    const [mqttUser, setMqttUser] = useState('');
    const [mqttPass, setMqttPass] = useState('');
    const [tz, setTz]             = useState('CET-1CEST,M3.5.0/2,M10.5.0/3');
    const [resultIp, setResultIp] = useState<string | undefined>();

    const add    = useDevices((s) => s.add);
    const update = useDevices((s) => s.update);
    const toast  = useUi((s) => s.push);

    // ---- conexión inicial -------------------------------------------------
    useEffect(() => {
        let s: BleSession | null = null;
        (async () => {
            try {
                s = await BleSession.connect(String(id));
                setSession(s);
                // En reconfiguración saltamos directo a "wifi" tras leer la
                // config actual y pre-rellenar campos.
                if (isReconfig) {
                    try {
                        const cfg: any = await s.getConfig();
                        if (cfg?.hostname) setHostname(cfg.hostname);
                        if (cfg?.mqtt_enabled) {
                            setMqttOn(true);
                            if (cfg.mqtt_host)       setMqttHost(cfg.mqtt_host);
                            if (cfg.mqtt_port)       setMqttPort(String(cfg.mqtt_port));
                            if (cfg.mqtt_user)       setMqttUser(cfg.mqtt_user);
                            if (cfg.mqtt_base_topic) setMqttBase(cfg.mqtt_base_topic);
                        }
                        if (cfg?.timezone) setTz(cfg.timezone);
                    } catch {}
                    setStep('wifi');
                    // disparamos el escaneo
                    s.scanWifi().then((r: any) => {
                        const list = (r.networks || []).sort(
                            (a: any, b: any) => b.rssi - a.rssi,
                        );
                        setNetworks(list);
                    }).catch(() => {});
                } else {
                    setStep('identity');
                }
            } catch (e: any) {
                toast(`No se pudo conectar: ${e.message}`, 'error');
                router.back();
            }
        })();
        return () => {
            s?.disconnect().catch(() => {});
        };
    }, [id, toast, isReconfig]);

    // ---- escaneo WiFi -----------------------------------------------------
    const scanWifi = async () => {
        if (!session) return;
        setScanning(true);
        try {
            const r = await session.scanWifi();
            const list: WifiNetwork[] = (r.networks || []).sort(
                (a: WifiNetwork, b: WifiNetwork) => b.rssi - a.rssi,
            );
            setNetworks(list);
        } catch (e: any) {
            toast(`Error escaneando: ${e.message}`, 'error');
        } finally {
            setScanning(false);
        }
    };

    // ---- guardar y avanzar ------------------------------------------------
    const saveIdentity = async () => {
        if (!session) return;
        try {
            await session.setHostname(hostname);
            setStep('wifi');
            scanWifi();
        } catch (e: any) {
            toast(e.message, 'error');
        }
    };

    const saveWifi = async () => {
        if (!session) return;
        if (!ssid.trim()) {
            toast('Selecciona o escribe un SSID', 'error');
            return;
        }
        try {
            await session.setWifi(ssid.trim(), pass);
            setStep('extras');
        } catch (e: any) {
            toast(e.message, 'error');
        }
    };

    const saveExtras = async () => {
        if (!session) return;
        try {
            if (mqttOn) {
                await session.setMqtt({
                    enabled: true,
                    host: mqttHost,
                    port: Number(mqttPort) || 1883,
                    user: mqttUser,
                    password: mqttPass,
                    base_topic: mqttBase,
                });
            } else {
                await session.setMqtt({ enabled: false });
            }
            await session.setTime({
                enabled: true,
                server: 'pool.ntp.org',
                timezone: tz,
            });
            // pedimos info para conocer la IP final
            try {
                const info: any = await session.info();
                if (info?.wifi_ip && info.wifi_ip !== '0.0.0.0') {
                    setResultIp(info.wifi_ip);
                }
            } catch {}
            setStep('done');
        } catch (e: any) {
            toast(e.message, 'error');
        }
    };

    const finish = () => {
        if (isReconfig && existing) {
            // Actualizamos el dispositivo existente en lugar de crear otro.
            update(String(existing), {
                hostname,
                ip: resultIp,
                bleId: String(id),
            });
            toast('Reconfigurado', 'ok');
            router.replace(`/device/${existing}`);
            return;
        }
        const localId = `ble-${id}`;
        add({
            id: localId,
            hostname,
            ip: resultIp,
            bleId: String(id),
            addedAt: Date.now(),
        });
        toast('Dispositivo configurado', 'ok');
        router.replace(`/device/${localId}`);
    };

    const stepIndex = useMemo(
        () => ({ connecting: 0, identity: 1, wifi: 2, extras: 3, done: 4 }[step]),
        [step],
    );

    return (
        <Screen>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
                <Stepper current={stepIndex} />

                {step === 'connecting' && (
                    <Card className="items-center py-8">
                        <ActivityIndicator size="large" color={colors.primary} />
                        <Text className="text-fg font-semibold text-base mt-3">
                            Conectando vía Bluetooth...
                        </Text>
                        <Text className="text-muted text-sm mt-1 text-center">
                            Establecer la sesión GATT y negociar MTU
                        </Text>
                    </Card>
                )}

                {step === 'identity' && (
                    <Card>
                        <Section title="Identifica el dispositivo" subtitle="Paso 1 de 3" />
                        <Field
                            label="Nombre"
                            placeholder="autoroller-salon"
                            value={hostname}
                            onChangeText={setHostname}
                            autoCapitalize="none"
                            hint="También será su nombre mDNS (.local)"
                        />
                        <Button label="Continuar" full onPress={saveIdentity} />
                    </Card>
                )}

                {step === 'wifi' && (
                    <View>
                        <Card className="mb-3">
                            <Section
                                title="Conecta a tu WiFi"
                                subtitle="Paso 2 de 3"
                                right={
                                    <Pressable onPress={scanWifi} className="px-2 py-1.5 rounded-lg" style={{ backgroundColor: 'rgba(78,161,255,0.10)' }}>
                                        <Text className="text-primary text-xs font-semibold">
                                            {scanning ? 'Buscando...' : 'Re-escanear'}
                                        </Text>
                                    </Pressable>
                                }
                            />
                            {scanning && networks.length === 0 ? (
                                <View className="py-6 items-center">
                                    <ActivityIndicator color={colors.primary} />
                                </View>
                            ) : (
                                networks.map((n) => (
                                    <Pressable
                                        key={`${n.ssid}-${n.channel}`}
                                        onPress={() => setSsid(n.ssid)}
                                        className="flex-row items-center justify-between py-2.5 border-b border-border"
                                        android_ripple={{ color: 'rgba(255,255,255,0.05)' }}
                                    >
                                        <View className="flex-1 pr-2">
                                            <Text className="text-fg font-semibold">{n.ssid || '(oculta)'}</Text>
                                            <Text className="text-muted text-xs">
                                                Canal {n.channel} · {n.open ? 'Abierta' : 'Protegida'}
                                            </Text>
                                        </View>
                                        <SignalIcon rssi={n.rssi} />
                                        {ssid === n.ssid ? (
                                            <Ionicons
                                                name="checkmark-circle"
                                                size={18}
                                                color={colors.primary}
                                                style={{ marginLeft: 8 }}
                                            />
                                        ) : null}
                                    </Pressable>
                                ))
                            )}
                        </Card>

                        <Card>
                            <Field
                                label="SSID"
                                value={ssid}
                                onChangeText={setSsid}
                                autoCapitalize="none"
                                placeholder="MiWiFi"
                            />
                            <Field
                                label="Contraseña"
                                value={pass}
                                onChangeText={setPass}
                                secureTextEntry
                                autoCapitalize="none"
                            />
                            <Button label="Conectar" full onPress={saveWifi} />
                        </Card>
                    </View>
                )}

                {step === 'extras' && (
                    <View>
                        <Card className="mb-3">
                            <Section title="MQTT (opcional)" subtitle="Paso 3 de 3" />
                            <Switch
                                label="Activar MQTT"
                                value={mqttOn}
                                onValueChange={setMqttOn}
                                hint="Para integrar con Home Assistant, Node-RED, etc."
                            />
                            {mqttOn ? (
                                <>
                                    <Field label="Host"      value={mqttHost} onChangeText={setMqttHost} placeholder="192.168.1.10" autoCapitalize="none" />
                                    <Field label="Puerto"    value={mqttPort} onChangeText={setMqttPort} keyboardType="number-pad" />
                                    <Field label="Topic base" value={mqttBase} onChangeText={setMqttBase} autoCapitalize="none" />
                                    <Field label="Usuario"   value={mqttUser} onChangeText={setMqttUser} autoCapitalize="none" />
                                    <Field label="Contraseña" value={mqttPass} onChangeText={setMqttPass} secureTextEntry />
                                </>
                            ) : null}
                        </Card>

                        <Card>
                            <Section title="Hora / NTP" />
                            <Field
                                label="Zona horaria (POSIX)"
                                value={tz}
                                onChangeText={setTz}
                                autoCapitalize="none"
                                hint="Por defecto: Europa/Madrid"
                            />
                            <Button label="Finalizar" full onPress={saveExtras} />
                        </Card>
                    </View>
                )}

                {step === 'done' && (
                    <Card className="items-center py-8">
                        <View
                            className="w-16 h-16 rounded-full items-center justify-center mb-4"
                            style={{ backgroundColor: 'rgba(78,255,177,0.16)' }}
                        >
                            <Ionicons name="checkmark" size={32} color={colors.success} />
                        </View>
                        <Text className="text-fg font-semibold text-lg">¡Listo!</Text>
                        <Text className="text-muted text-sm text-center mt-2 mb-1">
                            {hostname} se ha configurado correctamente.
                        </Text>
                        {resultIp ? (
                            <Text className="text-muted font-mono text-xs mb-4">
                                IP: {resultIp}
                            </Text>
                        ) : (
                            <Text className="text-muted text-xs mb-4">
                                Conectándose a tu red...
                            </Text>
                        )}
                        <Button label="Abrir dispositivo" full onPress={finish} />
                    </Card>
                )}
            </ScrollView>
        </Screen>
    );
}

function Stepper({ current }: { current: number }) {
    const steps = ['Conectar', 'Identidad', 'WiFi', 'Extras', 'Listo'];
    return (
        <View className="flex-row items-center mt-3 mb-5">
            {steps.map((label, i) => {
                const done = i < current;
                const active = i === current;
                return (
                    <React.Fragment key={label}>
                        <View className="items-center" style={{ width: 32 }}>
                            <View
                                className="w-7 h-7 rounded-full items-center justify-center"
                                style={{
                                    backgroundColor: done
                                        ? colors.success + '33'
                                        : active
                                          ? colors.primary + '33'
                                          : 'rgba(255,255,255,0.05)',
                                    borderWidth: 1,
                                    borderColor: done
                                        ? colors.success
                                        : active
                                          ? colors.primary
                                          : colors.border,
                                }}
                            >
                                {done ? (
                                    <Ionicons name="checkmark" size={14} color={colors.success} />
                                ) : (
                                    <Text
                                        className="text-xs font-semibold"
                                        style={{ color: active ? colors.primary : colors.muted }}
                                    >
                                        {i + 1}
                                    </Text>
                                )}
                            </View>
                            <Text
                                className="text-[10px] mt-1"
                                style={{ color: active ? colors.fg : colors.muted }}
                            >
                                {label}
                            </Text>
                        </View>
                        {i < steps.length - 1 ? (
                            <View
                                className="flex-1 h-px mx-1"
                                style={{
                                    backgroundColor: i < current ? colors.success : colors.border,
                                }}
                            />
                        ) : null}
                    </React.Fragment>
                );
            })}
        </View>
    );
}
