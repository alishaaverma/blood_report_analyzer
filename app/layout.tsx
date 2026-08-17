import type { Metadata } from "next";
import { Header } from "@/components/header";
import { getCurrentUser } from "@/lib/auth";
import { APP_NAME } from "@/lib/constants";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: APP_NAME, template: `%s · ${APP_NAME}` },
  description:
    "Turn supported blood-report PDFs into clear, educational health insights.",
  icons: { icon: "/images/blood-drop-logo.svg" },
};

export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await getCurrentUser();
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <Header user={user} />
        {children}
        <footer className="site-footer">
          <p>
            This tool provides general educational information only and is not a
            substitute for professional medical advice, diagnosis, or treatment. Always
            consult a licensed doctor.
          </p>
        </footer>
      </body>
    </html>
  );
}
