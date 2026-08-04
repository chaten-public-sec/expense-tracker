/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#FFFFFF',
        surface: '#F9FAFB',
        border: '#E5E5E5',
        primary: {
          DEFAULT: '#000000',
          foreground: '#FFFFFF'
        },
        secondary: {
          DEFAULT: '#F3F4F6',
          foreground: '#111827'
        },
        muted: {
          DEFAULT: '#6B7280',
          foreground: '#9CA3AF'
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif']
      },
      borderRadius: {
        'xl': '12px',
        '2xl': '16px',
        '3xl': '24px'
      },
      boxShadow: {
        'soft': '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)',
        'card': '0 4px 6px -1px rgba(0, 0, 0, 0.03), 0 2px 4px -2px rgba(0, 0, 0, 0.03)'
      }
    },
  },
  plugins: [],
}
