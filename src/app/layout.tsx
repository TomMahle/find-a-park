import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Find a Park · New York City",
    template: "%s · Find a Park",
  },
  description:
    "Find a park near you in New York City: browse the list or the map, then see hours, amenities and directions.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">
        <a
          href="#main"
          className="fixed top-2 left-2 z-50 -translate-y-16 rounded-md bg-accent px-4 py-2 font-medium text-on-accent focus:translate-y-0"
        >
          Skip to main content
        </a>
        <header className="border-b border-border bg-surface">
          <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6">
            <Link
              href="/"
              className="flex items-center gap-2 rounded-md text-lg font-semibold tracking-tight"
            >
              <LeafIcon />
              Find a Park
            </Link>
            <span className="text-sm text-muted">New York City</span>
          </div>
        </header>
        <main
          id="main"
          tabIndex={-1}
          className="flex flex-1 flex-col focus:outline-none"
        >
          {children}
        </main>
        <footer className="border-t border-border bg-surface">
          <p className="mx-auto max-w-7xl px-4 py-4 text-sm text-muted sm:px-6">
            Park listings are sample data for demonstration and may not match
            real parks. Always check with the park before you visit.
          </p>
        </footer>
      </body>
    </html>
  );
}

function LeafIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-7 text-accent"
      fill="currentColor"
    >
      <path d="M12 2C7 6 4.5 9.6 4.5 13.4A7.5 7.5 0 0 0 11 20.9V22h2v-1.1a7.5 7.5 0 0 0 6.5-7.5C19.5 9.6 17 6 12 2Zm1 16.9v-3.5l3.2-3.2-1.4-1.4L13 12.6V8h-2v6.6l-1.8-1.8-1.4 1.4 3.2 3.2v1.5a5.5 5.5 0 0 1-4.5-5.5c0-2.7 1.7-5.5 5.5-8.8 3.8 3.3 5.5 6.1 5.5 8.8a5.5 5.5 0 0 1-4.5 5.5Z" />
    </svg>
  );
}
