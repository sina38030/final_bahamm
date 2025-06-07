import type { Config } from "tailwindcss";
const { heroui } = require("@heroui/react");

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        irans: ["var(--font-iransans)", "sans-serif"],
      },
      
    },
  },
  plugins: [heroui()],

  darkMode: "class",
};
export default config;

// import type { Config } from "tailwindcss";
// const { heroui } = require("@heroui/react");

// const config: Config = {
//   content: [
//     "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
//     "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
//     "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
//     "./node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}",
//   ],
//   theme: {
//     extend: {
//       fontFamily: {
//         irans: ["var(--font-iransans)", "sans-serif"],
//       },
//     },
//   },
//   plugins: [
//     heroui(),
//     function ({ addVariant }) {
//       addVariant("group-hover", ":merge(.group):hover &"); // Enable group-hover
//     },
//   ],
//   darkMode: "class",
// };

// export default config;
