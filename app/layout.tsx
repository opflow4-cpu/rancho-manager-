import type { Metadata } from "next";
import { Inter, Cinzel } from "next/font/google";

import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const cinzel = Cinzel({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-cinzel" });

export const metadata: Metadata = {
  title: "Rancho Manager",
  description: "Painel interno de gestão de contas do Instagram",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="dark">
      <body className={`${inter.variable} ${cinzel.variable} font-sans`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
