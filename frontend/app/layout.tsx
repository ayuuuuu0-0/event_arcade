import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";

export const metadata: Metadata = {
  title: "EventArcade",
  description: "Event-driven arcade battle simulation",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <nav className="border-b border-[var(--border)] px-6 py-3 flex items-center gap-6">
          <span className="text-[var(--cyan)] font-bold text-lg tracking-widest uppercase">
            EventArcade
          </span>
          <Link
            href="/"
            className="text-[var(--dim)] hover:text-[var(--green)] text-sm uppercase tracking-wider"
          >
            Dashboard
          </Link>
          <Link
            href="/play"
            className="text-[var(--dim)] hover:text-[var(--green)] text-sm uppercase tracking-wider"
          >
            Play
          </Link>
        </nav>
        <main className="p-4">{children}</main>
      </body>
    </html>
  );
}
