"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { LOCALES, type Locale } from "@/lib/i18n";

export async function setLocale(locale: string) {
  const loc: Locale = (LOCALES as readonly string[]).includes(locale) ? (locale as Locale) : "en";
  cookies().set("locale", loc, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  revalidatePath("/", "layout");
}
