/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#e94560', hover: '#d63d56', light: '#fff0f3' },
        secondary: { DEFAULT: '#065fd4', hover: '#0550b0', light: '#def1ff' },
        text: { DEFAULT: '#0f0f0f', sub: '#606060', muted: '#aaaaaa' },
        surface: '#ffffff',
        bg: '#f9f9f9',
        border: { DEFAULT: '#e5e5e5', light: '#f2f2f2' },
        success: '#2e7d32',
        warning: '#f57c00',
        error: '#d32f2f',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Noto Sans KR', 'sans-serif'],
      },
      borderRadius: {
        sm: '4px',
        md: '8px',
        lg: '12px',
        xl: '20px',
      },
    },
  },
  plugins: [],
}
