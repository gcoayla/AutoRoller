// Visualización animada de una cortina sobre una "ventana".
// Usa Reanimated para que la altura siga al porcentaje sin tirones.

import React, { useEffect } from 'react';
import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
} from 'react-native-reanimated';

type Props = {
    percent: number;       // 0..100
    tint?: string;
    height?: number;
};

export function CurtainViz({ percent, tint = '#4EA1FF', height = 200 }: Props) {
    const p = useSharedValue(percent);
    useEffect(() => {
        p.value = withSpring(percent, { damping: 18, stiffness: 90 });
    }, [percent, p]);

    const curtainStyle = useAnimatedStyle(() => ({
        height: `${p.value}%`,
    }));

    return (
        <View
            className="rounded-2xl overflow-hidden border border-border"
            style={{ height, position: 'relative' }}
        >
            {/* cielo / ventana */}
            <LinearGradient
                colors={['#1B2D4F', '#2C4A7C', '#1B2D4F']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ position: 'absolute', inset: 0 } as any}
            />

            {/* marco */}
            <View
                pointerEvents="none"
                className="absolute"
                style={{
                    left: '12%',
                    right: '12%',
                    top: '12%',
                    bottom: '12%',
                    borderRadius: 6,
                    borderWidth: 1.5,
                    borderColor: 'rgba(255,255,255,0.18)',
                }}
            />
            <View
                pointerEvents="none"
                className="absolute"
                style={{
                    left: '50%',
                    width: 1,
                    top: '12%',
                    bottom: '12%',
                    backgroundColor: 'rgba(255,255,255,0.18)',
                }}
            />

            {/* cortina */}
            <Animated.View
                style={[
                    {
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        overflow: 'hidden',
                    },
                    curtainStyle,
                ]}
            >
                <LinearGradient
                    colors={[tint + 'CC', tint + '80', tint + '60']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{ position: 'absolute', inset: 0 } as any}
                />
                {/* listas verticales tipo persiana */}
                {Array.from({ length: 16 }).map((_, i) => (
                    <View
                        key={i}
                        style={{
                            position: 'absolute',
                            top: 0,
                            bottom: 0,
                            left: `${(i / 16) * 100}%`,
                            width: '6.25%',
                            borderRightWidth: 1,
                            borderRightColor: 'rgba(0,0,0,0.18)',
                        }}
                    />
                ))}
            </Animated.View>

            {/* ribete inferior brillante de la cortina */}
            <Animated.View
                style={[
                    {
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                    },
                    curtainStyle,
                ]}
                pointerEvents="none"
            >
                <View
                    style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: 3,
                        backgroundColor: tint,
                        shadowColor: tint,
                        shadowOpacity: 0.8,
                        shadowRadius: 8,
                        shadowOffset: { width: 0, height: 0 },
                    }}
                />
            </Animated.View>
        </View>
    );
}
