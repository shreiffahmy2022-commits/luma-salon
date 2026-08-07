"use client";

import { useFormState, useFormStatus } from "react-dom";
import { updateBookingSlug, type SlugState } from "./actions";

type Labels = Record<string, string>;

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return <button className="btn-ghost !py-2 !px-4 text-sm shrink-0" disabled={pending}>{label}</button>;
}

export default function SlugForm({ slug, labels: L }: { slug: string; labels: Labels }) {
  const [state, action] = useFormState<SlugState, FormData>(updateBookingSlug, {});
  // After a successful change the server component re-renders with the new slug,
  // so prefer the saved value over the prop only while this form owns the update.
  const current = state.ok ?? slug;
  return (
    <form action={action} className="mt-4 pt-4 border-t border-dashed border-[#e9e6f2]">
      <label className="lbl !mt-0">{L.address}</label>
      <div className="flex items-center gap-2">
        <span className="text-sm text-[#7a7590] shrink-0">/book/</span>
        <input className="inp" name="slug" defaultValue={current} key={current} required />
        <Submit label={L.update} />
      </div>
      <p className="text-xs text-[#7a7590] mt-2">{L.help}</p>
      {state.ok && <p className="text-sm mt-2 font-semibold text-green-600">{L.ok}</p>}
      {state.error && <p className="text-sm mt-2 font-semibold text-red-600">{state.error === "taken" ? L.taken : L.invalid}</p>}
    </form>
  );
}
