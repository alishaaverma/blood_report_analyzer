"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { SubmitButton } from "@/components/submit-button";

export function ChangePasswordDialog({
  passwordMinLength,
}: {
  passwordMinLength: number;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const dialog = open ? (
    <div className="modal-backdrop" role="presentation" onClick={() => setOpen(false)}>
      <section
        className="modal-panel change-password-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="change-password-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-head">
          <div>
            <p className="eyebrow">Account security</p>
            <h2 id="change-password-title">Change your password</h2>
            <p className="muted small">
              Confirm your current password before creating a new one.
            </p>
          </div>
          <button
            className="modal-close"
            type="button"
            aria-label="Close password form"
            autoFocus
            onClick={() => setOpen(false)}
          >
            ×
          </button>
        </div>

        <form
          action="/api/profile/password"
          method="post"
          className="change-password-form"
        >
          <div className="field">
            <label htmlFor="currentPassword">Current password</label>
            <input
              id="currentPassword"
              name="currentPassword"
              type="password"
              autoComplete="current-password"
              required
            />
          </div>
          <div className="field">
            <label htmlFor="newPassword">New password</label>
            <input
              id="newPassword"
              name="newPassword"
              type="password"
              minLength={passwordMinLength}
              autoComplete="new-password"
              required
            />
          </div>
          <div className="field">
            <label htmlFor="confirmNewPassword">Confirm new password</label>
            <input
              id="confirmNewPassword"
              name="confirmNewPassword"
              type="password"
              minLength={passwordMinLength}
              autoComplete="new-password"
              required
            />
            <p className="field-help">Use at least {passwordMinLength} characters.</p>
          </div>
          <div className="change-password-actions">
            <button
              className="button button-secondary"
              type="button"
              onClick={() => setOpen(false)}
            >
              Cancel
            </button>
            <SubmitButton pendingText="Changing password…">Update password</SubmitButton>
          </div>
        </form>
      </section>
    </div>
  ) : null;

  return (
    <>
      <section className="card profile-security-option">
        <div className="profile-security-icon" aria-hidden="true">
          ✓
        </div>
        <div>
          <p className="eyebrow">Security</p>
          <h2>Protect your account</h2>
          <p>Update your password securely whenever you need to.</p>
        </div>
        <button
          className="button button-secondary"
          type="button"
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => setOpen(true)}
        >
          Change password
        </button>
      </section>
      {dialog ? createPortal(dialog, document.body) : null}
    </>
  );
}
