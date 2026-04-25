/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        './app/**/*.{ts,tsx}',
        './src/**/*.{ts,tsx}',
    ],
    presets: [require('nativewind/preset')],
    theme: {
        extend: {
            colors: {
                bg:        '#050811',
                bg2:       '#0A1124',
                card:      'rgba(20, 30, 50, 0.55)',
                cardSolid: '#101A2E',
                border:    'rgba(78, 161, 255, 0.18)',
                primary:   '#4EA1FF',
                accent:    '#B14EFF',
                success:   '#4EFFB1',
                warn:      '#FFB04E',
                danger:    '#FF4E78',
                fg:        '#E6ECF5',
                muted:     '#7B89A6',
            },
            fontFamily: {
                mono: ['SpaceMono', 'monospace'],
            },
            borderRadius: {
                xl2: '20px',
            },
            boxShadow: {
                glow: '0 0 24px rgba(78, 161, 255, 0.35)',
            },
        },
    },
    plugins: [],
};
