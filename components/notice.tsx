export function Notice({ type = "info", children }: { type?: "error" | "success" | "info"; children?: React.ReactNode }) {
  if (!children) return null;
  return <div className={`notice notice-${type}`} role={type === "error" ? "alert" : "status"}>{children}</div>;
}
