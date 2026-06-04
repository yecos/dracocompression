import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Draco 3D Converter - Convertí modelos 3D a GLB",
  description: "Conversor de modelos 3D a GLB con compresión Draco. Soporta OBJ, PLY, STL, glTF, DAE y más.",
  keywords: ["Draco", "3D", "GLB", "glTF", "compression", "converter", "SketchUp", "SKP"],
  authors: [{ name: "yecos" }],
  openGraph: {
    title: "Draco 3D Converter",
    description: "Conversor de modelos 3D a GLB con compresión Draco",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
