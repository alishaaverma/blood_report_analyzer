import Link from "next/link";

export default function NotFound() {
  return <main className="page-shell"><section className="card narrow"><p className="eyebrow">404</p><h1>Page not found</h1><p className="lead">The page or report you requested does not exist, or you do not have access to it.</p><Link className="button" href="/reports">Go to my reports</Link></section></main>;
}
