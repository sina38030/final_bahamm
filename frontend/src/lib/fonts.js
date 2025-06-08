import localFont from "next/font/local";

const iransans = localFont({
  src: [
    {
      path: "../app/fonts/woff2/IRANSansX-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../app/fonts/woff2/IRANSansX-Medium.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../app/fonts/woff2/IRANSansX-Bold.woff2",
      weight: "700",
      style: "normal",
    },
    {
      path: "../app/fonts/woff/IRANSansX-Regular.woff",
      weight: "400",
      style: "normal",
    },
    {
      path: "../app/fonts/woff/IRANSansX-Medium.woff",
      weight: "500",
      style: "normal",
    },
    {
      path: "../app/fonts/woff/IRANSansX-Bold.woff",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-iransans",
  display: "swap",
});

const madaniArabicSemiBold = localFont({
  src: "../app/fonts/woff/Madani-Arabic-SemiBold.woff",
  weight: "600",
  style: "normal",
  variable: "--font-madani-semi-bold",
});

export { iransans, madaniArabicSemiBold };
