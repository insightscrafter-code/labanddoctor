import { useEffect, useState } from "react";
import Icon from "../components/Icon.jsx";
import Feedback from "../components/Feedback.jsx";
import { getTodayAppointments, getApiMessage } from "../api.js";

function formatAppointmentDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date not set" : date.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

function CardSection({ title, description, icon, badge, children }) {
  return <section className="glass p-5 sm:p-6">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="flex items-center gap-2 text-lg font-semibold"><Icon name={icon} className="text-[var(--accent)]" />{title}</h2><p className="mt-1 text-sm text-[var(--muted)]">{description}</p></div>
      {badge !== undefined && <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-bold text-blue-700">{badge}</span>}
    </div>
    {children}
  </section>;
}

function openTreatment(appointment) {
  if (!appointment.patientCnic) return;
  const query = new URLSearchParams({ name: appointment.patientName || "", complaint: appointment.complaint || "" });
  window.history.pushState({}, "", `/doctor/treatment/${encodeURIComponent(appointment.patientCnic)}?${query}`);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

export default function Dashboard({ session, onLogout }) {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshCount, setRefreshCount] = useState(0);

  useEffect(() => {
    let active = true;
    getTodayAppointments()
      .then((result) => { if (active) { setAppointments(result); setError(""); } })
      .catch((loadError) => { if (active) setError(getApiMessage(loadError, "Could not load appointments.")); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [refreshCount]);

  return <div className="relative z-10 mx-auto max-w-6xl px-4 py-6 fade-up sm:px-6 sm:py-8">
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <img src="/chds-logo.png" alt="CHDS" width="48" height="48" className="h-12 w-12 rounded-xl border border-[var(--line)] bg-white object-contain p-1 shadow-sm" />
        <div><span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--accent)] px-3 py-1 text-xs font-bold text-white"><Icon name="stethoscope" size={14} />Doctor Portal</span><h1 className="mt-2 flex items-center gap-2 text-2xl font-semibold sm:text-3xl"><Icon name="user" size={24} className="text-[var(--accent)]" />Welcome, {session.name}</h1></div>
      </div>
      <button onClick={onLogout} className="inline-flex items-center gap-2 rounded-lg border-[1.5px] border-[var(--accent)] bg-white px-4 py-2 font-semibold text-[var(--accent)]"><Icon name="log-out" size={16} />Log out</button>
    </header>

    <main className="mt-6 space-y-6">
      <section className="relative isolate overflow-hidden rounded-[28px] bg-gradient-to-br from-[#173967] via-[#1f4fd8] to-[#527fe8] p-6 text-white shadow-xl sm:p-8 lg:p-10">
        <div className="pointer-events-none absolute -right-12 -top-20 -z-10 h-72 w-72 rounded-full border border-white/15" />
        <div className="grid items-center gap-7 lg:grid-cols-[1fr_auto]">
          <div className="max-w-2xl"><p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-blue-100"><Icon name="stethoscope" size={15} />Doctor workspace</p><h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">Your patient care, in one place.</h2><p className="mt-3 max-w-xl text-sm leading-6 text-blue-50 sm:text-base">Review today’s appointments and patient visit details.</p></div>
          <button type="button" onClick={() => { setLoading(true); setError(""); setRefreshCount((value) => value + 1); }} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-[#173967] shadow-lg transition hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-70"><Icon name="activity" size={17} />{loading ? "Loading appointments" : "Refresh appointments"}</button>
        </div>
      </section>

      {error && <Feedback message={error} onRetry={() => { setLoading(true); setError(""); setRefreshCount((value) => value + 1); }} />}

      <section className="grid gap-3 sm:grid-cols-2">
        <div className="glass flex items-center gap-4 p-5"><span className="grid h-11 w-11 place-items-center rounded-xl bg-blue-50 text-blue-700"><Icon name="calendar" size={21} /></span><div><p className="text-sm text-[var(--muted)]">Today’s appointments</p><p className="text-2xl font-bold">{loading ? "—" : appointments.length}</p></div></div>
        <div className="glass flex items-center gap-4 p-5"><span className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><Icon name="clock" size={21} /></span><div><p className="text-sm text-[var(--muted)]">Next appointment</p><p className="text-base font-bold">{appointments[0] ? formatAppointmentDate(appointments[0].appointmentAt) : loading ? "Loading…" : "No appointments"}</p></div></div>
      </section>

      <CardSection title="Appointments & visits" description="Patient identity, appointment time, and reason for visit." icon="calendar" badge={loading ? "…" : appointments.length}>
        {loading ? <div className="rounded-xl bg-white/70 p-8 text-center text-[var(--muted)]" role="status">Loading appointments…</div> : error ? <div className="rounded-xl bg-white/70 p-6 text-center text-sm text-[var(--muted)]">Refresh to try loading appointments again.</div> : appointments.length === 0 ? <div className="flex flex-col items-center rounded-2xl bg-white/70 px-6 py-12 text-center"><span className="grid h-14 w-14 place-items-center rounded-2xl bg-blue-50 text-blue-700"><Icon name="calendar" size={25} /></span><h3 className="mt-4 font-semibold">Your schedule is clear</h3><p className="mt-1 max-w-md text-sm text-[var(--muted)]">New appointments assigned to you will appear here.</p></div> : <div className="space-y-3">
          {appointments.map((appointment) => <article key={appointment.id} className="glass overflow-hidden border-l-4 border-l-[var(--accent)] p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3"><div className="flex items-start gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-700"><Icon name="calendar" size={20} /></span><div><p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Appointment time</p><p className="mt-1 font-semibold">{formatAppointmentDate(appointment.appointmentAt)}</p></div></div><span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800">{appointment.status}</span></div>
            <div className="mt-5 flex items-center gap-3 border-t border-[var(--line)] pt-5"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#e8f3ef] text-[#16715f]"><Icon name="user" size={19} /></span><div className="min-w-0"><h3 className="break-words text-lg font-bold">{appointment.patientName}</h3><p className="text-sm text-[var(--muted)]">Patient</p></div></div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2"><div className="rounded-xl bg-white/80 px-4 py-3"><p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">CNIC / patient ID</p><p className="mt-1 break-all font-semibold">{appointment.patientCnic || "ID not available"}</p></div><div className="rounded-xl bg-white/80 px-4 py-3"><p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Contact number</p><p className="mt-1 break-all font-semibold">{appointment.patientPhone || "Not provided"}</p></div></div>
            <div className="mt-3 rounded-xl border border-[#d6e9e3] bg-[#f1f8f5] px-4 py-3"><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[#176451]"><Icon name="file-text" size={15} />Reason for visit</p><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6">{appointment.complaint || "No reason provided"}</p></div>
            <div className="mt-4 flex justify-end"><button type="button" onClick={() => openTreatment(appointment)} disabled={!appointment.patientCnic} className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300">🩺 Start treatment</button></div>
          </article>)}
        </div>}
      </CardSection>
    </main>
  </div>;
}
