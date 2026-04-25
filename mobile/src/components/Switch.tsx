// Toggle moderno (Switch nativo coloreado).

import React from 'react';
import { Switch as RnSwitch, Text, View } from 'react-native';

import { colors } from '@/lib/colors';

type Props = {
    label: string;
    value: boolean;
    onValueChange: (v: boolean) => void;
    hint?: string;
};

export function Switch({ label, value, onValueChange, hint }: Props) {
    return (
        <View className="flex-row items-center justify-between py-2">
            <View className="flex-1 pr-3">
                <Text className="text-fg text-sm">{label}</Text>
                {hint ? <Text className="text-muted text-xs mt-0.5">{hint}</Text> : null}
            </View>
            <RnSwitch
                value={value}
                onValueChange={onValueChange}
                thumbColor={value ? colors.primary : '#777'}
                trackColor={{
                    false: 'rgba(255,255,255,0.12)',
                    true:  'rgba(78,161,255,0.45)',
                }}
            />
        </View>
    );
}
