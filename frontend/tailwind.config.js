/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Outfit Variable"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Fraunces Variable"', 'ui-serif', 'Georgia', 'serif'],
      },
      colors: {
        // Warm paper surfaces — the app's canvas
        paper: {
          DEFAULT: '#FAF7F2',
          soft: '#F3EFE7',
          dark: '#161311',
          'dark-soft': '#1E1A17',
        },
        ink: {
          DEFAULT: '#211D19',
          soft: '#57504A',
        },
        // Brand green — deeper, richer than stock emerald
        brand: {
          50: '#EDF7F1',
          100: '#D6EDE0',
          200: '#ACDCC2',
          300: '#7CC6A0',
          400: '#4AAB7C',
          500: '#2E9163',
          600: '#20794F',
          700: '#1B6141',
          800: '#174D35',
          900: '#123D2B',
        },
        // Saffron — XP, goals, warmth
        saffron: {
          300: '#FCD679',
          400: '#F7BE45',
          500: '#EDA417',
          600: '#CE850D',
        },
        // Terracotta — streaks, heat
        terra: {
          300: '#F2A68C',
          400: '#E97F5C',
          500: '#DA5F38',
          600: '#B94A28',
        },
      },
      boxShadow: {
        card: '0 1px 2px rgba(33, 29, 25, 0.04), 0 10px 30px -12px rgba(33, 29, 25, 0.14)',
        'card-hover': '0 2px 4px rgba(33, 29, 25, 0.05), 0 18px 44px -14px rgba(33, 29, 25, 0.22)',
        'card-dark': '0 1px 2px rgba(0, 0, 0, 0.3), 0 12px 32px -12px rgba(0, 0, 0, 0.55)',
        glow: '0 0 0 1px rgba(46, 145, 99, 0.25), 0 10px 34px -10px rgba(46, 145, 99, 0.45)',
      },
      borderRadius: {
        '2.5xl': '1.25rem',
        '4xl': '2rem',
      },
    },
  },
  plugins: [],
  darkMode: 'class',
};
