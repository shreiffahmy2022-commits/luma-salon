"use client";

import { useTransition } from "react";
import { setLocale } from "./i18n-actions";
import type { Locale } from "@/lib/i18n";

export default function LangSwitch({ locale }: { locale: Locale }) {
  const [pending, start] = useTransition();
  const choose = (l: Locale) => start(() => void setLocale(l));
  return (
    <div className="flex items-center gap-1 rounded-lg bg-white/5 p-0.5 text-xs" aria-busy={pending}>
      {(["en", "ar"] as const).map((l) => (
        <button
          key={l}
          onClick={() => choose(l)}
          disabled={pending || l === locale}
          className={`px-2.5 py-1 rounded-md font-semibold transition ${
            l === locale ? "bg-white/15 text-white" : "text-[#bdb6de] hover:text-white"
          }`}
        >
          {l === "en" ? "EN" : "ع"}
        </button>
      ))}
    </div>
  );
}
