import Image from "next/image";
import Link from "next/link";
import { ExternalReportsModal } from "@/components/external-reports-modal";
import { APP_NAME } from "@/lib/constants";
import type { User } from "@/lib/types";

export function Header({ user }: { user: User | null }) {
  return (
    <header className="site-header">
      <nav className="nav-shell" aria-label="Main navigation">
        <Link href="/" className="brand">
          <Image
            src="/images/blood-drop-logo.svg"
            alt=""
            width={42}
            height={42}
            priority
          />
          <span aria-label={APP_NAME}>
            Blood Report <strong>Analyzer</strong>
          </span>
        </Link>
        <div className="nav-links">
          {user ? (
            <>
              <ExternalReportsModal />
              <Link className="nav-primary-link" href="/daily-health-reports">
                Daily health report
              </Link>
              <Link href="/nearby">Find care</Link>
              <Link href="/health-tracker">Health tracker</Link>
              <Link href="/profile">Profile</Link>
              {user.isAdmin && <Link href="/admin">Admin</Link>}
              <form action="/api/auth/logout" method="post">
                <button className="nav-logout" type="submit">
                  Log out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login">Log in</Link>
              <Link href="/signup" className="button button-small">
                Create account
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
