import { useState } from "react";
import Icon from "../components/Icon.jsx";
import Feedback from "../components/Feedback.jsx";
import { loginLabStaff } from "../api.js";
import { saveSession } from "../session.js";

export default function LabLogin({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event) {
    event.preventDefault(); setError(""); setBusy(true);
    try {
      const result = await loginLabStaff(username, password);
      const session = { ...result, role: "LAB" };
      saveSession(session); document.body.dataset.role = "LAB"; onLogin(session);
    } catch (failure) {
      const status = failure?.response?.status;
      setError(status === 401 ? "Those sign-in details weren’t recognized. Check them and try again." : status === 503 ? "Lab sign-in is taking a short break. Please try again in a moment." : "We couldn’t complete sign-in. Check your connection and try again.");
    } finally { setBusy(false); }
  }
  const inputClass = "mt-1 w-full rounded-xl border-[1.5px] border-[var(--line)] bg-white px-3.5 py-3 text-base text-[var(--ink)] outline-none focus:border-[var(--accent)]";
  return <main className="relative z-10 grid min-h-screen place-items-center p-6">
    <section className="glass fade-up w-full max-w-[430px] rounded-3xl p-6 shadow-2xl">
      <nav className="mb-5 flex rounded-xl bg-slate-100 p-1 text-sm font-semibold" aria-label="Choose sign-in type"><a href="/" className="flex-1 rounded-lg px-3 py-2 text-center text-slate-600 transition hover:bg-white">Doctor</a><span className="flex-1 rounded-lg bg-white px-3 py-2 text-center text-emerald-700 shadow-sm">Lab staff</span></nav>
      <div className="mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-700"><Icon name="flask" size={27} /></div>
      <p className="text-xs font-bold uppercase tracking-[.16em] text-emerald-700">Laboratory workspace</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">Welcome, lab staff</h1>
      <p className="mt-1 mb-5 text-sm text-[var(--muted)]">Sign in to review assigned tests and file patient reports.</p>
      <form onSubmit={submit}>
        <label className="mb-4 block text-xs font-semibold text-[var(--muted)]">Username<input autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} className={inputClass} required maxLength={120} /></label>
        <label className="mb-5 block text-xs font-semibold text-[var(--muted)]">Password<input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className={inputClass} required maxLength={200} /></label>
        {error && <div className="mb-3"><Feedback message={error} compact /></div>}
        <button disabled={busy} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-700 py-3.5 text-base font-bold text-white shadow-lg transition hover:-translate-y-0.5 disabled:opacity-70">{busy ? <><i className="spinner" />Signing in</> : <><Icon name="lock" size={17} />Sign in to lab</>}</button>
      </form>
    </section>
  </main>;
}
