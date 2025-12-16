import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Web3Provider } from "@/components/providers/Web3Provider";
import { WebSocketProvider } from "@/components/providers/WebSocketProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Avalanche Poker",
  description: "Decentralized poker on Avalanche with trustless card dealing",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} bg-animated-gradient min-h-screen text-white antialiased`}
      >
        <Web3Provider>
          <WebSocketProvider>{children}</WebSocketProvider>
        </Web3Provider>
      </body>
    </html>
  );
}
