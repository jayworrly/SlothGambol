import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Web3Provider } from "@/components/providers/Web3Provider";
import { WebSocketProvider } from "@/components/providers/WebSocketProvider";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "SlothGambol | On-Chain Poker",
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
        className={`${inter.variable} ${jetbrainsMono.variable} bg-animated-gradient min-h-screen text-white antialiased`}
      >
        <Web3Provider>
          <WebSocketProvider>{children}</WebSocketProvider>
        </Web3Provider>
      </body>
    </html>
  );
}
