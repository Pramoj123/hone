import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Hone — The operating system for modern gyms",
  description:
    "Hone gives gyms and fitness studios one platform for members, trainers, workout programming, assessments, and progress tracking — across every branch.",
  openGraph: {
    title: "Hone — The operating system for modern gyms",
    description:
      "One platform for members, trainers, workout programming, assessments, and progress tracking — across every branch.",
    url: "https://hone.fit",
    siteName: "Hone",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <html lang="en">
      <body className={geist.className}>{children}</body>
    </html>
  );
}
