import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CC — Meeting Agent",
  description: "Team meetings with built-in AI memory. Schedule, meet, and never repeat the same discussion twice.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
