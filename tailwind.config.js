/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,js}'],
  theme: {
    extend: {
      colors: {
        canvas: '#f6f7f9',
        panel: '#ffffff',
        ink: '#1c2430',
        muted: '#6b7686',
        line: '#dde3ea',
        accent: '#2f6df6',
        interest: '#f0713a',
        balance: '#7a3df0',
        danger: '#c0392b',
      },
    },
  },
  plugins: [],
};
