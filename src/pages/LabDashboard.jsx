import { useCallback, useEffect, useState } from "react";
import Icon from "../components/Icon.jsx";
import Feedback from "../components/Feedback.jsx";
import { getApiMessage, getLabWorklist, submitLabReport } from "../api.js";

const inputClass = "mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100";
const newParameter = () => ({ key: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`, parameter: "", result: "", unit: "", referenceRange: "", flag: "Not assessed", remarks: "" });
const initialReport = (id) => ({ parameters: [{ key: `initial-${id}`, parameter: "", result: "", unit: "", referenceRange: "", flag: "Not assessed", remarks: "" }], sampleQuality: "Good" });
const reportId = (item) => `LAB-${new Date(item.createdAt).getFullYear()}-${String(item.id).padStart(6, "0")}`;

function InformationCard({ title, children }) {
  return <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><h3 className="mb-3 text-sm font-bold text-slate-900">{title}</h3>{children}</section>;
}

function Info({ label, value }) {
  return <div className="min-w-0 rounded-lg border border-slate-200 bg-slate-50/70 p-3"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 break-words text-sm font-semibold text-slate-800">{value}</p></div>;
}

export default function LabDashboard({ session, onLogout }) {
  const [worklist, setWorklist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [errorRetry, setErrorRetry] = useState(null);
  const [reports, setReports] = useState({});
  const [previewId, setPreviewId] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { setWorklist(await getLabWorklist()); }
    catch (failure) { setError(getApiMessage(failure, "The lab worklist is unavailable right now.")); setErrorRetry(() => load); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  function updateReport(id, update) {
    setReports((current) => ({ ...current, [id]: { ...initialReport(id), ...current[id], ...update } }));
  }

  function updateParameter(id, key, field, value) {
    const current = reports[id] || initialReport(id);
    updateReport(id, { parameters: current.parameters.map((row) => row.key === key ? { ...row, [field]: value } : row) });
  }

  async function fileReport(event, item) {
    event.preventDefault(); setNotice("");
    const report = reports[item.id] || initialReport(item.id);
    const parameters = report.parameters.filter((row) => row.parameter.trim() && row.result.trim());
    if (!parameters.length) { setError("Add a parameter and result before submitting the report."); setErrorRetry(null); return; }
    setBusyId(item.id); setError(""); setErrorRetry(null);
    try {
      await submitLabReport(item.id, {
        parameters,
        testMethod: report.testMethod || "",
        sampleQuality: report.sampleQuality || "Good",
        technicalObservations: report.technicalObservations || "",
        additionalRemarks: report.additionalRemarks || "",
      });
      setWorklist((current) => current.filter((row) => row.id !== item.id));
      setReports((current) => { const next = { ...current }; delete next[item.id]; return next; });
      setPreviewId(null);
      setNotice(`PDF report filed for ${item.testName} and attached to ${item.patientName}'s record.`);
    } catch (failure) {
      setError(getApiMessage(failure, "The report couldn't be filed. Your entered results are still here; try again."));
      setErrorRetry(() => () => fileReport({ preventDefault() {} }, item));
    } finally { setBusyId(null); }
  }

  return <div className="relative z-10 mx-auto max-w-7xl px-4 py-6 fade-up sm:px-6 sm:py-8">
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5">
      <div><p className="text-xs font-semibold text-slate-500">Laboratory / Create report</p><h1 className="mt-1 text-2xl font-bold text-blue-700 sm:text-3xl">Create Laboratory Report</h1><p className="mt-1 text-sm text-slate-500">Prepare findings for an assigned laboratory request.</p></div>
      <div className="flex items-center gap-3"><div className="text-right"><p className="text-sm font-semibold text-slate-800">{session.name}</p><p className="text-xs text-slate-500">{session.department} · {session.roleTitle}</p></div><button onClick={onLogout} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Log out</button></div>
    </header>
    <section className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-100 bg-blue-50/70 px-4 py-3"><div><h2 className="font-semibold text-slate-800">Assigned test requests</h2><p className="text-sm text-slate-500">Enter results below; the system creates and securely files the PDF.</p></div><button type="button" onClick={load} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-blue-700 disabled:opacity-60"><Icon name="activity" size={15} />Refresh</button></section>
    <main className="mt-5 space-y-5">
      {error && <Feedback message={error} onRetry={errorRetry || undefined} />}
      {notice && <Feedback type="success" message={notice} onDismiss={() => setNotice("")} />}
      {loading ? <div className="glass p-10 text-center text-[var(--muted)]" role="status"><i className="spinner dark" /><span className="ml-2">Loading lab requests...</span></div> : !worklist.length ? <div className="glass flex flex-col items-center px-6 py-14 text-center"><span className="grid h-14 w-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-700"><Icon name="check" size={25} /></span><h2 className="mt-4 text-lg font-bold">You're all caught up</h2><p className="mt-1 text-sm text-[var(--muted)]">New doctor requests will appear here automatically.</p></div> : worklist.map((item) => {
        const report = reports[item.id] || initialReport(item.id);
        const parameterRows = report.parameters?.length ? report.parameters : initialReport(item.id).parameters;
        const isPreviewOpen = previewId === item.id;
        return <article key={item.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4"><div><p className="text-xs font-bold uppercase tracking-wide text-emerald-700">Create report · #{item.id}</p><h2 className="mt-1 text-lg font-bold text-slate-900">{item.testName}</h2></div><div className="flex items-center gap-3"><span className="rounded-md bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800">Draft</span><span className="rounded-lg border border-blue-100 px-3 py-2 text-xs font-semibold text-blue-700">Report ID: {reportId(item)}</span></div></div>
          <form onSubmit={(event) => fileReport(event, item)} className="space-y-4 p-4 sm:p-5">
            <div className="grid gap-3 xl:grid-cols-2">
              <InformationCard title="Patient Information"><div className="grid gap-2 sm:grid-cols-2"><Info label="Patient name" value={item.patientName} /><Info label="Patient record" value="Linked securely" /></div></InformationCard>
              <InformationCard title="Test Request Information"><div className="grid gap-2 sm:grid-cols-3"><Info label="Request ID" value={`TR-${String(item.id).padStart(6, "0")}`} /><Info label="Request date" value={new Date(item.createdAt).toLocaleString()} /><Info label="Requested by" value={item.requestedBy || "Doctor"} /></div></InformationCard>
            </div>
            <InformationCard title="Test Information"><div className="grid gap-3 md:grid-cols-2"><label className="block text-xs font-semibold text-slate-600">Test name<input readOnly value={item.testName} className={`${inputClass} bg-slate-50`} /></label><label className="block text-xs font-semibold text-slate-600">Test method<input value={report.testMethod || ""} onChange={(event) => updateReport(item.id, { testMethod: event.target.value })} maxLength={250} placeholder="Enter the method used" className={inputClass} /></label></div></InformationCard>
            <InformationCard title="Test Results">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><p className="text-xs text-slate-500">Enter values and reference ranges from your approved laboratory configuration.</p><button type="button" onClick={() => updateReport(item.id, { parameters: [...parameterRows, newParameter()] })} className="rounded-lg border border-blue-300 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50">＋ Add parameter</button></div>
              <div className="overflow-x-auto rounded-lg border border-slate-200"><table className="w-full min-w-[920px] border-collapse text-left text-xs"><thead className="bg-slate-50 text-slate-700"><tr>{["Parameter", "Result", "Unit", "Reference range", "Flag", "Remarks", ""].map((label) => <th key={label} className="border-b border-slate-200 px-2.5 py-2.5 font-semibold">{label}</th>)}</tr></thead><tbody>{parameterRows.map((row) => <tr key={row.key} className="border-b border-slate-100 last:border-b-0">{[["parameter", "Parameter name"], ["result", "Result"], ["unit", "Unit"], ["referenceRange", "Reference range"]].map(([field, placeholder]) => <td key={field} className="px-2 py-1.5"><input value={row[field]} onChange={(event) => updateParameter(item.id, row.key, field, event.target.value)} placeholder={placeholder} maxLength={250} className="w-full min-w-24 rounded-md border border-slate-200 px-2 py-2 text-xs outline-none focus:border-blue-400" /></td>)}<td className="px-2 py-1.5"><select value={row.flag} onChange={(event) => updateParameter(item.id, row.key, "flag", event.target.value)} className="rounded-md border border-slate-200 bg-white px-2 py-2 text-xs"><option>Not assessed</option><option>Normal</option><option>Low</option><option>High</option><option>Critical</option></select></td><td className="px-2 py-1.5"><input value={row.remarks} onChange={(event) => updateParameter(item.id, row.key, "remarks", event.target.value)} placeholder="Optional" maxLength={500} className="w-full min-w-28 rounded-md border border-slate-200 px-2 py-2 text-xs outline-none focus:border-blue-400" /></td><td className="px-2 py-1.5"><button type="button" aria-label="Remove parameter" disabled={parameterRows.length === 1} onClick={() => updateReport(item.id, { parameters: parameterRows.filter((entry) => entry.key !== row.key) })} className="rounded px-2 py-1 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30">×</button></td></tr>)}</tbody></table></div>
            </InformationCard>
            <InformationCard title="Technician Observations"><div className="grid gap-3 md:grid-cols-3"><label className="block text-xs font-semibold text-slate-600">Sample quality<select value={report.sampleQuality || "Good"} onChange={(event) => updateReport(item.id, { sampleQuality: event.target.value })} className={inputClass}><option>Good</option><option>Acceptable</option><option>Compromised</option><option>Not assessed</option></select></label><label className="block text-xs font-semibold text-slate-600 md:col-span-1">Technical observations<textarea value={report.technicalObservations || ""} onChange={(event) => updateReport(item.id, { technicalObservations: event.target.value })} maxLength={4000} rows={3} placeholder="Sample handling or technical notes" className={inputClass} /></label><label className="block text-xs font-semibold text-slate-600 md:col-span-1">Additional remarks<textarea value={report.additionalRemarks || ""} onChange={(event) => updateReport(item.id, { additionalRemarks: event.target.value })} maxLength={2000} rows={3} placeholder="Optional note for the care team" className={inputClass} /></label></div></InformationCard>
            {isPreviewOpen && <InformationCard title="Report preview"><div className="mx-auto max-w-3xl rounded-lg border border-slate-200 bg-white p-6"><div className="border-b border-slate-200 pb-3 text-center"><p className="text-xs font-semibold uppercase tracking-widest text-emerald-700">NHRX Laboratory</p><h3 className="mt-1 text-xl font-bold text-slate-900">{item.testName}</h3><p className="mt-1 text-xs text-slate-500">{reportId(item)} · {new Date().toLocaleDateString()}</p></div><div className="grid gap-2 py-3 text-sm sm:grid-cols-2"><p><span className="text-slate-500">Patient:</span> {item.patientName}</p><p><span className="text-slate-500">Prepared by:</span> {session.name}</p><p><span className="text-slate-500">Method:</span> {report.testMethod || "Not specified"}</p><p><span className="text-slate-500">Sample quality:</span> {report.sampleQuality || "Good"}</p></div><div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead><tr className="border-y border-slate-200">{["Parameter", "Result", "Unit", "Reference", "Flag", "Remarks"].map((label) => <th key={label} className="px-2 py-2">{label}</th>)}</tr></thead><tbody>{parameterRows.filter((row) => row.parameter || row.result).map((row) => <tr key={row.key} className="border-b border-slate-100">{[row.parameter, row.result, row.unit, row.referenceRange, row.flag, row.remarks].map((value, index) => <td key={index} className="break-words px-2 py-2">{value || "—"}</td>)}</tr>)}</tbody></table></div>{report.technicalObservations && <p className="mt-4 whitespace-pre-wrap text-sm"><strong>Technical observations:</strong> {report.technicalObservations}</p>}{report.additionalRemarks && <p className="mt-3 whitespace-pre-wrap text-sm"><strong>Additional remarks:</strong> {report.additionalRemarks}</p>}</div></InformationCard>}
            <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-3"><button type="button" onClick={() => setPreviewId(isPreviewOpen ? null : item.id)} className="rounded-lg border border-blue-300 bg-white px-4 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-50">{isPreviewOpen ? "Close preview" : "Preview report"}</button><button type="submit" disabled={busyId === item.id} className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-blue-800 disabled:opacity-60">{busyId === item.id ? <><i className="spinner" />Generating PDF...</> : <><Icon name="upload" size={16} />Generate &amp; file report</>}</button></div>
          </form>
        </article>;
      })}
    </main>
  </div>;
}
