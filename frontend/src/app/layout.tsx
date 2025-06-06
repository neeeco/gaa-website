import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Audiowide } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const audiowide = Audiowide({
  weight: '400',
  variable: '--font-audiowide',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: "GAAToday - Live GAA Results & Fixtures",
  description: "Live GAA football and hurling results, fixtures, and championship tables",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${audiowide.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
