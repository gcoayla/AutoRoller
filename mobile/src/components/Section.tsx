// Cabecera de sección reutilizable.

import React from 'react';
import { Text, View } from 'react-native';

type Props = {
    title: string;
    subtitle?: string;
    right?: React.ReactNode;
};

export function Section({ title, subtitle, right }: Props) {
    return (
        <View className="flex-row items-end justify-between mb-3">
            <View>
                <Text className="text-muted text-xs uppercase tracking-widest">
                    {subtitle || ' '}
                </Text>
                <Text className="text-fg text-xl font-semibold">{title}</Text>
            </View>
            {right}
        </View>
    );
}
