"use client";

import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { login, type AuthState } from "../actions";

type Labels = Record<string, string>;

function Submit({ L }: { L: Labels }) {
  const { pending } = useFormStatus();
  return <button className="btn-primary w-full justify-center py-3 mt-4" disabled={pending}>{pending ? L.signingIn : L.signin}</button>;
}

export default function LoginForm({ labels: L }: { labels: Labels }) {
  const [state, action] = useFormState<AuthState, FormData>(login, {});
  return (
    <div className="min-h-screen grid place-items-center p-4">
      <div className="card w-full max-w-sm p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand to-teal-500 grid place-items-center text-white font-extrabold text-lg">L</div>
          <div><b className="text-lg">Luma</b><div className="text-xs text-[#7a7590]">{L.salonManager}</div></div>
        </div>
        <h1 className="text-xl font-bold mb-1">{L.welcome}</h1>
        <p className="text-sm text-[#7a7590] mb-4">{L.signinSub}</p>
        <form action={action}>
          <label className="lbl">{L.email}</label>
          <input className="inp" name="email" type="email" placeholder="owner@luma.demo" required />
          <label className="lbl">{L.password}</label>
          <input className="inp" name="password" type="password" placeholder="demo1234" required />
          {state.error && <p className="text-sm text-red-600 mt-3">{state.error}</p>}
          <Submit L={L} />
        </form>
        <p className="text-sm text-[#7a7590] mt-5">{L.newHere} <Link className="text-brand font-semibold" href="/register">{L.createSalon}</Link></p>
        <p className="text-xs text-[#7a7590] mt-3">Demo login after seeding: owner@luma.demo / demo1234</p>
      </div>
    </div>
  );
}
