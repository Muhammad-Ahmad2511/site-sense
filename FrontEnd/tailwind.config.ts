import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './auth/index.html', './src/**/*.{js,jsx,ts,tsx}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif']
      },
      colors: {
        primary: {
          DEFAULT: '#0705F6',
          50: '#eeeefd',
          100: '#ddddfb',
          200: '#bbbbf8',
          300: '#9998f5',
          400: '#5553f1',
          500: '#0705F6',
          600: '#0604dd',
          700: '#0503b5',
          800: '#04038d',
          900: '#030265'
        },
        secondary: {
          DEFAULT: '#B079C2',
          50: '#f8f4f9',
          100: '#f1e9f4',
          200: '#e3d3e9',
          300: '#d5bdde',
          400: '#c39bc1',
          500: '#B079C2',
          600: '#9b62ad',
          700: '#814d93',
          800: '#683d78',
          900: '#52305d'
        },
        accentc: {
          DEFAULT: '#FCB4D4',
          50: '#fff5f9',
          100: '#ffebf3',
          200: '#ffd6e7',
          300: '#FCB4D4',
          400: '#f98cb9',
          500: '#f5639d'
        },
        canvas: {
          DEFAULT: '#f8fafc',
          dark: '#110792'
        }
      },
      backdropBlur: {
        xs: '2px'
      },
      keyframes: {
        blob: {
          '0%, 100%': { transform: 'translate(0px, 0px) scale(1)' },
          '33%': { transform: 'translate(30px, -40px) scale(1.1)' },
          '66%': { transform: 'translate(-25px, 25px) scale(0.95)' }
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-16px)' }
        },
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' }
        }
      },
      animation: {
        blob: 'blob 14s infinite ease-in-out',
        float: 'float 6s ease-in-out infinite',
        'fade-in-up': 'fade-in-up 0.6s ease-out both',
        shimmer: 'shimmer 2.5s linear infinite'
      }
    }
  },
  plugins: []
} satisfies Config;