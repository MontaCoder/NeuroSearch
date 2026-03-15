import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    screens: {
      sm: '640px',
      md: '768px',
      lg: '898px',
      xl: '1024px',
      '2xl': '1280px',
    },
    container: {
      center: true,
      padding: {
        DEFAULT: '1rem',
        sm: '2rem',
        lg: '4rem',
        xl: '5rem',
        '2xl': '6rem',
      },
    },
    extend: {
      fontFamily: {
        sans: ['var(--font-lexend)', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Monochrome grayscale palette
        gray: {
          50: '#fafafa',   // Ultra light gray (backgrounds)
          100: '#f5f5f5',  // Very light gray (subtle backgrounds)
          200: '#e5e5e5',  // Light gray (borders, subtle elements)
          300: '#d4d4d4',  // Medium light gray (disabled states)
          400: '#a3a3a3',  // Medium gray (secondary text)
          500: '#737373',  // Medium dark gray (body text)
          600: '#525252',  // Dark gray (headings)
          700: '#404040',  // Darker gray (strong emphasis)
          800: '#262626',  // Very dark gray (high contrast text)
          900: '#171717',  // Near black (primary text)
          950: '#0a0a0a',  // Almost black (borders, icons)
        },
        // Semantic colors using the gray palette
        background: {
          primary: '#ffffff',      // Pure white (main background)
          secondary: '#fafafa',    // Ultra light gray (cards, sections)
          tertiary: '#f5f5f5',     // Very light gray (hover states)
          accent: '#e5e5e5',       // Light gray (borders, dividers)
        },
        text: {
          primary: '#171717',      // Near black (main text)
          secondary: '#525252',    // Dark gray (secondary text)
          tertiary: '#737373',     // Medium dark gray (muted text)
          inverse: '#ffffff',      // White (on dark backgrounds)
        },
        border: {
          light: '#e5e5e5',        // Light gray (subtle borders)
          medium: '#d4d4d4',       // Medium light gray (standard borders)
          dark: '#a3a3a3',         // Medium gray (stronger borders)
        },
        // Interactive states
        interactive: {
          hover: '#f5f5f5',        // Very light gray (hover backgrounds)
          active: '#e5e5e5',       // Light gray (active states)
          focus: '#d4d4d4',        // Medium light gray (focus rings)
          disabled: '#d4d4d4',     // Medium light gray (disabled elements)
        }
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
        '5xl': ['3rem', { lineHeight: '1' }],
        '6xl': ['3.75rem', { lineHeight: '1' }],
        '7xl': ['4.5rem', { lineHeight: '1' }],
        '8xl': ['6rem', { lineHeight: '1' }],
        '9xl': ['8rem', { lineHeight: '1' }],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-subtle': 'pulseSubtle 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'scale-in': 'scaleIn 0.2s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.8' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      boxShadow: {
        'sm': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        'md': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        'lg': '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
        'xl': '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
        '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
        'inner-light': 'inset 0 1px 0 0 rgb(255 255 255 / 0.1)',
        'inner-dark': 'inset 0 -1px 0 0 rgb(0 0 0 / 0.1)',
      },
      borderRadius: {
        'none': '0',
        'sm': '0.125rem',
        'DEFAULT': '0.375rem',
        'md': '0.5rem',
        'lg': '0.75rem',
        'xl': '1rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
        'full': '9999px',
      },
    },
  },
  plugins: [],
};

export default config;
