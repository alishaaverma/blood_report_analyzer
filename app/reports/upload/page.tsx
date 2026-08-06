import Image from "next/image";
import Link from "next/link";
import { Notice } from "@/components/notice";
import { SubmitButton } from "@/components/submit-button";
import { requireUser } from "@/lib/auth";

export const metadata = { title: "Upload report" };

export default async function UploadReportPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requireUser();
  const query = await searchParams;
  return (
    <main className="page-shell">
      <Link href="/reports" className="small">← Back to reports</Link>
      <section className="card upload-layout" style={{ marginTop: 18 }}>
        <div>
          <p className="eyebrow">New analysis</p><h1>Upload a lab report</h1>
          <p className="lead">Choose a text-based PDF. We’ll extract recognizable test lines and compare them with the configured reference ranges.</p>
          <Notice type="error">{query.error}</Notice>
          <form action="/api/reports" method="post" encType="multipart/form-data">
            <div className="field"><label htmlFor="title">Report title</label><input id="title" name="title" maxLength={255} placeholder="e.g. Annual health check — August 2026" /></div>
            <div className="field"><label htmlFor="pdf">PDF report</label><input className="file-input" id="pdf" name="pdf" type="file" accept="application/pdf,.pdf" required /><p className="field-help">PDF only, up to 10 MB. Image-only scans require OCR before upload.</p></div>
            <SubmitButton pendingText="Uploading and analyzing…">Upload & analyze</SubmitButton>
          </form>
        </div>
        <Image src="/images/upload-report.svg" width={360} height={300} alt="A report document with an upload arrow" />
      </section>
    </main>
  );
}
