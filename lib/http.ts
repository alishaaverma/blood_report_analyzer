import { NextResponse } from "next/server";

export function formRedirect(request: Request, pathname: string, params: Record<string, string> = {}) {
  const url = new URL(pathname, request.url);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return NextResponse.redirect(url, 303);
}

export function textField(form: FormData, name: string) {
  return String(form.get(name) ?? "").trim();
}
