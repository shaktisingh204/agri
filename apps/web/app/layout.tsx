import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AgriSphere Crop Calendar",
  description: "Multi-tenant crop calendar intelligence platform"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

