// Pantalla de control + configuración de un dispositivo concreto.
// Pestañas: Control · Programación · Ajustes · Avanzado.

import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import Slider from '@react-native-community/slider';
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
import { apiFor, hostOf } from '@/lib/device-client';
import { colors } from '@/lib/colors';
import type { DeviceConfig, Favorite, SavedDevice, Schedule } from '@/lib/types';
import { useDevices } from '@/store/devices';
import { useRooms } from '@/store/rooms';
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

    const tint = device.color || colors.primary;

    return (
        <Screen>
            <Header
                hostname={device.hostname}
                host={hostOf(device)}
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
                {tab === 'control' && <ControlTab device={device} percent={percent} tint={tint} />}
                {tab === 'sched'   && <SchedTab   device={device} />}
                {tab === 'config'  && <ConfigTab  device={device} />}
                {tab === 'adv'     && <AdvancedTab device={device} />}
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
function ControlTab({ device, percent, tint }: { device: SavedDevice; percent: number; tint: string }) {
    const [local, setLocal] = useState<number | null>(null);
    const toast = useUi((s) => s.push);
    const client = apiFor(device);

    useEffect(() => { if (local !== null) setLocal(null); /* reset al cambiar % real */ }, [percent]);

    const v = local ?? percent;

    const send = async (a: 'open' | 'close' | 'stop' | 'set', value?: number) => {
        try {
            if (a === 'set' && value !== undefined) await client.set(value);
            else if (a !== 'set') await client[a]();
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

            <Card className="mb-3">
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

            <FavoritesPanel device={device} currentPct={Math.round(v)} tint={tint} />
        </View>
    );
}

// ---------------------------------------------------------------------------
//  Panel de favoritas dentro de Control
// ---------------------------------------------------------------------------
function FavoritesPanel({
    device, currentPct, tint,
}: { device: SavedDevice; currentPct: number; tint: string }) {
    const client = apiFor(device);
    const toast = useUi((s) => s.push);

    const [list, setList] = useState<Favorite[] | null>(null);
    const [editing, setEditing] = useState<Favorite | null>(null);

    const reload = async () => {
        try {
            const r = await client.favorites();
            setList(r.favorites);
        } catch (e: any) {
            toast(e.message, 'error');
        }
    };
    useEffect(() => { reload(); }, [device.id, device.ip, device.apiToken]);

    const apply = async (f: Favorite) => {
        try {
            await client.set(f.target_pct);
            toast(`→ ${f.name || `${f.target_pct} %`}`, 'ok');
        } catch (e: any) {
            toast(e.message, 'error');
        }
    };

    const startNew = () => {
        const empty = list?.find((x) => !x.enabled);
        if (!empty) {
            toast('Ya tienes el máximo de favoritas (6)', 'info');
            return;
        }
        setEditing({ ...empty, enabled: true, name: '', target_pct: currentPct });
    };

    const saveEditing = async () => {
        if (!editing) return;
        if (!editing.name.trim()) {
            toast('Pon un nombre a la favorita', 'error');
            return;
        }
        try {
            await client.setFavorite(editing);
            toast('Favorita guardada', 'ok');
            setEditing(null);
            reload();
        } catch (e: any) {
            toast(e.message, 'error');
        }
    };

    const removeFav = async (i: number) => {
        try {
            await client.deleteFavorite(i);
            reload();
        } catch (e: any) {
            toast(e.message, 'error');
        }
    };

    if (editing) {
        return (
            <Card>
                <Section
                    title={list?.[editing.i]?.enabled ? 'Editar favorita' : 'Nueva favorita'}
                    subtitle={`Slot #${editing.i + 1} de ${list?.length ?? 6}`}
                />
                <Field
                    label="Nombre"
                    value={editing.name}
                    onChangeText={(t) => setEditing({ ...editing, name: t.slice(0, 15) })}
                    placeholder="Día, Lectura, Cine…"
                    maxLength={15}
                    autoFocus
                />
                <View className="flex-row justify-between mb-1">
                    <Text className="text-muted text-xs uppercase tracking-widest">Posición</Text>
                    <Text className="text-fg font-mono text-sm">{editing.target_pct} %</Text>
                </View>
                <Slider
                    style={{ width: '100%', height: 32 }}
                    minimumValue={0}
                    maximumValue={100}
                    step={1}
                    value={editing.target_pct}
                    minimumTrackTintColor={tint}
                    maximumTrackTintColor="rgba(255,255,255,0.10)"
                    thumbTintColor={tint}
                    onValueChange={(v) => setEditing({ ...editing, target_pct: Math.round(v) })}
                />
                <Pressable
                    onPress={() => setEditing({ ...editing, target_pct: currentPct })}
                    className="mt-2 self-start"
                    android_ripple={{ color: 'rgba(255,255,255,0.05)' }}
                >
                    <View className="flex-row items-center px-3 py-1.5 rounded-md" style={{ backgroundColor: 'rgba(78,161,255,0.10)' }}>
                        <Ionicons name="locate-outline" size={12} color={colors.primary} style={{ marginRight: 4 }} />
                        <Text className="text-primary text-xs font-semibold">Usar posición actual ({currentPct} %)</Text>
                    </View>
                </Pressable>

                <View className="flex-row gap-2 mt-3">
                    <View className="flex-1">
                        <Button label="Cancelar" variant="ghost" full onPress={() => setEditing(null)} />
                    </View>
                    <View className="flex-1">
                        <Button label="Guardar" full onPress={saveEditing} />
                    </View>
                </View>
            </Card>
        );
    }

    const enabled = list?.filter((f) => f.enabled) ?? [];
    return (
        <Card>
            <View className="flex-row items-center justify-between mb-2">
                <Text className="text-muted text-xs uppercase tracking-widest">Favoritas</Text>
                <Pressable onPress={startNew} android_ripple={{ color: 'rgba(255,255,255,0.05)' }}>
                    <View className="flex-row items-center px-3 py-1.5 rounded-md" style={{ backgroundColor: 'rgba(78,161,255,0.12)' }}>
                        <Ionicons name="add" size={12} color={colors.primary} style={{ marginRight: 4 }} />
                        <Text className="text-primary text-xs font-semibold">Capturar actual</Text>
                    </View>
                </Pressable>
            </View>

            {enabled.length === 0 ? (
                <Text className="text-muted text-sm">
                    Aún no tienes favoritas. Posiciona la cortina como quieras y pulsa "Capturar actual"
                    para guardarla con un nombre.
                </Text>
            ) : (
                <View className="flex-row flex-wrap gap-2">
                    {enabled.map((f) => (
                        <View
                            key={f.i}
                            className="rounded-2xl overflow-hidden border border-border"
                            style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}
                        >
                            <Pressable onPress={() => apply(f)} android_ripple={{ color: 'rgba(255,255,255,0.05)' }}>
                                <View className="flex-row items-center px-3 py-2.5">
                                    <Ionicons name="star" size={12} color={tint} style={{ marginRight: 6 }} />
                                    <Text className="text-fg text-sm font-semibold mr-2">{f.name || `#${f.i + 1}`}</Text>
                                    <Text className="text-muted text-xs font-mono">{f.target_pct}%</Text>
                                </View>
                            </Pressable>
                            <View className="flex-row border-t border-border">
                                <Pressable
                                    onPress={() => setEditing(f)}
                                    className="flex-1 items-center py-1.5"
                                    android_ripple={{ color: 'rgba(255,255,255,0.05)' }}
                                >
                                    <Ionicons name="create-outline" size={14} color={colors.muted} />
                                </Pressable>
                                <View className="w-px" style={{ backgroundColor: colors.border }} />
                                <Pressable
                                    onPress={() => removeFav(f.i)}
                                    className="flex-1 items-center py-1.5"
                                    android_ripple={{ color: 'rgba(255,255,255,0.05)' }}
                                >
                                    <Ionicons name="trash-outline" size={14} color={colors.muted} />
                                </Pressable>
                            </View>
                        </View>
                    ))}
                </View>
            )}
        </Card>
    );
}

// ---------------------------------------------------------------------------
//  Programador
// ---------------------------------------------------------------------------
const DAY_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

function SchedTab({ device }: { device: SavedDevice }) {
    const [list, setList] = useState<Schedule[] | null>(null);
    const [time, setTime] = useState<string>('');
    const [busy, setBusy] = useState(false);
    const [editing, setEditing] = useState<Schedule | null>(null);
    const toast = useUi((s) => s.push);
    const client = apiFor(device);

    const reload = async () => {
        setBusy(true);
        try {
            const r = await client.schedules();
            setList(r.schedules);
            setTime(r.time);
        } catch (e: any) {
            toast(e.message, 'error');
        } finally {
            setBusy(false);
        }
    };

    useEffect(() => { reload(); }, [device.id, device.ip, device.apiToken]);

    const saveOne = async (s: Schedule) => {
        try {
            await client.setSchedule(s);
            toast('Programación guardada', 'ok');
            setEditing(null);
            reload();
        } catch (e: any) {
            toast(e.message, 'error');
        }
    };

    const deleteOne = async (i: number) => {
        try {
            await client.deleteSchedule(i);
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
function ConfigTab({ device }: { device: SavedDevice }) {
    const [cfg, setCfg] = useState<DeviceConfig | null>(null);
    const [busy, setBusy] = useState(false);
    const toast = useUi((s) => s.push);
    const client = apiFor(device);
    const updateDevice = useDevices((s) => s.update);
    const updateDeviceLocal = updateDevice;

    const reload = async () => {
        try {
            setCfg(await client.config());
        } catch (e: any) {
            toast(e.message, 'error');
        }
    };
    useEffect(() => { reload(); }, [device.id, device.ip, device.apiToken]);

    const save = async (patch: DeviceConfig) => {
        if (!cfg) return;
        const next = { ...cfg, ...patch };
        setCfg(next);
        setBusy(true);
        try {
            await client.setConfig(patch);
            // Si se cambió el token, lo guardamos en el SavedDevice para
            // que las siguientes peticiones lo usen.
            if (patch.api_token !== undefined) {
                updateDevice(device.id, { apiToken: patch.api_token });
            }
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

            <Card className="mb-3">
                <Section
                    title="Límites de recorrido"
                    subtitle="Protege la cortina"
                />
                <Text className="text-muted text-sm mb-3">
                    Define hasta dónde puede subir y bajar la cortina sin riesgo
                    de forzar el riel o la tela.
                </Text>
                <LimitsEditor
                    open={cfg.limit_open ?? 0}
                    close={cfg.limit_close ?? 100}
                    onChange={(o, c) => setCfg({ ...cfg, limit_open: o, limit_close: c })}
                />
                <View className="mt-2">
                    <Button
                        label="Aplicar límites"
                        full
                        disabled={busy}
                        onPress={() => save({
                            limit_open: cfg.limit_open ?? 0,
                            limit_close: cfg.limit_close ?? 100,
                        })}
                    />
                </View>
            </Card>

            <Card className="mb-3">
                <Section title="Habitación" subtitle="Organización en el Home" />
                <RoomPicker
                    selected={device.roomId}
                    onPick={(rid) => updateDeviceLocal(device.id, { roomId: rid })}
                />
            </Card>

            <Card className="mb-3">
                <Section title="Hora / NTP" />
                <Switch label="Sincronizar por NTP" value={!!cfg.ntp_enabled} onValueChange={(v) => save({ ntp_enabled: v })} />
                <Field label="Servidor NTP" value={cfg.ntp_server || ''} onChangeText={(t) => setCfg({ ...cfg, ntp_server: t })} autoCapitalize="none" />
                <Field label="Zona horaria (POSIX)" value={cfg.timezone || ''} onChangeText={(t) => setCfg({ ...cfg, timezone: t })} autoCapitalize="none" hint="Por defecto: Europa/Madrid" />
                <Button label="Aplicar hora" full disabled={busy} onPress={() => save({
                    ntp_server: cfg.ntp_server, timezone: cfg.timezone,
                })} />
            </Card>

            <Card>
                <Section title="Seguridad" />
                <Field
                    label="Token API"
                    value={cfg.api_token || ''}
                    onChangeText={(t) => setCfg({ ...cfg, api_token: t })}
                    autoCapitalize="none"
                    placeholder="Vacío = sin auth"
                    hint="Si se fija, todas las acciones (mover, calibrar, OTA) requieren este token. Las lecturas siguen libres."
                />
                <Button label="Aplicar token" full disabled={busy} onPress={() => save({ api_token: cfg.api_token })} />
            </Card>
        </View>
    );
}

// ---------------------------------------------------------------------------
//  Editor de límites de recorrido
// ---------------------------------------------------------------------------
function LimitsEditor({
    open, close, onChange,
}: { open: number; close: number; onChange: (o: number, c: number) => void }) {
    return (
        <View>
            <View className="mb-3">
                <View className="flex-row justify-between mb-1">
                    <Text className="text-muted text-xs uppercase tracking-widest">Tope abierto</Text>
                    <Text className="text-fg font-mono text-sm">{open} %</Text>
                </View>
                <Slider
                    style={{ width: '100%', height: 32 }}
                    minimumValue={0}
                    maximumValue={Math.max(0, close - 1)}
                    step={1}
                    value={open}
                    minimumTrackTintColor="rgba(255,255,255,0.10)"
                    maximumTrackTintColor={colors.primary}
                    thumbTintColor={colors.primary}
                    onValueChange={(v) => onChange(Math.round(v), close)}
                />
                <Text className="text-muted text-xs mt-0.5">
                    No abrirá más allá del {open} % (0 = totalmente arriba).
                </Text>
            </View>
            <View>
                <View className="flex-row justify-between mb-1">
                    <Text className="text-muted text-xs uppercase tracking-widest">Tope cerrado</Text>
                    <Text className="text-fg font-mono text-sm">{close} %</Text>
                </View>
                <Slider
                    style={{ width: '100%', height: 32 }}
                    minimumValue={Math.min(100, open + 1)}
                    maximumValue={100}
                    step={1}
                    value={close}
                    minimumTrackTintColor={colors.primary}
                    maximumTrackTintColor="rgba(255,255,255,0.10)"
                    thumbTintColor={colors.primary}
                    onValueChange={(v) => onChange(open, Math.round(v))}
                />
                <Text className="text-muted text-xs mt-0.5">
                    No cerrará más allá del {close} % (100 = totalmente abajo).
                </Text>
            </View>
        </View>
    );
}

// ---------------------------------------------------------------------------
//  Selector de habitación
// ---------------------------------------------------------------------------
function RoomPicker({
    selected, onPick,
}: { selected?: string; onPick: (id: string | undefined) => void }) {
    const rooms = useRooms((s) => s.rooms.slice().sort((a, b) => a.order - b.order));
    return (
        <View>
            <View className="flex-row flex-wrap gap-2">
                <Pressable
                    onPress={() => onPick(undefined)}
                    android_ripple={{ color: 'rgba(255,255,255,0.05)' }}
                >
                    <View
                        className="px-3 py-2 rounded-xl"
                        style={{
                            backgroundColor: selected ? 'rgba(255,255,255,0.04)' : 'rgba(78,161,255,0.18)',
                            borderWidth: 1,
                            borderColor: selected ? colors.border : colors.primary,
                        }}
                    >
                        <Text
                            className="text-xs font-semibold"
                            style={{ color: selected ? colors.muted : colors.primary }}
                        >
                            Sin habitación
                        </Text>
                    </View>
                </Pressable>
                {rooms.map((r) => {
                    const sel = selected === r.id;
                    return (
                        <Pressable
                            key={r.id}
                            onPress={() => onPick(r.id)}
                            android_ripple={{ color: 'rgba(255,255,255,0.05)' }}
                        >
                            <View
                                className="flex-row items-center px-3 py-2 rounded-xl"
                                style={{
                                    backgroundColor: sel ? 'rgba(78,161,255,0.18)' : 'rgba(255,255,255,0.04)',
                                    borderWidth: 1,
                                    borderColor: sel ? colors.primary : colors.border,
                                }}
                            >
                                {r.icon ? (
                                    <Ionicons
                                        name={r.icon as any}
                                        size={12}
                                        color={sel ? colors.primary : colors.muted}
                                        style={{ marginRight: 5 }}
                                    />
                                ) : null}
                                <Text
                                    className="text-xs font-semibold"
                                    style={{ color: sel ? colors.primary : colors.fg }}
                                >
                                    {r.name}
                                </Text>
                            </View>
                        </Pressable>
                    );
                })}
            </View>
            {rooms.length === 0 ? (
                <Text className="text-muted text-xs mt-2">
                    No has creado habitaciones todavía. Ve a Ajustes → Habitaciones para crear una.
                </Text>
            ) : null}
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

function AdvancedTab({ device }: { device: SavedDevice }) {
    const [cfg, setCfg] = useState<DeviceConfig | null>(null);
    const toast = useUi((s) => s.push);
    const remove = useDevices((s) => s.remove);
    const client = apiFor(device);

    useEffect(() => {
        (async () => setCfg(await client.config().catch(() => null)))();
    }, [device.id, device.ip, device.apiToken]);

    const save = async (patch: DeviceConfig) => {
        if (!cfg) return;
        const next = { ...cfg, ...patch };
        setCfg(next);
        try {
            await client.setConfig(patch);
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
                    onPress={async () => { try { await client.calibrate(); toast('Calibrando...', 'ok'); } catch (e: any) { toast(e.message, 'error'); } }}
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
                    <View className="flex-1"><Button label="BLE on"  variant="ghost" full onPress={async () => { try { await client.bleControl('on');  toast('BLE on', 'ok'); } catch (e: any) { toast(e.message, 'error'); } }} /></View>
                    <View className="flex-1"><Button label="BLE off" variant="ghost" full onPress={async () => { try { await client.bleControl('off'); toast('BLE off', 'ok'); } catch (e: any) { toast(e.message, 'error'); } }} /></View>
                </View>
                {device.bleId ? (
                    <View className="mt-2">
                        <Button
                            label="Reconfigurar por Bluetooth"
                            variant="ghost"
                            full
                            onPress={() => router.push({ pathname: '/ble-setup', params: { id: device.bleId, name: device.hostname, existing: device.id } })}
                            icon={<Ionicons name="bluetooth" size={14} color={colors.fg} />}
                        />
                    </View>
                ) : null}
            </Card>

            <Card>
                <Section title="Mantenimiento" />
                <View className="flex-row gap-2 mb-2">
                    <View className="flex-1">
                        <Button label="Reiniciar" variant="ghost" full onPress={async () => { try { await client.reboot(); toast('Reiniciando...', 'info'); } catch (e: any) { toast(e.message, 'error'); } }} />
                    </View>
                    <View className="flex-1">
                        <Button label="Olvidar WiFi" variant="warn" full onPress={async () => { try { await client.forgetWifi(); toast('Portal abierto', 'info'); } catch (e: any) { toast(e.message, 'error'); } }} />
                    </View>
                </View>
                <Button
                    label="Reset de fábrica"
                    variant="danger"
                    full
                    onPress={async () => {
                        try { await client.factory(); toast('Reset solicitado', 'info'); } catch (e: any) { toast(e.message, 'error'); }
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
