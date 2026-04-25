// Campo de texto con label, estilizado coherente con el tema.

import React from 'react';
import { Text, TextInput, TextInputProps, View } from 'react-native';

import { colors } from '@/lib/colors';

type Props = TextInputProps & {
    label?: string;
    hint?: string;
};

export function Field({ label, hint, style, ...rest }: Props) {
    return (
        <View className="mb-3">
            {label ? (
                <Text className="text-muted text-xs uppercase tracking-widest mb-1.5">
                    {label}
                </Text>
            ) : null}
            <TextInput
                placeholderTextColor={colors.muted}
                {...rest}
                style={[
                    {
                        backgroundColor: 'rgba(0,0,0,0.25)',
                        borderColor: colors.border,
                        borderWidth: 1,
                        borderRadius: 12,
                        color: colors.fg,
                        paddingHorizontal: 12,
                        paddingVertical: 12,
                        fontSize: 15,
                    } as any,
                    style as any,
                ]}
            />
            {hint ? <Text className="text-muted text-xs mt-1">{hint}</Text> : null}
        </View>
    );
}
