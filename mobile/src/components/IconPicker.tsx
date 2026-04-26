// Selector de icono Ionicon para habitaciones y presets.

import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors } from '@/lib/colors';

const ROOM_ICONS: Array<keyof typeof Ionicons.glyphMap> = [
    'home-outline',
    'bed-outline',
    'tv-outline',
    'restaurant-outline',
    'cafe-outline',
    'water-outline',
    'desktop-outline',
    'school-outline',
    'fitness-outline',
    'car-outline',
    'leaf-outline',
    'sparkles-outline',
];

const PRESET_ICONS: Array<keyof typeof Ionicons.glyphMap> = [
    'film-outline',
    'moon-outline',
    'sunny-outline',
    'partly-sunny-outline',
    'happy-outline',
    'musical-notes-outline',
    'play-outline',
    'pause-outline',
    'time-outline',
    'flame-outline',
    'snow-outline',
    'sparkles-outline',
];

type Props = {
    value?: string;
    onChange: (icon: string) => void;
    kind: 'room' | 'preset';
};

export function IconPicker({ value, onChange, kind }: Props) {
    const list = kind === 'room' ? ROOM_ICONS : PRESET_ICONS;
    return (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
            <View className="flex-row gap-2">
                {list.map((name) => {
                    const sel = value === name;
                    return (
                        <Pressable
                            key={name}
                            onPress={() => onChange(name)}
                            className="w-12 h-12 rounded-2xl items-center justify-center"
                            style={{
                                borderWidth: 1,
                                borderColor: sel ? colors.primary : colors.border,
                                backgroundColor: sel
                                    ? 'rgba(78,161,255,0.18)'
                                    : 'rgba(255,255,255,0.03)',
                            }}
                            android_ripple={{ color: 'rgba(255,255,255,0.05)' }}
                        >
                            <Ionicons
                                name={name}
                                size={20}
                                color={sel ? colors.primary : colors.fg}
                            />
                        </Pressable>
                    );
                })}
            </View>
        </ScrollView>
    );
}
