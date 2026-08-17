"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({
  children,
  pendingText = "Please wait…",
  className = "button",
}: {
  children: React.ReactNode;
  pendingText?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button className={className} disabled={pending} type="submit">
      {pending ? pendingText : children}
    </button>
  );
}
