import { useState } from "react";
import Icon from "../components/Icon.jsx";
import Feedback from "../components/Feedback.jsx";
import { loginDoctor, getApiMessage } from "../api.js";
import { saveSession } from "../session.js";

export default function Login({ onLogin }) {
  const [doctorId, setDoctorId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    setError("");
    if (!/^\d+$/.test(doctorId.trim()) || Number(doctorId) < 1) {
      setError("Enter your numeric doctor ID.");
      return;
    }
    if (!password) {
      setError("Enter your password.");
      return;
    }
    setBusy(true);
    try {
      const result = await loginDoctor(doctorId.trim(), password);
      const session = { ...result, role: "DOCTOR" };
      saveSession(session);
      document.body.dataset.role = "DOCTOR";
      onLogin(session);
    } catch (loginError) {
      setError(getApiMessage(loginError, "Could not sign in. Try again."));
    } finally {
      setBusy(false);
    }
  }

  const inputClass = "mt-1 w-full rounded-xl border-[1.5px] border-[var(--line)] bg-white px-3.5 py-3 text-base text-[var(--ink)] outline-none focus:border-[var(--accent)]";
  return <main className="relative z-10 grid min-h-screen place-items-center p-6">
    <section className="glass fade-up w-full max-w-[420px] rounded-3xl p-6 shadow-2xl">
      <svg viewBox="0 0 300 44" preserveAspectRatio="none" className="h-11 w-full" aria-hidden="true">
        <path pathLength="1" fill="none" stroke="var(--accent)" strokeWidth="2.5" opacity=".15" d="M0 24H70L82 24L92 6L104 40L114 14L122 24H300" />
        <path pathLength="1" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="ecg-run" d="M0 24H70L82 24L92 6L104 40L114 14L122 24H300" />
      </svg>
      <nav className="mt-3 flex rounded-xl bg-slate-100 p-1 text-sm font-semibold" aria-label="Choose sign-in type"><span className="flex-1 rounded-lg bg-white px-3 py-2 text-center text-[var(--accent)] shadow-sm">Doctor</span><a href="/lab/login" className="flex-1 rounded-lg px-3 py-2 text-center text-slate-600 transition hover:bg-white">Lab staff</a></nav>
      <h1 className="mt-1 flex items-center gap-2 text-[26px] font-semibold tracking-tight"><Icon name="hospital" size={26} className="text-[var(--accent)]" />Al Shifa Hospital</h1>
      <p className="mb-5 text-sm text-[var(--muted)]">Doctor portal · Sign in to continue</p>
      <form onSubmit={submit}>
        <label htmlFor="doctorId" className="mb-3 block text-xs font-semibold text-[var(--muted)]">
          <span className="inline-flex items-center gap-1.5"><Icon name="user" size={14} />Doctor ID</span>
          <input id="doctorId" name="doctorId" type="text" inputMode="numeric" autoComplete="username" value={doctorId} onChange={(event) => setDoctorId(event.target.value)} className={inputClass} required />
        </label>
        <label htmlFor="password" className="mb-5 block text-xs font-semibold text-[var(--muted)]">
          <span className="inline-flex items-center gap-1.5"><Icon name="lock" size={14} />Password</span>
          <div className="relative mt-1">
            <input id="password" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className={`${inputClass} mt-0 pr-16`} required />
            <button type="button" onClick={() => setShowPassword((visible) => !visible)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded px-1 py-1 text-xs font-semibold text-[var(--accent)] hover:underline">{showPassword ? "Hide" : "Show"}</button>
          </div>
        </label>
        {error && <div className="mb-3"><Feedback message={error} compact /></div>}
        <button type="submit" disabled={busy} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--accent)] py-3.5 text-base font-bold text-white shadow-lg transition hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-70">
          {busy ? <><i className="spinner" />Checking credentials</> : <><Icon name="lock" size={17} />Sign in</>}
        </button>
      </form>
    </section>
  </main>;
}
