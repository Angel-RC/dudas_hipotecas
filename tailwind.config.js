/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,js}'],
  theme: {
    extend: {
      colors: {
        canvas: '#f5f6f7',
        panel: '#ffffff',
        ink: '#2D373D',
        muted: '#526570',
        line: '#DDE3E6',
        accent: '#DF0027',
        interest: '#526570',
        balance: '#77868D',
        danger: '#DF0027',
      },
      fontFamily: {
        sans: ['DM Sans', 'Helvetica', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
