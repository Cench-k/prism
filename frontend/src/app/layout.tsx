import type { Metadata, Viewport } from "next";
import { Black_Han_Sans, Noto_Serif_KR } from "next/font/google";
import "./globals.css";

const displayFont = Black_Han_Sans({
  weight: "400",
  subsets: ["latin"],
  preload: false,
  variable: "--font-display",
});

const serifFont = Noto_Serif_KR({
  weight: ["400", "700", "900"],
  subsets: ["latin"],
  preload: false,
  variable: "--font-serif",
});

export const metadata: Metadata = {
  title: "Prism — 당신만의 매거진",
  description: "세상의 모든 이슈를, 노이즈 없이 당신만의 매거진으로.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#000000",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={`${displayFont.variable} ${serifFont.variable}`}>
      <body className="min-h-screen overflow-hidden">{children}</body>
    </html>
  );
}
