import type { Metadata } from "next";
import Script from "next/script";
import localFont from "next/font/local";
import "./globals.css";

const spaceGrotesk = localFont({
  src: "../fonts/SpaceGrotesk-VF.ttf",
  variable: "--font-display",
  weight: "300 700",
});

const inter = localFont({
  src: "../fonts/Inter-Regular.ttf",
  variable: "--font-body",
  weight: "100 900",
});

const jetbrainsMono = localFont({
  src: "../fonts/JetBrainsMono-VF.ttf",
  variable: "--font-mono",
  weight: "100 800",
});

export const metadata: Metadata = {
  title: "StackSuite",
  description:
    "BNS names, Telegram alerts, portfolio tracking, and stacking monitoring on Stacks, in one app.",
  icons: {
    icon: [
      { url: "/icon.png", sizes: "192x192", type: "image/png" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: "/apple-icon.png",
  },
  manifest: "/manifest.webmanifest",
};

// Runs before paint, before React hydrates, so the correct theme is set
// on <html> with no flash of the wrong one. Reads localStorage directly
// rather than through use-theme.ts since that hook only runs after
// hydration - this script is what use-theme.ts then reads back.
const THEME_INIT_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem('stacksuite-theme');
    var theme = stored === 'light' || stored === 'dark' ? stored : 'dark';
    document.documentElement.dataset.theme = theme;
  } catch (e) {
    document.documentElement.dataset.theme = 'dark';
  }
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-theme="dark"
      className={`${spaceGrotesk.variable} ${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col bg-ink text-chalk font-body">
        <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
        {children}
      </body>
    </html>
  );
}
