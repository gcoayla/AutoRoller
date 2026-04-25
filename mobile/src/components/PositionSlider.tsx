// Slider de posición 0..100 con feedback visual.

import React from 'react';
import { Text, View } from 'react-native';
import Slider from '@react-native-community/slider';

import { colors } from '@/lib/colors';

type Props = {
    value: number;
    onChange: (v: number) => void;
    onCommit?: (v: number) => void;
    tint?: string;
};

export function PositionSlider({ value, onChange, onCommit, tint = colors.primary }: Props) {
    return (
        <View className="w-full">
            <View className="flex-row justify-between items-baseline mb-1">
                <Text className="text-muted text-xs uppercase tracking-widest">Posición</Text>
                <Text className="text-fg font-mono text-2xl">
                    {Math.round(value)}
                    <Text className="text-muted text-base"> %</Text>
                </Text>
            </View>
            <Slider
                style={{ width: '100%', height: 36 }}
                minimumValue={0}
                maximumValue={100}
                step={1}
                value={value}
                minimumTrackTintColor={tint}
                maximumTrackTintColor="rgba(255,255,255,0.1)"
                thumbTintColor={tint}
                onValueChange={onChange}
                onSlidingComplete={onCommit}
            />
            <View className="flex-row justify-between mt-1">
                <Text className="text-muted text-xs">Arriba</Text>
                <Text className="text-muted text-xs">Abajo</Text>
            </View>
        </View>
    );
}
