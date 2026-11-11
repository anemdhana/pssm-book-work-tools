import type { Metadata } from "next";
import { Libre_Baskerville, Noto_Sans_Telugu, Noto_Serif_Telugu, Source_Sans_3 } from "next/font/google";
import { SiteHeader } from "@/components/SiteHeader";
import "./globals.css";

const sansEn = Source_Sans_3({
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--font-sans-en",
  display: "swap",
});

const sansTe = Noto_Sans_Telugu({
  subsets: ["telugu"],
  weight: ["400", "600"],
  variable: "--font-sans-te",
  display: "swap",
  preload: false,
});

const serifEn = Libre_Baskerville({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-serif-en",
  display: "swap",
});

const serifTe = Noto_Serif_Telugu({
  subsets: ["telugu"],
  weight: ["400", "600"],
  variable: "--font-serif-te",
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  title: {
    default: "PSSM Book Work",
    template: "%s · PSSM Book Work",
  },
  description: "Import a book PDF and edit its sections and paragraphs.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${sansEn.variable} ${sansTe.variable} ${serifEn.variable} ${serifTe.variable}`}>
      <body>
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
