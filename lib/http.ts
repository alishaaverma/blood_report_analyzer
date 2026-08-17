import { NextResponse } from "next/server";

type RequestInput =
  | { format: "json"; values: Record<string, unknown> }
  | { format: "form"; values: FormData };

export function formRedirect(
  request: Request,
  pathname: string,
  params: Record<string, string> = {},
) {
  const url = new URL(pathname, request.url);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return NextResponse.redirect(url, 303);
}

export function textField(form: FormData, name: string) {
  return String(form.get(name) ?? "").trim();
}

export async function readRequestInput(request: Request): Promise<RequestInput> {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.includes("application/json")) {
    return { format: "form", values: await request.formData() };
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  return {
    format: "json",
    values:
      body && typeof body === "object" && !Array.isArray(body)
        ? (body as Record<string, unknown>)
        : {},
  };
}

export function inputField(input: RequestInput, name: string, trim = true) {
  const value = input.format === "json" ? input.values[name] : input.values.get(name);
  const text = typeof value === "string" ? value : "";
  return trim ? text.trim() : text;
}
