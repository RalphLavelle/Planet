import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import Link from "next/link";
import "leaflet/dist/leaflet.css";
import "./globals.css";

const serif = Fraunces({ subsets: ["latin"], variable: "--font-serif", display: "swap" });
const sans = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });

export const metadata: Metadata = { title: "Planet — personal travel guides", description: "Generate, edit and carry a personalised travel guide for your trip." };
export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable}`}>
      <body>
        <a href="#main" className="skip">Skip to content</a>
        <nav className="topbar" aria-label="Main">
          <Link href="/" className="brand"><span className="brand-dot" aria-hidden="true" />Planet</Link>
          <div className="topbar-links"><Link href="/new" className="btn btn-small">New trip</Link></div>
        </nav>
        <main id="main">{children}</main>
        <footer className="footer"><p>Planet MVP · trips are stored only in this browser. Content marked “Demo data” is illustrative, not verified. · <Link href="/credits">Photo credits</Link></p></footer>
      </body>
    </html>
  );
}
