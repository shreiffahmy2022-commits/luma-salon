"use client";

import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { register, type AuthState } from "../actions";

type Labels = Record<string, string>;

function Submit({ L }: { L: Labels }) {
  const { pending } = useFormStatus();
  return <button className="btn-primary w-full justify-center py-3 mt-4" disabled={pending}>{pending ? L.creating : L.createAccount}</button>;
}

export default function RegisterForm({ labels: L }: { labels: Labels }) {
  const [state, action] = useFormState<AuthState, FormData>(register, {});
  return (
    <div className="min-h-screen grid place-items-center p-4">
      <div className="card w-full max-w-sm p-8">
        <h1 className="text-xl font-bold mb-1">{L.createSalon}</h1>
        <p className="text-sm text-[#7a7590] mb-4">{L.registerSub}</p>
        <form action={action}>
          <label className="lbl">{L.businessName}</label>
          <input className="inp" name="orgName" placeholder={L.orgPlaceholder} required />
          <label className="lbl">{L.yourName}</label>
          <input className="inp" name="name" placeholder={L.namePlaceholder} required />
          <label className="lbl">{L.email}</label>
          <input className="inp" name="email" type="email" required />
          <label className="lbl">{L.passwordMin}</label>
          <input className="inp" name="password" type="password" minLength={8} required />
          {state.error && <p className="text-sm text-red-600 mt-3">{state.error}</p>}
          <Submit L={L} />
        </form>
        <p className="text-sm text-[#7a7590] mt-5">{L.haveAccount} <Link className="text-brand font-semibold" href="/login">{L.signinLink}</Link></p>
      </div>
    </div>
  );
}
