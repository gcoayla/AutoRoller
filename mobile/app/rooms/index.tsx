// Lista y CRUD de habitaciones.

import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Field } from '@/components/Field';
import { IconPicker } from '@/components/IconPicker';
import { Screen } from '@/components/Screen';
import { Section } from '@/components/Section';
import { colors } from '@/lib/colors';
import { useDevices } from '@/store/devices';
import { useRooms } from '@/store/rooms';
import { useUi } from '@/store/ui';

export default function RoomsScreen() {
    const rooms     = useRooms((s) => s.rooms);
    const addRoom   = useRooms((s) => s.add);
    const renameRoom = useRooms((s) => s.rename);
    const setIcon    = useRooms((s) => s.setIcon);
    const removeRoom = useRooms((s) => s.remove);
    const devices    = useDevices((s) => s.devices);
    const toast      = useUi((s) => s.push);

    const [editingId, setEditingId] = useState<string | null>(null);
    const [draftName, setDraftName] = useState('');
    const [draftIcon, setDraftIcon] = useState<string | undefined>(undefined);

    const startNew = () => {
        setEditingId('__new__');
        setDraftName('');
        setDraftIcon('home-outline');
    };

    const saveDraft = () => {
        if (editingId === '__new__') {
            const room = addRoom(draftName, draftIcon);
            if (!room) {
                toast('Nombre vacío o duplicado', 'error');
                return;
            }
            toast('Habitación creada', 'ok');
        } else if (editingId) {
            const ok = renameRoom(editingId, draftName);
            if (!ok) {
                toast('Nombre vacío o duplicado', 'error');
                return;
            }
            if (draftIcon) setIcon(editingId, draftIcon);
            toast('Habitación actualizada', 'ok');
        }
        setEditingId(null);
    };

    const askDelete = (id: string, name: string) => {
        const count = devices.filter((d) => d.roomId === id).length;
        Alert.alert(
            `Eliminar "${name}"`,
            count > 0
                ? `Tiene ${count} dispositivo${count !== 1 ? 's' : ''} asignado${count !== 1 ? 's' : ''}. ` +
                  'Pasarán a "Sin habitación" pero NO se borran.'
                : 'No tiene dispositivos. Se eliminará la habitación.',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Eliminar',
                    style: 'destructive',
                    onPress: () => {
                        removeRoom(id);
                        toast('Habitación eliminada', 'info');
                    },
                },
            ],
        );
    };

    if (editingId) {
        return (
            <Screen>
                <ScrollView contentContainerStyle={{ paddingTop: 12 }}>
                    <Card>
                        <Section
                            title={editingId === '__new__' ? 'Nueva habitación' : 'Editar habitación'}
                            subtitle="Detalles"
                        />
                        <Field
                            label="Nombre"
                            value={draftName}
                            onChangeText={setDraftName}
                            placeholder="Salón, Cocina, Dormitorio…"
                            autoFocus
                            maxLength={32}
                        />
                        <Text className="text-muted text-xs uppercase tracking-widest mb-1">Icono</Text>
                        <IconPicker value={draftIcon} onChange={setDraftIcon} kind="room" />
                        <View className="flex-row gap-2 mt-3">
                            <View className="flex-1">
                                <Button label="Cancelar" variant="ghost" full onPress={() => setEditingId(null)} />
                            </View>
                            <View className="flex-1">
                                <Button
                                    label="Guardar"
                                    full
                                    onPress={saveDraft}
                                    disabled={!draftName.trim()}
                                />
                            </View>
                        </View>
                    </Card>
                </ScrollView>
            </Screen>
        );
    }

    return (
        <Screen>
            <ScrollView contentContainerStyle={{ paddingTop: 12, paddingBottom: 60 }}>
                <Card className="mb-3">
                    <Section title="Habitaciones" subtitle="Organiza tus dispositivos" />
                    <Text className="text-muted text-sm mb-3">
                        Las habitaciones agrupan dispositivos en el Home y permiten acciones
                        rápidas por sala. Asignar una es opcional.
                    </Text>
                    <Button
                        label="Nueva habitación"
                        full
                        onPress={startNew}
                        icon={<Ionicons name="add" size={14} color="#061226" />}
                    />
                </Card>

                {rooms.length === 0 ? (
                    <Card className="items-center py-6">
                        <Ionicons name="home-outline" size={28} color={colors.muted} />
                        <Text className="text-muted text-sm mt-2">Aún no has creado ninguna</Text>
                    </Card>
                ) : (
                    rooms
                        .slice()
                        .sort((a, b) => a.order - b.order)
                        .map((r) => {
                            const count = devices.filter((d) => d.roomId === r.id).length;
                            return (
                                <Card key={r.id} className="mb-2">
                                    <View className="flex-row items-center">
                                        <View
                                            className="w-10 h-10 rounded-xl items-center justify-center mr-3"
                                            style={{ backgroundColor: 'rgba(78,161,255,0.10)' }}
                                        >
                                            <Ionicons
                                                name={(r.icon ?? 'home-outline') as any}
                                                size={20}
                                                color={colors.primary}
                                            />
                                        </View>
                                        <View className="flex-1">
                                            <Text className="text-fg font-semibold">{r.name}</Text>
                                            <Text className="text-muted text-xs">
                                                {count} dispositivo{count !== 1 ? 's' : ''}
                                            </Text>
                                        </View>
                                        <Pressable
                                            onPress={() => {
                                                setEditingId(r.id);
                                                setDraftName(r.name);
                                                setDraftIcon(r.icon);
                                            }}
                                            className="p-2"
                                            android_ripple={{ color: 'rgba(255,255,255,0.05)', borderless: true }}
                                        >
                                            <Ionicons name="create-outline" size={18} color={colors.muted} />
                                        </Pressable>
                                        <Pressable
                                            onPress={() => askDelete(r.id, r.name)}
                                            className="p-2"
                                            android_ripple={{ color: 'rgba(255,255,255,0.05)', borderless: true }}
                                        >
                                            <Ionicons name="trash-outline" size={18} color={colors.muted} />
                                        </Pressable>
                                    </View>
                                </Card>
                            );
                        })
                )}
            </ScrollView>
        </Screen>
    );
}
