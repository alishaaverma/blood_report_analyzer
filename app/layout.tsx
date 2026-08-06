import type { Metadata } from "next";
import { Header } from "@/components/header";
import { MobileNavSpacer } from "@/components/mobile-nav";
import { getCurrentUser } from "@/lib/auth";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Blood Report Analyzer", template: "%s · Blood Report Analyzer" },
  description: "Turn supported blood-report PDFs into clear, educational health insights.",
  icons: { icon: "/images/blood-drop-logo.svg" },
};

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await getCurrentUser();
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <Header user={user} />
        {children}
        <footer className="site-footer">
          <p>This tool provides general educational information only and is not a substitute for professional medical advice, diagnosis, or treatment. Always consult a licensed doctor.</p>
        </footer>
        <MobileNavSpacer />
      </body>
    </html>
  );
}
