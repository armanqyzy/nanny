/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        nanny: {
          cream:   '#FFF4E0',
          orange:  '#F29A4D',
          deepOrange: '#E97A1F',
          blue:    '#4F6BED',
          yellow:  '#F9C846',
          brownish:'#7A4B1F',
        },
      },
      fontFamily: {
        display: ['Poppins', 'system-ui', 'sans-serif'],
        body:    ['Inter',    'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 6px 24px -8px rgba(122, 75, 31, 0.25)',
      },
    },
  },
  plugins: [],
};
