// Tarjeta glassmorphism con borde sutil y blur opcional.

import React from 'react';
import { View, ViewProps } from 'react-native';
import { BlurView } from 'expo-blur';

type Props = ViewProps & {
    children: React.ReactNode;
    /** Cuando true, aplica BlurView (más caro en Android). */
    glass?: boolean;
};

export function Card({ children, glass, className = '', ...rest }: Props) {
    if (glass) {
        return (
            <View
                className={`rounded-2xl overflow-hidden border border-border ${className}`}
                {...rest}
            >
                <BlurView intensity={28} tint="dark">
                    <View className="p-4 bg-card">{children}</View>
                </BlurView>
            </View>
        );
    }
    return (
        <View
            className={`rounded-2xl border border-border bg-card p-4 ${className}`}
            {...rest}
        >
            {children}
        </View>
    );
}
