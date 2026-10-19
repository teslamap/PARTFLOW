import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PARTFLOW — იპოვე სწორი ავტონაწილი",
  description: "ერთი მოთხოვნა, შესაბამისი ავტომაღაზიების შეთავაზებები.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ka">
      <body className="antialiased">{children}</body>
    </html>
  );
}
