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
          DEFAULT: '#05b084',
          50: '#e9fbf5',
          100: '#c9f4e3',
          200: '#93e8c7',
          300: '#5cdaac',
          400: '#25c691',
          500: '#05b084',
          600: '#048c69',
          700: '#036850',
          800: '#024636',
          900: '#01271e'
        },
        secondary: {
          DEFAULT: '#015a84',
          50: '#e6f3fa',
          100: '#c0e2f1',
          200: '#87c5e3',
          300: '#4fa8d5',
          400: '#227fac',
          500: '#015a84',
          600: '#014a6c',
          700: '#013a54',
          800: '#012a3c',
          900: '#001a26'
        },
        accentc: {
          DEFAULT: '#badfcd',
          50: '#f4faf7',
          100: '#e5f3ec',
          200: '#badfcd',
          300: '#96cbae',
          400: '#6fb28c',
          500: '#4c9470'
        },
        canvas: {
          DEFAULT: '#f1edea',
          dark: '#04120f'
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
