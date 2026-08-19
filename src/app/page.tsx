import { redirect } from "next/navigation";
import { headers } from "next/headers";

export default async function Home() {
  const headerList = await headers();
  const cookieHeader = headerList.get("cookie") ?? "";
  const hasSessionCookie = /(?:^|;\s*)(?:__Secure-)?(?:authjs|next-auth)\.session-token=/.test(
    cookieHeader
  );

  if (hasSessionCookie) {
    redirect("/dashboard");
  } else {
    redirect("/login");
  }
}
