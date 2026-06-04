import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Draco 3D Converter - Convertí modelos 3D a GLB",
  description: "Conversor de modelos 3D a GLB con compresión Draco. Soporta OBJ, PLY, STL, glTF, DAE y más.",
  keywords: ["Draco", "3D", "GLB", "glTF", "compression", "converter", "SketchUp", "SKP"],
  authors: [{ name: "yecos" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "Draco 3D Converter",
    description: "Conversor de modelos 3D a GLB con compresión Draco",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Draco 3D Converter",
    description: "Conversor de modelos 3D a GLB con compresión Draco",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
