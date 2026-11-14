import Icon from "./Icon.jsx";

export default function Feedback({ type = "error", message, onRetry, onDismiss, compact = false }) {
  const success = type === "success";
  return <div className={`feedback-pop ${success ? "feedback-success" : "feedback-error"} ${compact ? "feedback-compact" : ""}`} role={success ? "status" : "alert"}>
    <span className="feedback-icon" aria-hidden="true"><Icon name={success ? "check" : "alert"} size={19} /></span>
    <div className="min-w-0 flex-1"><p className="font-semibold">{success ? "All set" : "Let’s try that again"}</p><p className="mt-0.5 text-sm leading-5 opacity-90">{message}</p></div>
    {onRetry && <button type="button" onClick={onRetry} className="feedback-action">Try again</button>}
    {onDismiss && <button type="button" onClick={onDismiss} className="feedback-dismiss" aria-label="Dismiss message">×</button>}
  </div>;
}
