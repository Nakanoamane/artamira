/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        "light-cave-ochre": "#D49A7F",
        "cave-ochre": "#AF6C4D",
        "dark-cave-ochre": "#8A553E",
        "light-moss-green": "#9EBDAA",
        "moss-green": "#6C8875",
        "dark-moss-green": "#526A59",
        "light-stone-blue": "#93B4CA",
        "stone-blue": "#5C7F99",
        "dark-stone-blue": "#476275",
        "clay-white": "#F7F4EF",
        "rock-linen": "#EAE3D7",
        "light-gray": "#DEDEDE",
        "medium-gray": "#A0A0A0",
        "flint-gray": "#3A3A3A",
        "charcoal-black": "#1A1A1A",
        "status-success": "#4CAF50",
        "status-info": "#2196F3",
        "status-warning": "#FFB300",
        "status-danger": "#D32F2F",
      },
    },
  },
  plugins: [],
}
