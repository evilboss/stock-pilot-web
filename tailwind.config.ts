import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/pages/**/*.{js,ts,jsx,tsx,mdx}', './src/components/**/*.{js,ts,jsx,tsx,mdx}', './src/app/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#3C50E0',
          light: '#5A6ED4',
          dark: '#2B3CC0',
        },
        sidebar: '#1C2434',
        'sidebar-dark': '#111928',
      },
    },
  },
  plugins: [],
};
export default config;
