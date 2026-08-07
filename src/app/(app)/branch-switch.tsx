"use client";

import { useTransition } from "react";
import { switchBranch } from "./branch-actions";

type Branch = { id: string; name: string };

export default function BranchSwitch({
  branches,
  activeId,
  label,
}: {
  branches: Branch[];
  activeId: string;
  label: string;
}) {
  const [pending, start] = useTransition();
  if (branches.length <= 1) {
    return (
      <div className="px-2 py-1.5 text-[11px] text-[#8b84b0]">
        {branches[0]?.name ?? label}
      </div>
    );
  }
  return (
    <label className="block px-1" aria-busy={pending}>
      <span className="sr-only">{label}</span>
      <select
        value={activeId}
        disabled={pending}
        onChange={(e) => {
          const id = e.target.value;
          start(() => void switchBranch(id));
        }}
        className="w-full rounded-lg bg-white/5 border border-white/10 text-[#e7e3fb] text-xs font-semibold px-2.5 py-2 outline-none focus:border-white/30"
      >
        {branches.map((b) => (
          <option key={b.id} value={b.id} className="text-[#1c1830]">
            {b.name}
          </option>
        ))}
      </select>
    </label>
  );
}
