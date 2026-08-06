import Image from "next/image";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";

export default async function HomePage() {
  const user = await getCurrentUser();
  return (
    <main className="page-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">Understand your numbers</p>
          <h1>Your lab report,<br />made easier to read.</h1>
          <p className="lead">Upload a supported blood-report PDF and get a transparent breakdown of recognized results, reference ranges, and sensible next steps.</p>
          <div className="hero-actions">
            <Link className="button" href={user ? "/reports/upload" : "/signup"}>{user ? "Upload a report" : "Analyze my report"}</Link>
            <Link className="button button-secondary" href={user ? "/reports" : "/login"}>{user ? "View my reports" : "I already have an account"}</Link>
          </div>
          <div className="trust-row"><span>Private local storage</span><span>Clear range checks</span><span>Educational guidance</span></div>
        </div>
        <Image className="hero-art" src="/images/upload-report.svg" width={360} height={300} alt="Illustration of a lab report being uploaded" priority />
      </section>
    </main>
  );
}
