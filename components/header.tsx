import Image from "next/image";
import Link from "next/link";
import type { User } from "@/lib/types";

export function Header({ user }: { user: User | null }) {
  return (
    <header className="site-header">
      <nav className="nav-shell" aria-label="Main navigation">
        <Link href={user ? "/reports" : "/"} className="brand">
          <Image src="/images/blood-drop-logo.svg" alt="" width={42} height={42} priority />
          <span>Blood Report <strong>Analyzer</strong></span>
        </Link>
        <div className="nav-links">
          {user ? (
            <>
              <Link href="/reports">My reports</Link>
              <Link href="/reports/upload">Upload</Link>
              <Link href="/profile">Profile</Link>
              {user.isAdmin && <Link href="/admin">Admin</Link>}
              <form action="/api/auth/logout" method="post">
                <button className="nav-logout" type="submit">Log out</button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login">Log in</Link>
              <Link href="/signup" className="button button-small">Create account</Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
