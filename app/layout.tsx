import type { Metadata } from "next";
import { Lexend } from "next/font/google";
import PlausibleProvider from "next-plausible";
// @ts-ignore
import "./globals.css";

const lexend = Lexend({ subsets: ["latin"] });

const SITE = {
  url: "https://neurosearch.com/",
  title: "NeuroSearch – AI Search Engine",
  description: "Search smarter and faster with our open source AI search engine",
  ogimage: "https://neurosearch.com/logo.svg",
  sitename: "NeuroSearch.com",
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: SITE.title,
  description: SITE.description,
  icons: { icon: "/favicon.ico" },
  openGraph: {
    images: [SITE.ogimage],
    title: SITE.title,
    description: SITE.description,
    url: SITE.url,
    siteName: SITE.sitename,
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    images: [SITE.ogimage],
    title: SITE.title,
    description: SITE.description,
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <PlausibleProvider domain="neurosearch.com" />
      </head>
      <body className={`${lexend.className} flex min-h-screen flex-col justify-between`}>
        {children}
      </body>
    </html>
  );
}
