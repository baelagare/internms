/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src-react/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: { 950: '#071D45', 900: '#0B2E6B', 800: '#0E3A85', 700: '#13469E', 100: '#D6E6FA', 50: '#EBF2FC' },
        ink: '#0F172A',
        canvas: '#F1F5F9',
        gold: { 800: '#785300', 500: '#D99B00', 50: '#FEF9E7' }
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Instrument Serif"', 'Georgia', 'serif']
      },
      boxShadow: {
        panel: '0 1px 2px rgb(15 23 42 / 0.04), 0 12px 30px rgb(15 23 42 / 0.04)',
        sm: '0 1px 2px 0 rgb(15 23 42 / 0.05)',
        modal: '0 20px 25px -5px rgb(15 23 42 / 0.12), 0 8px 10px -6px rgb(15 23 42 / 0.08)'
      }
    }
  },
  plugins: []
};

