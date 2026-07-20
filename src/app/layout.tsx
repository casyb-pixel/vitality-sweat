import type { Metadata } from "next";
import { Source_Sans_3, Vesper_Libre } from "next/font/google";
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
  title: {
    default: "Vitality Sweat | Train. Fuel. Compete.",
    template: "%s | Vitality Sweat",
  },
  description:
    "On-demand fitness training, peak-performance nutrition, and youth baseball lessons from Hunter Broussard in Southwest Louisiana. Read The Sweatlife Chronicles.",
  icons: {
    icon: "/branding/favicon-32.png",
  },
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
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
