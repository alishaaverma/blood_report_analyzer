import { expiredSessionCookie } from "@/lib/auth";
import { formRedirect } from "@/lib/http";

export async function POST(request: Request) {
  const response = formRedirect(request, "/login", {
    success: "You have been logged out.",
  });
  const cookie = expiredSessionCookie();
  response.cookies.set(cookie.name, cookie.value, cookie.options);
  return response;
}
