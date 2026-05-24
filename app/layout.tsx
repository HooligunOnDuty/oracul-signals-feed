import type { Metadata } from "next";
import "@fontsource-variable/stack-sans-notch/wght.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Oracul Signals",
  description: "Live prediction signals from Oracul Agent",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
