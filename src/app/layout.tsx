import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import "./globals.css";
import { BottomNav } from "@/components/BottomNav";
import { ChatButton } from "@/components/ChatButton";
import { ChatProvider } from "@/contexts/ChatContext";
import { MainContentWrapper } from "@/components/MainContentWrapper";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";
import { auth } from "@/lib/auth";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FitStreak — Daily Workout Habits",
  description:
    "Mobile-first morning workout routines matched to every day of the week to build a sustainable habit streak.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "FitStreak",
  },
  applicationName: "FitStreak",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#34d399",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [session, locale, messages] = await Promise.all([
    auth(),
    getLocale(),
    getMessages(),
  ]);

  return (
    <html lang={locale}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-950 text-slate-100`}
      >
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ChatProvider>
            <ServiceWorkerRegistration />
            <MainContentWrapper>
              {children}
            </MainContentWrapper>
            {session?.user && <BottomNav />}
            {session?.user && <ChatButton />}
          </ChatProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
