import { useCallback, useEffect, useState } from "react";
import Icon from "../components/Icon.jsx";
import Feedback from "../components/Feedback.jsx";
import {
  createMedicalRecord,
  createLabTestRequest,
  getApiMessage,
  getPatientRecords,
  getPatientReports,
  getPatientTests,
  openPatientReport,
  openPrescriptionPdf,
} from "../api.js";

const tabs = [
  { id: "visit", label: "New visit", emoji: "🩺" },
  { id: "history", label: "Medical history", emoji: "📚" },
  { id: "reports", label: "Reports", emoji: "🧾" },
  { id: "tests", label: "Tests", emoji: "🧪" },
  { id: "lab", label: "Request lab test", emoji: "🧫" },
];

function EmptyState({ emoji, title, detail }) {
  return <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-blue-200 bg-gradient-to-br from-white to-blue-50 px-6 py-10 text-center">
    <span className="grid h-16 w-16 place-items-center rounded-2xl bg-white text-3xl shadow-sm">{emoji}</span>
    <h3 className="mt-4 text-lg font-bold text-slate-800">{title}</h3>
    <p className="mt-2 max-w-lg text-sm leading-6 text-slate-500">{detail}</p>
  </div>;
}

function SectionCard({ title, caption, emoji, children, action }) {
  return <section className="glass p-5 sm:p-6">
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div className="flex items-start gap-3"><span className="text-2xl">{emoji}</span><div><h2 className="text-lg font-bold text-slate-800">{title}</h2><p className="mt-1 text-sm text-[var(--muted)]">{caption}</p></div></div>
      {action}
    </div>
    {children}
  </section>;
}

function Field({ label, children, className = "" }) {
  return <label className={`block ${className}`}><span className="mb-1.5 block text-sm font-semibold text-slate-700">{label}</span>{children}</label>;
}

const inputClass = "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100";

export default function Treatment({ nationalId, initialName, initialComplaint, onBack }) {
  const [tab, setTab] = useState("visit");
  const [patient, setPatient] = useState({ name: initialName || "Patient", nationalID: nationalId });
  const [history, setHistory] = useState([]);
  const [reports, setReports] = useState([]);
  const [tests, setTests] = useState([]);
  const [testRequests, setTestRequests] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [loadingReports, setLoadingReports] = useState(true);
  const [loadingTests, setLoadingTests] = useState(true);
  const [historyError, setHistoryError] = useState("");
  const [reportsError, setReportsError] = useState("");
  const [testsError, setTestsError] = useState("");
  const [complaint, setComplaint] = useState(initialComplaint || "");
  const [diagnosis, setDiagnosis] = useState("");
  const [notes, setNotes] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [prescriptions, setPrescriptions] = useState([{ name: "", strength: "", dosage: "", frequency: "", durationDays: "", instructions: "" }]);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);
  const [openingFile, setOpeningFile] = useState("");
  const [testName, setTestName] = useState("");
  const [requestSaving, setRequestSaving] = useState(false);

  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    setHistoryError("");
    try {
      const data = await getPatientRecords(nationalId);
      setPatient(data.patient || { name: initialName || "Patient", nationalID: nationalId });
      setHistory(data.records || []);
    } catch (error) { setHistoryError(getApiMessage(error, "Medical history is unavailable right now.")); }
    finally { setLoadingHistory(false); }
  }, [nationalId, initialName]);

  const loadReports = useCallback(async () => {
    setLoadingReports(true);
    setReportsError("");
    try { setReports((await getPatientReports(nationalId)).reports || []); }
    catch (error) { setReportsError(getApiMessage(error, "Reports are unavailable right now.")); }
    finally { setLoadingReports(false); }
  }, [nationalId]);

  const loadTests = useCallback(async () => {
    setLoadingTests(true);
    setTestsError("");
    try {
      const data = await getPatientTests(nationalId);
      setTests(data.tests || []);
      setTestRequests(data.requests || []);
    } catch (error) { setTestsError(getApiMessage(error, "Test information is unavailable right now.")); }
    finally { setLoadingTests(false); }
  }, [nationalId]);

  useEffect(() => { void loadHistory(); void loadReports(); void loadTests(); }, [loadHistory, loadReports, loadTests]);

  function updatePrescription(index, field, value) {
    setPrescriptions((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item));
  }

  async function submit(event) {
    event.preventDefault();
    setNotice(null);
    setSaving(true);
    try {
      const payload = {
        patientName: initialName,
        chiefComplaint: complaint,
        diagnosis,
        notes,
        followUpDate,
        prescriptions: prescriptions.filter((item) => item.name.trim()).map((item) => ({ ...item, durationDays: item.durationDays ? Number(item.durationDays) : null })),
      };
      const result = await createMedicalRecord(nationalId, payload);
      setNotice({ type: "success", text: result.message || "Visit saved and prescription PDF filed securely." });
      setDiagnosis(""); setNotes(""); setFollowUpDate("");
      setPrescriptions([{ name: "", strength: "", dosage: "", frequency: "", durationDays: "", instructions: "" }]);
      void loadHistory();
    } catch (error) {
      setNotice({ type: "error", text: getApiMessage(error, "Could not save this visit. Your form details are still here.") });
    } finally { setSaving(false); }
  }

  async function viewFile(kind, id, opener) {
    setOpeningFile(`${kind}-${id}`);
    try { await opener(nationalId, id); }
    catch (error) { setNotice({ type: "error", text: getApiMessage(error, "This document could not be opened.") }); }
    finally { setOpeningFile(""); }
  }

  async function submitLabRequest(event) {
    event.preventDefault(); setNotice(null); setRequestSaving(true);
    try {
      const result = await createLabTestRequest(nationalId, testName);
      setTestName(""); setNotice({ type: "success", text: result.message || "Test request sent to the laboratory." });
      void loadTests();
    } catch (error) {
      setNotice({ type: "error", text: getApiMessage(error, "The test request couldn’t be sent. Your details are still here; try again.") });
    } finally { setRequestSaving(false); }
  }

  return <div className="relative z-10 mx-auto max-w-6xl px-4 py-6 fade-up sm:px-6 sm:py-8">
    <button type="button" onClick={onBack} className="mb-5 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white/80 px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-white"><Icon name="arrow-left" size={17} />Back to appointments</button>
    <header className="relative isolate overflow-hidden rounded-[28px] bg-gradient-to-br from-[#173967] via-[#1f4fd8] to-[#527fe8] p-6 text-white shadow-xl sm:p-8">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-100">🩺 Doctor workspace</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Patient visit</h1>
      <p className="mt-2 text-blue-50">Create today’s record independently. Existing history and reports are available in their own tabs.</p>
    </header>

    <section className="glass mt-5 flex flex-wrap items-center justify-between gap-4 p-5">
      <div className="flex items-center gap-4"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-2xl">👤</span><div><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Patient</p><h2 className="mt-1 text-lg font-bold text-slate-800">{patient.name || initialName || "Patient"}</h2></div></div>
      <div className="rounded-xl bg-white/80 px-4 py-3"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">National ID</p><p className="mt-1 break-all font-semibold text-slate-800">{patient.nationalID || nationalId}</p></div>
    </section>

    <nav className="mt-5 grid grid-cols-2 gap-2 rounded-2xl border border-blue-100 bg-white/70 p-2 sm:grid-cols-5" aria-label="Patient visit sections">
      {tabs.map((item) => <button key={item.id} type="button" onClick={() => setTab(item.id)} className={`rounded-xl px-3 py-3 text-sm font-bold transition ${tab === item.id ? "bg-blue-700 text-white shadow-md" : "text-slate-600 hover:bg-blue-50"}`} aria-current={tab === item.id ? "page" : undefined}><span className="mr-2">{item.emoji}</span>{item.label}</button>)}
    </nav>

    {notice && <div className="mt-4"><Feedback type={notice.type} message={notice.text} onDismiss={() => setNotice(null)} /></div>}

    <main className="mt-5 space-y-5">
      {tab === "visit" && <form onSubmit={submit} className="space-y-5">
        <SectionCard title="Visit details" caption="Document the current consultation. This form is available even if the patient has no previous records." emoji="📝">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Chief complaint"><textarea className={`${inputClass} min-h-28 resize-y`} value={complaint} onChange={(event) => setComplaint(event.target.value)} placeholder="What brought the patient in today?" maxLength={4000} /></Field>
            <Field label="Diagnosis"><textarea className={`${inputClass} min-h-28 resize-y`} value={diagnosis} onChange={(event) => setDiagnosis(event.target.value)} placeholder="Clinical diagnosis or impression" maxLength={4000} /></Field>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-[1fr_230px]">
            <Field label="Clinical notes"><textarea className={`${inputClass} min-h-32 resize-y`} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Examination, assessment, and care plan" maxLength={12000} /></Field>
            <Field label="Follow-up date (optional)"><input className={inputClass} type="date" value={followUpDate} onChange={(event) => setFollowUpDate(event.target.value)} /></Field>
          </div>
        </SectionCard>

        <SectionCard title="Prescription" caption="Add medicines and directions. The backend creates a formatted PDF and files it to the patient’s record." emoji="💊" action={<button type="button" onClick={() => setPrescriptions((items) => [...items, { name: "", strength: "", dosage: "", frequency: "", durationDays: "", instructions: "" }])} className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-bold text-blue-800 hover:bg-blue-100">＋ Add medicine</button>}>
          <div className="space-y-4">
            {prescriptions.map((item, index) => <div key={index} className="rounded-2xl border border-slate-200 bg-white/70 p-4">
              <div className="mb-3 flex items-center justify-between"><h3 className="font-bold text-slate-700">Medicine {index + 1}</h3>{prescriptions.length > 1 && <button type="button" onClick={() => setPrescriptions((items) => items.filter((_, i) => i !== index))} className="rounded-lg px-2 py-1 text-sm font-semibold text-rose-700 hover:bg-rose-50">Remove</button>}</div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="Medicine name"><input className={inputClass} value={item.name} onChange={(event) => updatePrescription(index, "name", event.target.value)} placeholder="e.g. Paracetamol" maxLength={180} /></Field>
                <Field label="Strength"><input className={inputClass} value={item.strength} onChange={(event) => updatePrescription(index, "strength", event.target.value)} placeholder="e.g. 500 mg" maxLength={100} /></Field>
                <Field label="Dosage"><input className={inputClass} value={item.dosage} onChange={(event) => updatePrescription(index, "dosage", event.target.value)} placeholder="e.g. 1 tablet" maxLength={180} /></Field>
                <Field label="Frequency"><input className={inputClass} value={item.frequency} onChange={(event) => updatePrescription(index, "frequency", event.target.value)} placeholder="e.g. Twice daily" maxLength={180} /></Field>
                <Field label="Duration (days)"><input className={inputClass} type="number" min="1" max="3650" value={item.durationDays} onChange={(event) => updatePrescription(index, "durationDays", event.target.value)} placeholder="e.g. 5" /></Field>
                <Field label="Additional directions"><input className={inputClass} value={item.instructions} onChange={(event) => updatePrescription(index, "instructions", event.target.value)} placeholder="e.g. Take after meals" maxLength={500} /></Field>
              </div>
            </div>)}
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
            <p className="max-w-xl text-xs leading-5 text-slate-500">📄 A patient-specific PDF is generated and uploaded securely when you save this visit.</p>
            <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-bold text-white shadow-md transition hover:bg-blue-800 disabled:cursor-wait disabled:opacity-60">{saving ? "Saving visit…" : "💾 Save medical record"}</button>
          </div>
        </SectionCard>
      </form>}

      {tab === "history" && <SectionCard title="Medical history" caption="Previous visits, diagnoses, clinical notes, and prescriptions." emoji="📚" action={<button type="button" onClick={loadHistory} className="rounded-lg px-3 py-2 text-sm font-bold text-blue-700 hover:bg-blue-50">↻ Refresh</button>}>
        {loadingHistory ? <div className="py-12 text-center text-sm text-slate-500">Loading medical history…</div> : historyError ? <div className="space-y-2"><Feedback message={`${historyError} You can still save today’s visit.`} onRetry={loadHistory} compact /></div> : history.length === 0 ? <EmptyState emoji="🌱" title="No past medical records yet" detail="This patient has no saved visit history. That’s okay—you can create the first medical record from the New visit tab." /> : <div className="space-y-4">
          {history.map((record) => <article key={record.recordID} className="rounded-2xl border border-slate-200 bg-white/80 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wide text-blue-700">Visit #{record.recordID}</p><h3 className="mt-1 text-base font-bold text-slate-800">{record.recordType || "Consultation"}</h3></div><span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-800">{record.recordDATE ? new Date(record.recordDATE).toLocaleDateString() : "Date unavailable"}</span></div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">{record.chiefComplaint && <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs font-bold uppercase text-slate-500">Chief complaint</p><p className="mt-1 whitespace-pre-wrap text-sm text-slate-800">{record.chiefComplaint}</p></div>}{record.diagnoses?.map((item, i) => <div key={i} className="rounded-xl bg-indigo-50/70 p-3"><p className="text-xs font-bold uppercase text-indigo-700">Diagnosis</p><p className="mt-1 text-sm font-semibold text-slate-800">{item.diagnosis}</p>{item.notes && <p className="mt-1 text-xs text-slate-600">{item.notes}</p>}</div>)}</div>
            {record.notes?.length > 0 && <div className="mt-3 rounded-xl bg-amber-50/70 p-3"><p className="text-xs font-bold uppercase text-amber-800">Clinical notes</p>{record.notes.map((note, i) => <p key={i} className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">{note}</p>)}</div>}
            {record.prescriptions?.length > 0 && <div className="mt-3 rounded-xl bg-emerald-50/70 p-3"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-bold uppercase text-emerald-800">💊 Prescribed medicines</p>{record.prescriptionObjectKey && <button type="button" disabled={openingFile === `rx-${record.recordID}`} onClick={() => viewFile("rx", record.recordID, openPrescriptionPdf)} className="text-xs font-bold text-emerald-800 underline">{openingFile === `rx-${record.recordID}` ? "Opening…" : "View prescription PDF"}</button>}</div><div className="mt-2 grid gap-2 sm:grid-cols-2">{record.prescriptions.map((medicine, i) => <div key={i} className="rounded-lg bg-white/80 p-3"><p className="font-bold text-slate-800">{medicine.name} {medicine.strength}</p><p className="mt-1 text-xs leading-5 text-slate-600">{[medicine.dosage, medicine.frequency, medicine.durationDays ? `${medicine.durationDays} days` : ""].filter(Boolean).join(" · ")}</p></div>)}</div></div>}
            {record.followUpDate && <p className="mt-3 text-xs font-semibold text-slate-500">📅 Follow-up: {new Date(record.followUpDate).toLocaleDateString()}</p>}
          </article>)}
        </div>}
      </SectionCard>}

      {tab === "reports" && <SectionCard title="Patient reports" caption="Laboratory reports shared with this patient. Open a report to review the original file." emoji="🧾" action={<button type="button" onClick={loadReports} className="rounded-lg px-3 py-2 text-sm font-bold text-blue-700 hover:bg-blue-50">↻ Refresh</button>}>
        {loadingReports ? <div className="py-12 text-center text-sm text-slate-500">Loading reports…</div> : reportsError ? <Feedback message={reportsError} onRetry={loadReports} compact /> : reports.length === 0 ? <EmptyState emoji="🧾" title="No reports found" detail="There are no past laboratory reports available for this patient yet. Reports will appear here when they are shared." /> : <div className="grid gap-3 md:grid-cols-2">
          {reports.map((report) => <article key={report.id} className="rounded-2xl border border-slate-200 bg-white/80 p-4"><div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-start gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-blue-50 text-xl">📄</span><div className="min-w-0"><h3 className="break-words font-bold text-slate-800">{report.fileName}</h3><p className="mt-1 text-xs text-slate-500">{report.request?.testName || "Laboratory report"} · {report.createdAt ? new Date(report.createdAt).toLocaleDateString() : "Date unavailable"}</p></div></div><button type="button" disabled={openingFile === `report-${report.id}`} onClick={() => viewFile("report", report.id, openPatientReport)} className="shrink-0 rounded-lg bg-blue-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-60">{openingFile === `report-${report.id}` ? "Opening…" : "View"}</button></div>{report.note && <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">{report.note}</p>}</article>)}
        </div>}
      </SectionCard>}

      {tab === "tests" && <div className="space-y-5">
        <SectionCard title="Completed test results" caption="Results attached to the patient’s medical records." emoji="🔬" action={<button type="button" onClick={loadTests} className="rounded-lg px-3 py-2 text-sm font-bold text-blue-700 hover:bg-blue-50">↻ Refresh</button>}>
          {loadingTests ? <div className="py-10 text-center text-sm text-slate-500">Loading test results…</div> : testsError ? <Feedback message={testsError} onRetry={loadTests} compact /> : tests.length === 0 ? <EmptyState emoji="🧪" title="No test results found" detail="Completed diagnostic results will appear here when the patient has tests on file." /> : <div className="overflow-x-auto"><table className="w-full min-w-[580px] text-left text-sm"><thead><tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500"><th className="px-3 py-3">Test</th><th className="px-3 py-3">Performed</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Result</th></tr></thead><tbody>{tests.map((item) => <tr key={item.id} className="border-b border-slate-100"><td className="px-3 py-3 font-semibold text-slate-800">{item.name}</td><td className="px-3 py-3 text-slate-600">{item.performedAt ? new Date(item.performedAt).toLocaleString() : "—"}</td><td className="px-3 py-3"><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800">{item.status}</span></td><td className="max-w-sm whitespace-pre-wrap px-3 py-3 text-slate-600">{item.result || "No result notes"}</td></tr>)}</tbody></table></div>}
        </SectionCard>
        <SectionCard title="Requested tests" caption="Track lab tests requested for this patient." emoji="🧬">
          {loadingTests ? <div className="py-8 text-center text-sm text-slate-500">Loading test requests…</div> : testsError ? <Feedback message={testsError} onRetry={loadTests} compact /> : testRequests.length === 0 ? <EmptyState emoji="📋" title="No test requests found" detail="There are no laboratory test requests on file for this patient." /> : <div className="grid gap-3 sm:grid-cols-2">{testRequests.map((item) => <article key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white/70 p-4"><div><h3 className="font-bold text-slate-800">{item.testName}</h3><p className="mt-1 text-xs text-slate-500">Requested {new Date(item.createdAt).toLocaleDateString()}</p></div><span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800">{item.status}</span></article>)}</div>}
        </SectionCard>
      </div>}

      {tab === "lab" && <div className="space-y-5">
        <SectionCard title="Request a laboratory test" caption="Send a patient specific test order to the laboratory team." emoji="🧫">
          <form onSubmit={submitLabRequest} className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
            <Field label="Test or procedure"><input className={inputClass} value={testName} onChange={(event) => setTestName(event.target.value)} placeholder="e.g. Complete blood count, chest X-ray" maxLength={150} required /></Field>
            <button type="submit" disabled={requestSaving || !testName.trim()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-bold text-white disabled:opacity-60">{requestSaving ? <><i className="spinner" />Sending request</> : <><Icon name="flask" size={16} />Send to laboratory</>}</button>
          </form>
          <p className="mt-3 text-xs leading-5 text-slate-500">The lab team will see the patient ID and requested test in its secure worklist. You can track the status below.</p>
        </SectionCard>
        <SectionCard title="Lab request status" caption="Requests placed for this patient, including completed reports." emoji="📋" action={<button type="button" onClick={loadTests} className="rounded-lg px-3 py-2 text-sm font-bold text-blue-700 hover:bg-blue-50">↻ Refresh</button>}>
          {loadingTests ? <div className="py-8 text-center text-sm text-slate-500">Loading lab requests…</div> : testsError ? <Feedback message={testsError} onRetry={loadTests} compact /> : !testRequests.length ? <EmptyState emoji="🧪" title="No lab requests yet" detail="When you request a test, its progress will be shown here." /> : <div className="space-y-3">{testRequests.map((item) => <article key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white/80 p-4"><div><h3 className="font-bold text-slate-800">{item.testName}</h3><p className="mt-1 text-xs text-slate-500">Requested {new Date(item.createdAt).toLocaleString()}</p></div><span className={`rounded-full px-3 py-1 text-xs font-bold ${item.status === "COMPLETED" ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"}`}>{item.status.replace("_", " ")}</span></article>)}</div>}
        </SectionCard>
      </div>}
    </main>
  </div>;
}
