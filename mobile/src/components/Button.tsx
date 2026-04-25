// Botones con feedback háptico y gradiente.

import React from 'react';
import { Pressable, Text, View, ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';

type Variant = 'primary' | 'ghost' | 'danger' | 'warn';

type Props = {
    label: string;
    onPress?: () => void;
    variant?: Variant;
    disabled?: boolean;
    icon?: React.ReactNode;
    full?: boolean;
    style?: ViewStyle;
    compact?: boolean;
};

const styles: Record<Variant, { container: string; text: string }> = {
    primary: { container: '',                                  text: 'text-[#061226]' },
    ghost:   { container: 'bg-transparent border border-border', text: 'text-fg' },
    danger:  { container: 'bg-danger/10 border border-danger/40', text: 'text-danger' },
    warn:    { container: 'bg-warn/10 border border-warn/40',     text: 'text-warn' },
};

export function Button({
    label,
    onPress,
    variant = 'primary',
    disabled,
    icon,
    full,
    compact,
    style,
}: Props) {
    const wrap = (children: React.ReactNode) => {
        if (variant === 'primary') {
            return (
                <LinearGradient
                    colors={['#4EA1FF', '#7BC1FF']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{ borderRadius: 14 }}
                >
                    <View
                        className={`flex-row items-center justify-center ${
                            compact ? 'px-4 py-2.5' : 'px-5 py-3.5'
                        }`}
                    >
                        {children}
                    </View>
                </LinearGradient>
            );
        }
        return (
            <View
                className={`flex-row items-center justify-center rounded-2xl ${
                    compact ? 'px-4 py-2.5' : 'px-5 py-3.5'
                } ${styles[variant].container}`}
            >
                {children}
            </View>
        );
    };

    return (
        <Pressable
            onPress={() => {
                if (disabled) return;
                Haptics.selectionAsync().catch(() => {});
                onPress?.();
            }}
            disabled={disabled}
            android_ripple={{ color: 'rgba(255,255,255,0.08)' }}
            style={[{ opacity: disabled ? 0.4 : 1 }, full ? { width: '100%' } : null, style] as any}
        >
            {wrap(
                <>
                    {icon ? <View className="mr-2">{icon}</View> : null}
                    <Text
                        className={`font-semibold tracking-wide ${styles[variant].text}`}
                        style={{ fontSize: compact ? 14 : 15 }}
                    >
                        {label}
                    </Text>
                </>,
            )}
        </Pressable>
    );
}
