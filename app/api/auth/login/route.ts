import { sessionCookie, verifyPassword } from "@/lib/auth";
import { formRedirect, textField } from "@/lib/http";
import { readStore } from "@/lib/store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const form = await request.formData();
  const login = textField(form, "login").toLowerCase();
  const password = textField(form, "password");
  const data = await readStore();
  const user = data.users.find((item) => item.username.toLowerCase() === login || item.email.toLowerCase() === login);
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return formRedirect(request, "/login", { error: "Invalid username, email, or password." });
  }
  const response = formRedirect(request, "/reports");
  const cookie = sessionCookie(user.id);
  response.cookies.set(cookie.name, cookie.value, cookie.options);
  return response;
}
