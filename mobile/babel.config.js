module.exports = function (api) {
    api.cache(true);
    return {
        presets: [
            ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
            'nativewind/babel',
        ],
        plugins: [
            // expo-router maneja el resto; reanimated SIEMPRE va al final.
            'react-native-reanimated/plugin',
        ],
    };
};
