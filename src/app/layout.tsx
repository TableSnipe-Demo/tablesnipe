import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TableSnipe",
  description: "Monitor OpenTable for restaurant reservations",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-gray-950 text-gray-100 min-h-screen">
        {children}
      </body>
    </html>
  );
}
