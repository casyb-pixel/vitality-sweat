import type { Metadata } from "next";
import { Source_Sans_3, Vesper_Libre } from "next/font/google";
import AuthGate from "@/components/auth/AuthGate";
import ReferralCapture from "@/components/auth/ReferralCapture";
import GoogleAnalytics from "@/components/seo/GoogleAnalytics";
import JsonLd from "@/components/seo/JsonLd";
import StoreCartShell from "@/components/store/StoreCartShell";
import { buildOrganizationJsonLd, buildWebSiteJsonLd } from "@/lib/blog/posts";
import {
  DEFAULT_DESCRIPTION,
  DEFAULT_OG_IMAGE,
  SITE_NAME,
  SITE_TAGLINE,
  SITE_URL,
  TWITTER_HANDLE,
} from "@/lib/seo/site";
import "./globals.css";

const vesperLibre = Vesper_Libre({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  variable: "--font-vesper",
  display: "swap",
});

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-source-sans",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} | ${SITE_TAGLINE}`,
    template: `%s | ${SITE_NAME}`,
  },
  description: DEFAULT_DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: "Hunter Broussard" }],
  creator: "Hunter Broussard",
  publisher: SITE_NAME,
  keywords: [
    "Vitality Sweat",
    "Sweatlife Chronicles",
    "Hunter Broussard",
    "fitness training",
    "youth baseball Louisiana",
    "performance nutrition",
    "Southwest Louisiana",
  ],
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} | ${SITE_TAGLINE}`,
    description: DEFAULT_DESCRIPTION,
    images: [
      {
        url: DEFAULT_OG_IMAGE,
        width: 1200,
        height: 630,
        alt: "Vitality Sweat: strength, stamina, and youth baseball",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} | ${SITE_TAGLINE}`,
    description: DEFAULT_DESCRIPTION,
    images: [DEFAULT_OG_IMAGE],
    creator: TWITTER_HANDLE,
  },
  icons: {
    icon: "/branding/favicon-32.png",
    apple: "/branding/app/android-icon-192.png",
  },
  category: "fitness",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${vesperLibre.variable} ${sourceSans.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">
        <GoogleAnalytics />
        <ReferralCapture />
        <AuthGate />
        <JsonLd data={[buildOrganizationJsonLd(), buildWebSiteJsonLd()]} />
        <StoreCartShell>
          <main className="flex-1">{children}</main>
        </StoreCartShell>
      </body>
    </html>
  );
}
