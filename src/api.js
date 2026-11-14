import axios from "axios";
import { clearSession, getSession } from "./session.js";

const api = axios.create({ baseURL: "https://central-health-database-system.onrender.com/api", timeout: 15000 });

api.interceptors.request.use((config) => {
  const token = getSession()?.token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use((response) => response, (error) => {
  if (error.response?.status === 401 && getSession()) {
    clearSession();
    window.dispatchEvent(new Event("session:expired"));
  }
  return Promise.reject(error);
});

export async function loginDoctor(doctorId, password) {
  return (await api.post("/auth/login", { doctorId: Number(doctorId), password })).data;
}

export async function loginLabStaff(username, password) {
  return (await api.post("/lab/auth/login", { username, password })).data;
}

export async function getLabWorklist() {
  return (await api.get("/lab/requests")).data;
}

export async function submitLabReport(requestId, report) {
  return (await api.post(`/lab/requests/${requestId}/report`, report, { timeout: 60000 })).data;
}

export async function getTodayAppointments() {
  const payload = (await api.get("/doctor/appointments/today")).data;
  if (!Array.isArray(payload)) throw new Error("The appointments API returned an invalid response.");
  return payload.flatMap((appointment, index) => {
    const date = appointment?.appointmentDate;
    const time = appointment?.appointmentTime;
    if (typeof date !== "string" || typeof time !== "string") return [];
    const timePart = time.match(/^(\d{2}:\d{2}(?::\d{2})?)/)?.[1];
    const at = timePart ? new Date(`${date.slice(0, 10)}T${timePart}+05:00`) : new Date(time);
    if (Number.isNaN(at.getTime())) return [];
    const patient = appointment.patient || appointment.Patient || {};
    const pick = (source, aliases) => {
      const names = new Set(aliases.map((key) => key.toLowerCase().replace(/[^a-z0-9]/g, "")));
      const found = Object.entries(source || {}).find(([key, value]) =>
        names.has(key.toLowerCase().replace(/[^a-z0-9]/g, "")) && ["string", "number"].includes(typeof value)
      );
      return found ? String(found[1]).trim() : "";
    };
    const nationalId = pick(patient, ["nationalId", "nationalID", "national_id", "cnic", "cnicNumber", "patientCnic", "patientNationalId"]) ||
      pick(appointment, ["nationalId", "nationalID", "national_id", "cnic", "cnicNumber", "patientCnic", "patientNationalId"]);
    const phone = pick(patient, ["phone", "phoneNumber", "patientPhone", "contact", "contactNo", "contactNumber", "mobile", "mobileNo", "mobileNumber"]) ||
      pick(appointment, ["phone", "phoneNumber", "patientPhone", "contact", "contactNo", "contactNumber", "mobile", "mobileNo", "mobileNumber"]);
    return [{
      id: `appointment-${date}-${timePart || index}-${index}`,
      appointmentAt: at.toISOString(),
      patientName: patient.name || patient.fullName || patient.full_name ||
        [patient.firstName || patient.first_name, patient.lastName || patient.last_name].filter(Boolean).join(" ") ||
        appointment.patientName || appointment.patient_name || "",
      patientCnic: nationalId,
      patientPhone: phone,
      complaint: appointment.complaint || "",
      status: "BOOKED",
    }];
  });
}

const patientPath = (nationalId) => `/doctor/patients/${encodeURIComponent(nationalId)}`;

export async function createMedicalRecord(nationalId, record) {
  return (await api.post(`${patientPath(nationalId)}/records`, record)).data;
}

export async function createLabTestRequest(nationalId, testName) {
  return (await api.post(`${patientPath(nationalId)}/lab-requests`, { testName })).data;
}

export async function getPatientRecords(nationalId) {
  return (await api.get(`${patientPath(nationalId)}/records`)).data;
}

export async function getPatientReports(nationalId) {
  return (await api.get(`${patientPath(nationalId)}/reports`)).data;
}

export async function getPatientTests(nationalId) {
  return (await api.get(`${patientPath(nationalId)}/tests`)).data;
}

async function previewAuthenticatedPdf(url) {
  const preview = window.open("about:blank", "_blank");
  if (preview) preview.opener = null;
  try {
    const response = await api.get(url, { responseType: "blob" });
    const fileUrl = URL.createObjectURL(response.data);
    if (preview) preview.location.href = fileUrl;
    else {
      const link = document.createElement("a");
      link.href = fileUrl;
      link.download = "patient-document.pdf";
      link.click();
    }
    window.setTimeout(() => URL.revokeObjectURL(fileUrl), 60_000);
  } catch (error) {
    preview?.close();
    throw error;
  }
}

export function openPatientReport(nationalId, reportId) {
  return previewAuthenticatedPdf(`${patientPath(nationalId)}/reports/${reportId}`);
}

export function openPrescriptionPdf(nationalId, recordId) {
  return previewAuthenticatedPdf(`${patientPath(nationalId)}/records/${recordId}/prescription`);
}

export function getApiMessage(error, fallback) {
  const status = error?.response?.status;
  const safeServerMessages = new Set([
    "Enter a valid doctor ID and password.",
    "Choose a PDF report and try again.",
    "Choose a PDF report before submitting.",
    "Choose a PDF smaller than 12 MB.",
    "This file couldn’t be read. Choose it again and retry.",
    "This file doesn’t look like a PDF. Choose a valid PDF report.",
    "Add a test name before sending this request.",
  ]);
  const serverMessage = error?.response?.data?.message;
  if (typeof serverMessage === "string" && safeServerMessages.has(serverMessage)) return serverMessage;
  if (status === 401) return "Your session needs to be refreshed. Please sign in again.";
  if (status === 404) return "The requested patient information could not be found.";
  if (status === 503 && /lab|report/i.test(String(error?.response?.data?.message || ""))) {
    return "Lab report storage is temporarily unavailable. Your selected file is still here; please try again shortly.";
  }
  if (status === 503 && /storage|r2|prescription/i.test(String(error?.response?.data?.message || ""))) {
    return "Prescription storage is temporarily unavailable. Your visit details are still here; please try again shortly.";
  }
  if (status === 400) return "Some information needs attention. Review the form and try again.";
  if (status >= 500) return fallback || "Something went wrong while saving your request. Please try again.";
  if (!error?.response) return "We couldn’t reach the service. Check your connection and try again.";
  return fallback || "That didn’t work. Please try again.";
}
