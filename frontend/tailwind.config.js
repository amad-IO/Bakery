/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#e8a33d',
        'primary-dark': '#c9821f',
        canvas: '#241610',
        'canvas-alt': '#3a2415',
        'page-bg': '#faf7f2',
        success: '#7fbf6a',
        danger: '#e0654f',
      },
      borderRadius: {
        xl2: '28px',
      },
      fontFamily: {
        heading: ['Geist', 'Inter', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
