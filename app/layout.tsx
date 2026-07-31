import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Frontera",
  description:
    "A streaming Claude workspace — one logged choke point for every model call, with tokens, latency, and cost kept observable.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <span className="logo">◆ Frontera</span>
          <nav>
            <span className="badge">Live demo</span>
          </nav>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
