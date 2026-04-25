// Pantalla de control + configuración de un dispositivo concreto.
// Pestañas: Control · Programación · Ajustes · Avanzado.

import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { CurtainViz } from '@/components/CurtainViz';
import { Field } from '@/components/Field';
import { PositionSlider } from '@/components/PositionSlider';
import { Screen } from '@/components/Screen';
import { Section } from '@/components/Section';
import { StatusPill } from '@/components/StatusPill';
import { Switch } from '@/components/Switch';
import { useDeviceStatus } from '@/hooks/useDeviceStatus';
import { api } from '@/lib/http';
import { colors } from '@/lib/colors';
import type { DeviceConfig, Schedule } from '@/lib/types';
import { useDevices } from '@/store/devices';
import { useUi } from '@/store/ui';

type Tab = 'control' | 'sched' | 'config' | 'adv';

export default function DeviceDetail() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const device  = useDevices((s) => s.devices.find((d) => d.id === id));
    // Selectores granulares (Zustand v5 ya no admite equalityFn).
    const percent     = useDevices((s) => s.statuses[String(id)]?.percent ?? 0);
    const stState     = useDevices((s) => s.statuses[String(id)]?.state);
    const calibrated  = useDevices((s) => s.statuses[String(id)]?.calibrated);
    const wifi_rssi   = useDevices((s) => s.statuses[String(id)]?.wifi_rssi);
    const wifi_ip     = useDevices((s) => s.statuses[String(id)]?.wifi_ip);
    const status     = { percent, state: stState, calibrated, wifi_rssi, wifi_ip };
    const online     = useDevices((s) => s.onlineMap[String(id)]);
    const remove     = useDevices((s) => s.remove);
    const fav        = useDevices((s) => s.toggleFavorite);
    const toast      = useUi((s) => s.push);

    const [tab, setTab] = useState<Tab>('control');

    useEffect(() => {
        if (!device) router.back();
    }, [device]);

    // hook siempre llamado: si no hay device, pasa un placeholder seguro
    useDeviceStatus(device ?? { id: '__none__', hostname: '__none__', addedAt: 0 });

    if (!device) return null;

    const host = device.ip || `${device.hostname}.local`;
    const tint = device.color || colors.primary;

    return (
        <Screen>
            <Header
                hostname={device.hostname}
                host={host}
                status={status}
                online={online}
                fav={device.favorite}
                onFav={() => fav(device.id)}
                onRemove={() => {
                    remove(device.id);
                    router.back();
                    toast('Dispositivo eliminado', 'info');
                }}
            />

            {/* Tabs */}
            <View className="flex-row mt-2 mb-4 p-1 rounded-2xl border border-border" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
                <TabBtn label="Control"     active={tab === 'control'} onPress={() => setTab('control')} />
                <TabBtn label="Programador" active={tab === 'sched'}   onPress={() => setTab('sched')}   />
                <TabBtn label="Ajustes"     active={tab === 'config'}  onPress={() => setTab('config')}  />
                <TabBtn label="Avanzado"    active={tab === 'adv'}     onPress={() => setTab('adv')}     />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>
                {tab === 'control' && <ControlTab host={host} percent={percent} tint={tint} />}
                {tab === 'sched'   && <SchedTab   host={host} />}
                {tab === 'config'  && <ConfigTab  host={host} />}
                {tab === 'adv'     && <AdvancedTab host={host} deviceId={device.id} />}
            </ScrollView>
        </Screen>
    );
}

// ---------------------------------------------------------------------------
//  Header
// ---------------------------------------------------------------------------
function Header({
    hostname, host, status, online, fav, onFav, onRemove,
}: {
    hostname: string;
    host: string;
    status?: any;
    online?: boolean;
    fav?: boolean;
    onFav: () => void;
    onRemove: () => void;
}) {
    return (
        <View className="mt-3 mb-3 flex-row items-center justify-between">
            <Pressable onPress={() => router.back()} className="p-2 -ml-2" android_ripple={{ color: 'rgba(255,255,255,0.05)', borderless: true }}>
                <Ionicons name="chevron-back" size={22} color={colors.fg} />
            </Pressable>
            <View className="flex-1 mx-2">
                <Text className="text-fg text-lg font-semibold" numberOfLines={1}>{hostname}</Text>
                <View className="flex-row items-center mt-0.5">
                    <Text className="text-muted text-xs flex-1" numberOfLines={1}>{host}</Text>
                    <StatusPill state={status?.state} online={online} />
                </View>
            </View>
            <Pressable onPress={onFav} className="p-2" android_ripple={{ color: 'rgba(255,255,255,0.05)', borderless: true }}>
                <Ionicons name={fav ? 'star' : 'star-outline'} size={20} color={fav ? colors.warn : colors.muted} />
            </Pressable>
            <Pressable onPress={onRemove} className="p-2 -mr-2" android_ripple={{ color: 'rgba(255,255,255,0.05)', borderless: true }}>
                <Ionicons name="trash-outline" size={20} color={colors.muted} />
            </Pressable>
        </View>
    );
}

function TabBtn({
    label, active, onPress,
}: { label: string; active: boolean; onPress: () => void }) {
    return (
        <Pressable
            onPress={onPress}
            className="flex-1 items-center py-2 rounded-xl"
            style={{
                backgroundColor: active ? 'rgba(78,161,255,0.18)' : 'transparent',
            }}
            android_ripple={{ color: 'rgba(255,255,255,0.05)' }}
        >
            <Text
                className="text-xs font-semibold"
                style={{ color: active ? colors.primary : colors.muted }}
            >
                {label}
            </Text>
        </Pressable>
    );
}

// ---------------------------------------------------------------------------
//  Control
// ---------------------------------------------------------------------------
function ControlTab({ host, percent, tint }: { host: string; percent: number; tint: string }) {
    const [local, setLocal] = useState<number | null>(null);
    const toast = useUi((s) => s.push);

    useEffect(() => { if (local !== null) setLocal(null); /* reset al cambiar % real */ }, [percent]);

    const v = local ?? percent;

    const send = async (a: 'open' | 'close' | 'stop' | 'set', value?: number) => {
        try {
            if (a === 'set' && value !== undefined) await api.set(host, value);
            else if (a !== 'set') await api[a](host);
            toast('OK', 'ok');
        } catch (e: any) {
            toast(e.message, 'error');
        }
    };

    return (
        <View>
            <Card className="mb-3">
                <CurtainViz percent={v} tint={tint} height={220} />
            </Card>

            <Card className="mb-3">
                <PositionSlider
                    value={v}
                    onChange={setLocal}
                    onCommit={(x) => { send('set', x); setLocal(null); }}
                    tint={tint}
                />
            </Card>

            <Card>
                <View className="flex-row gap-2">
                    <View className="flex-1">
                        <Button label="Subir" full onPress={() => send('open')} icon={<Ionicons name="arrow-up" size={14} color="#061226" />} />
                    </View>
                    <View className="flex-1">
                        <Button label="Parar" variant="warn" full onPress={() => send('stop')} icon={<Ionicons name="square" size={14} color={colors.warn} />} />
                    </View>
                    <View className="flex-1">
                        <Button label="Bajar" full onPress={() => send('close')} icon={<Ionicons name="arrow-down" size={14} color="#061226" />} />
                    </View>
                </View>
            </Card>
        </View>
    );
}

// ---------------------------------------------------------------------------
//  Programador
// ---------------------------------------------------------------------------
const DAY_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

function SchedTab({ host }: { host: string }) {
    const [list, setList] = useState<Schedule[] | null>(null);
    const [time, setTime] = useState<string>('');
    const [busy, setBusy] = useState(false);
    const [editing, setEditing] = useState<Schedule | null>(null);
    const toast = useUi((s) => s.push);

    const reload = async () => {
        setBusy(true);
        try {
            const r = await api.schedules(host);
            setList(r.schedules);
            setTime(r.time);
        } catch (e: any) {
            toast(e.message, 'error');
        } finally {
            setBusy(false);
        }
    };

    useEffect(() => { reload(); }, [host]);

    const saveOne = async (s: Schedule) => {
        try {
            await api.setSchedule(host, s);
            toast('Programación guardada', 'ok');
            setEditing(null);
            reload();
        } catch (e: any) {
            toast(e.message, 'error');
        }
    };

    const deleteOne = async (i: number) => {
        try {
            await api.deleteSchedule(host, i);
            reload();
        } catch (e: any) {
            toast(e.message, 'error');
        }
    };

    if (busy && !list) {
        return <Card className="items-center py-6"><ActivityIndicator color={colors.primary} /></Card>;
    }

    if (editing) {
        return (
            <ScheduleEditor
                value={editing}
                onCancel={() => setEditing(null)}
                onSave={saveOne}
            />
        );
    }

    return (
        <View>
            <Card className="mb-3 flex-row items-center justify-between">
                <View>
                    <Text className="text-muted text-xs uppercase tracking-widest">Hora del nodo</Text>
                    <Text className="text-fg font-mono">{time || '— sin sincronizar —'}</Text>
                </View>
                <Pressable onPress={reload} className="p-2" android_ripple={{ color: 'rgba(255,255,255,0.08)', borderless: true }}>
                    <Ionicons name="refresh" size={18} color={colors.muted} />
                </Pressable>
            </Card>

            {(list || []).map((s) => (
                <ScheduleRow key={s.i} s={s} onEdit={() => setEditing({ ...s })} onDelete={() => deleteOne(s.i)} />
            ))}
        </View>
    );
}

function ScheduleRow({
    s, onEdit, onDelete,
}: { s: Schedule; onEdit: () => void; onDelete: () => void }) {
    const used = s.enabled || s.hour !== 0 || s.minute !== 0 || s.target_pct !== 0;
    return (
        <Card className="mb-2">
            <Pressable onPress={onEdit} android_ripple={{ color: 'rgba(255,255,255,0.04)' }}>
                <View className="flex-row items-center justify-between">
                    <View className="flex-1">
                        <View className="flex-row items-baseline">
                            <Text className="text-fg font-mono text-2xl">
                                {String(s.hour).padStart(2, '0')}:{String(s.minute).padStart(2, '0')}
                            </Text>
                            <Text className="text-muted text-sm ml-3">
                                → {s.target_pct} %
                            </Text>
                            {!s.enabled && used ? (
                                <Text className="text-muted text-xs ml-3">(desactivada)</Text>
                            ) : null}
                        </View>
                        <View className="flex-row mt-2">
                            {DAY_LABELS.map((d, i) => {
                                const on = (s.days_mask & (1 << i)) !== 0;
                                return (
                                    <View
                                        key={i}
                                        className="w-7 h-7 rounded-full items-center justify-center mr-1.5"
                                        style={{
                                            backgroundColor: on ? 'rgba(78,161,255,0.18)' : 'transparent',
                                            borderWidth: 1,
                                            borderColor: on ? colors.primary : colors.border,
                                        }}
                                    >
                                        <Text
                                            className="text-xs font-semibold"
                                            style={{ color: on ? colors.primary : colors.muted }}
                                        >
                                            {d}
                                        </Text>
                                    </View>
                                );
                            })}
                        </View>
                    </View>
                    <View className="ml-2 items-end">
                        <Pressable onPress={onDelete} className="p-1.5" android_ripple={{ color: 'rgba(255,255,255,0.05)', borderless: true }}>
                            <Ionicons name="trash-outline" size={16} color={colors.muted} />
                        </Pressable>
                        <Ionicons name="chevron-forward" size={16} color={colors.muted} style={{ marginTop: 8 }} />
                    </View>
                </View>
            </Pressable>
        </Card>
    );
}

function ScheduleEditor({
    value, onCancel, onSave,
}: { value: Schedule; onCancel: () => void; onSave: (v: Schedule) => void }) {
    const [s, set] = useState<Schedule>(value);
    const update = (patch: Partial<Schedule>) => set({ ...s, ...patch });
    const toggleDay = (i: number) =>
        update({ days_mask: s.days_mask ^ (1 << i) });

    return (
        <Card>
            <Section title={`Programación #${s.i + 1}`} subtitle="Editar" />
            <Switch label="Activada" value={s.enabled} onValueChange={(v) => update({ enabled: v })} />

            <View className="flex-row mt-2">
                <View className="flex-1 mr-2">
                    <Field label="Hora (0-23)" keyboardType="number-pad" value={String(s.hour)} onChangeText={(t) => update({ hour: clamp(Number(t || 0), 0, 23) })} />
                </View>
                <View className="flex-1">
                    <Field label="Minuto (0-59)" keyboardType="number-pad" value={String(s.minute)} onChangeText={(t) => update({ minute: clamp(Number(t || 0), 0, 59) })} />
                </View>
            </View>

            <Field
                label="Posición objetivo (0-100 %)"
                keyboardType="number-pad"
                value={String(s.target_pct)}
                onChangeText={(t) => update({ target_pct: clamp(Number(t || 0), 0, 100) })}
                hint="0 = totalmente arriba, 100 = totalmente abajo"
            />

            <Text className="text-muted text-xs uppercase tracking-widest mb-2">Días</Text>
            <View className="flex-row mb-3">
                {DAY_LABELS.map((d, i) => {
                    const on = (s.days_mask & (1 << i)) !== 0;
                    return (
                        <Pressable key={i} onPress={() => toggleDay(i)} className="mr-1.5">
                            <View
                                className="w-9 h-9 rounded-full items-center justify-center"
                                style={{
                                    backgroundColor: on ? 'rgba(78,161,255,0.20)' : 'transparent',
                                    borderWidth: 1,
                                    borderColor: on ? colors.primary : colors.border,
                                }}
                            >
                                <Text
                                    className="text-sm font-semibold"
                                    style={{ color: on ? colors.primary : colors.muted }}
                                >
                                    {d}
                                </Text>
                            </View>
                        </Pressable>
                    );
                })}
            </View>

            <View className="flex-row gap-2 mt-2">
                <View className="flex-1">
                    <Button label="Cancelar" variant="ghost" full onPress={onCancel} />
                </View>
                <View className="flex-1">
                    <Button label="Guardar" full onPress={() => onSave(s)} />
                </View>
            </View>
        </Card>
    );
}

function clamp(n: number, min: number, max: number) {
    return Math.max(min, Math.min(max, n | 0));
}

// ---------------------------------------------------------------------------
//  Ajustes (WiFi / MQTT / Motor / NTP)
// ---------------------------------------------------------------------------
function ConfigTab({ host }: { host: string }) {
    const [cfg, setCfg] = useState<DeviceConfig | null>(null);
    const [busy, setBusy] = useState(false);
    const toast = useUi((s) => s.push);

    const reload = async () => {
        try {
            setCfg(await api.config(host));
        } catch (e: any) {
            toast(e.message, 'error');
        }
    };
    useEffect(() => { reload(); }, [host]);

    const save = async (patch: DeviceConfig) => {
        if (!cfg) return;
        const next = { ...cfg, ...patch };
        setCfg(next);
        setBusy(true);
        try {
            await api.setConfig(host, patch);
            toast('Guardado', 'ok');
        } catch (e: any) {
            toast(e.message, 'error');
        } finally {
            setBusy(false);
        }
    };

    if (!cfg) {
        return <Card className="items-center py-6"><ActivityIndicator color={colors.primary} /></Card>;
    }

    return (
        <View>
            <Card className="mb-3">
                <Section title="WiFi" />
                <Field label="SSID actual" editable={false} value={cfg.wifi_ssid || '—'} />
                <Field
                    label="Cambiar SSID"
                    placeholder="Dejar vacío para no cambiar"
                    onChangeText={(t) => setCfg({ ...cfg, wifi_ssid: t })}
                    autoCapitalize="none"
                />
                <Field
                    label="Contraseña"
                    placeholder="••••••••"
                    onChangeText={(t) => setCfg({ ...cfg, wifi_password: t })}
                    secureTextEntry
                />
                <Button
                    label="Aplicar WiFi"
                    full
                    disabled={busy}
                    onPress={() =>
                        save({ wifi_ssid: cfg.wifi_ssid, wifi_password: cfg.wifi_password })
                    }
                />
            </Card>

            <Card className="mb-3">
                <Section title="MQTT" />
                <Switch label="Habilitar"        value={!!cfg.mqtt_enabled}    onValueChange={(v) => save({ mqtt_enabled: v })} />
                <Field  label="Host"             value={cfg.mqtt_host || ''}    onChangeText={(t) => setCfg({ ...cfg, mqtt_host: t })} autoCapitalize="none" placeholder="192.168.1.10" />
                <Field  label="Puerto"           value={String(cfg.mqtt_port ?? 1883)} keyboardType="number-pad" onChangeText={(t) => setCfg({ ...cfg, mqtt_port: Number(t || 1883) })} />
                <Field  label="Topic base"       value={cfg.mqtt_base_topic || ''} onChangeText={(t) => setCfg({ ...cfg, mqtt_base_topic: t })} autoCapitalize="none" />
                <Field  label="Usuario"          value={cfg.mqtt_user || ''} onChangeText={(t) => setCfg({ ...cfg, mqtt_user: t })} autoCapitalize="none" />
                <Field  label="Contraseña"       placeholder="—" onChangeText={(t) => setCfg({ ...cfg, mqtt_password: t })} secureTextEntry />
                <Button label="Aplicar MQTT" full disabled={busy} onPress={() => save({
                    mqtt_host: cfg.mqtt_host, mqtt_port: cfg.mqtt_port,
                    mqtt_user: cfg.mqtt_user, mqtt_password: cfg.mqtt_password,
                    mqtt_base_topic: cfg.mqtt_base_topic,
                })} />
            </Card>

            <Card className="mb-3">
                <Section title="Motor" />
                <Switch label="Invertir dirección" value={!!cfg.invert_direction} onValueChange={(v) => save({ invert_direction: v })} />
                <Switch label="Usar finales de carrera" value={!!cfg.use_endstops} onValueChange={(v) => save({ use_endstops: v })} />
                <Field label="Velocidad máx (Hz)" value={String(cfg.max_speed_hz ?? 3200)} keyboardType="number-pad" onChangeText={(t) => setCfg({ ...cfg, max_speed_hz: Number(t || 3200) })} />
                <Field label="Aceleración (Hz/s)" value={String(cfg.accel_hz_per_s ?? 4000)} keyboardType="number-pad" onChangeText={(t) => setCfg({ ...cfg, accel_hz_per_s: Number(t || 4000) })} />
                <Button label="Aplicar motor" full disabled={busy} onPress={() => save({
                    max_speed_hz: cfg.max_speed_hz, accel_hz_per_s: cfg.accel_hz_per_s,
                })} />
            </Card>

            <Card>
                <Section title="Hora / NTP" />
                <Switch label="Sincronizar por NTP" value={!!cfg.ntp_enabled} onValueChange={(v) => save({ ntp_enabled: v })} />
                <Field label="Servidor NTP" value={cfg.ntp_server || ''} onChangeText={(t) => setCfg({ ...cfg, ntp_server: t })} autoCapitalize="none" />
                <Field label="Zona horaria (POSIX)" value={cfg.timezone || ''} onChangeText={(t) => setCfg({ ...cfg, timezone: t })} autoCapitalize="none" hint="Por defecto: Europa/Madrid" />
                <Button label="Aplicar hora" full disabled={busy} onPress={() => save({
                    ntp_server: cfg.ntp_server, timezone: cfg.timezone,
                })} />
            </Card>
        </View>
    );
}

// ---------------------------------------------------------------------------
//  Avanzado (calibración, BLE policy, factory reset)
// ---------------------------------------------------------------------------
const BLE_POLICIES = [
    { v: 0, label: 'Siempre',        hint: 'BLE encendido siempre (recomendado)' },
    { v: 1, label: 'Hasta WiFi',     hint: 'Apagar al conectar a WiFi' },
    { v: 2, label: '5 minutos',      hint: 'Apagar 5 min tras arrancar' },
    { v: 3, label: 'Apagado',        hint: 'BLE deshabilitado' },
];

function AdvancedTab({ host, deviceId }: { host: string; deviceId: string }) {
    const [cfg, setCfg] = useState<DeviceConfig | null>(null);
    const toast = useUi((s) => s.push);
    const remove = useDevices((s) => s.remove);

    useEffect(() => { (async () => setCfg(await api.config(host).catch(() => null)))(); }, [host]);

    const save = async (patch: DeviceConfig) => {
        if (!cfg) return;
        const next = { ...cfg, ...patch };
        setCfg(next);
        try {
            await api.setConfig(host, patch);
            toast('Guardado', 'ok');
        } catch (e: any) {
            toast(e.message, 'error');
        }
    };

    return (
        <View>
            <Card className="mb-3">
                <Section title="Calibración" />
                <Text className="text-muted text-sm mb-3">
                    Lanza una rutina de calibración entre topes para que el nodo
                    aprenda el recorrido total.
                </Text>
                <Button
                    label="Calibrar ahora"
                    full
                    onPress={async () => { try { await api.calibrate(host); toast('Calibrando...', 'ok'); } catch (e: any) { toast(e.message, 'error'); } }}
                    icon={<Ionicons name="resize" size={14} color="#061226" />}
                />
            </Card>

            <Card className="mb-3">
                <Section title="Bluetooth" />
                <Text className="text-muted text-xs uppercase tracking-widest mb-2">Política</Text>
                {BLE_POLICIES.map((p) => (
                    <Pressable
                        key={p.v}
                        onPress={() => save({ ble_policy: p.v })}
                        className="flex-row items-center justify-between py-2"
                        android_ripple={{ color: 'rgba(255,255,255,0.04)' }}
                    >
                        <View className="flex-1 pr-2">
                            <Text className="text-fg text-sm font-semibold">{p.label}</Text>
                            <Text className="text-muted text-xs">{p.hint}</Text>
                        </View>
                        <View
                            className="w-5 h-5 rounded-full items-center justify-center"
                            style={{
                                borderWidth: 1.5,
                                borderColor: cfg?.ble_policy === p.v ? colors.primary : colors.border,
                            }}
                        >
                            {cfg?.ble_policy === p.v ? (
                                <View className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colors.primary }} />
                            ) : null}
                        </View>
                    </Pressable>
                ))}
                <Field
                    label="Passkey BLE (0 = sin PIN)"
                    keyboardType="number-pad"
                    value={String(cfg?.ble_passkey ?? 0)}
                    onChangeText={(t) => setCfg(cfg ? { ...cfg, ble_passkey: Number(t || 0) } : cfg)}
                    onBlur={() => save({ ble_passkey: cfg?.ble_passkey })}
                    hint="6 dígitos para emparejar con autenticación"
                />
                <View className="flex-row gap-2 mt-2">
                    <View className="flex-1"><Button label="BLE on"  variant="ghost" full onPress={async () => { try { await api.bleControl(host, 'on');  toast('BLE on', 'ok'); } catch (e: any) { toast(e.message, 'error'); } }} /></View>
                    <View className="flex-1"><Button label="BLE off" variant="ghost" full onPress={async () => { try { await api.bleControl(host, 'off'); toast('BLE off', 'ok'); } catch (e: any) { toast(e.message, 'error'); } }} /></View>
                </View>
            </Card>

            <Card>
                <Section title="Mantenimiento" />
                <View className="flex-row gap-2 mb-2">
                    <View className="flex-1">
                        <Button label="Reiniciar" variant="ghost" full onPress={async () => { try { await api.reboot(host); toast('Reiniciando...', 'info'); } catch (e: any) { toast(e.message, 'error'); } }} />
                    </View>
                    <View className="flex-1">
                        <Button label="Olvidar WiFi" variant="warn" full onPress={async () => { try { await api.forgetWifi(host); toast('Portal abierto', 'info'); } catch (e: any) { toast(e.message, 'error'); } }} />
                    </View>
                </View>
                <Button
                    label="Reset de fábrica"
                    variant="danger"
                    full
                    onPress={async () => {
                        try { await api.factory(host); toast('Reset solicitado', 'info'); } catch (e: any) { toast(e.message, 'error'); }
                    }}
                    icon={<Ionicons name="warning-outline" size={14} color={colors.danger} />}
                />
                <Text className="text-muted text-xs mt-2">
                    El reset de fábrica borra TODA la configuración del nodo
                    (WiFi, MQTT, calibración, programador, BLE).
                </Text>
                <View className="h-px bg-border my-3" />
                <Button
                    label="Quitar de mi lista"
                    variant="ghost"
                    full
                    onPress={() => { remove(deviceId); router.back(); }}
                    icon={<Ionicons name="trash-outline" size={14} color={colors.fg} />}
                />
            </Card>
        </View>
    );
}
