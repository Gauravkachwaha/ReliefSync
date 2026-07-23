import React, { useState } from "react";
import {
  AlertTriangle,
  MapPin,
  FileText,
  FileImage,
  FileAudio,
  Send,
  Copy,
  CheckCircle,
} from "lucide-react";
import { Card, SegmentedControl, FieldGroup, Textarea, Input, Button } from "../../components/ui";
import { useSubmitComplaint } from "../../hooks/api/usePublic";
import { useToast } from "../../context/ToastContext";

const SOURCE_TYPES = [
  { value: "TEXT", label: "Text", icon: FileText },
  { value: "IMAGE", label: "Image", icon: FileImage },
  { value: "AUDIO", label: "Audio", icon: FileAudio },
];

export default function ReportComplaint() {
  const [text, setText] = useState("");
  const [location, setLocation] = useState("");
  const [sourceType, setSourceType] = useState("TEXT");
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const submit = useSubmitComplaint();
  const toast = useToast();

  const copy = (val) => {
    navigator.clipboard.writeText(val);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (text.trim().length < 5) {
      toast.warning("Description too short", "Please provide at least 5 characters.");
      return;
    }
    try {
      const res = await submit.mutateAsync({ text, locationHint: location, sourceType });
      if (res.success) {
        setResult(res.data || res);
        setText("");
        setLocation("");
      } else {
        toast.error("Submission failed", res.message);
      }
    } catch (err) {
      toast.error("Submission failed", err.message);
    }
  };

  return (
    <div className="flex-1 px-6 py-14 max-w-xl mx-auto w-full animate-fade-up">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-semibold mb-2">
          Anonymous <span className="gradient-text">Ingestion Inbox</span>
        </h1>
        <p className="text-text-secondary text-sm">
          AI extracts triage markers like category and severity from your description.
        </p>
      </div>

      {result ? (
        <Card title="Report Recorded" subtitle="Save the details below to track your case.">
          <div className="flex flex-col gap-5">
            {result.status === "DUPLICATE" ? (
              <Banner tone="danger" title="Duplicate Report Detected" body={result.message} />
            ) : result.status === "REVIEW_REQUIRED" ? (
              <Banner tone="warning" title="Pending Verification" body={result.message} />
            ) : (
              <Banner
                tone="success"
                title="Report dispatched to NGOs."
                body={result.message || "AI triage has classified your complaint."}
              />
            )}

            <div className="grid grid-cols-2 gap-3.5">
              <DataBox label="Complaint ID" value={result.complaintId} mono />
              <div className="rounded-xl border border-border bg-surface-input px-4 py-3">
                <div className="text-[0.65rem] font-bold uppercase text-text-dim mb-1">Tracking Token</div>
                <div className="flex items-center gap-2">
                  <code className="text-accent text-xs break-all flex-1">
                    {result.trackingToken?.substring(0, 24)}…
                  </code>
                  <button onClick={() => copy(result.trackingToken)} className="text-text-dim hover:text-text">
                    {copied ? <CheckCircle size={14} /> : <Copy size={14} />}
                  </button>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-surface-input px-4 py-3">
              <div className="text-[0.65rem] font-bold uppercase text-text-dim mb-1.5">
                Direct Tracking Link
              </div>
              <div className="flex gap-2">
                <input
                  readOnly
                  className="flex-1 bg-transparent text-xs font-mono text-text-secondary outline-none"
                  value={
                    result.trackingUrl ||
                    `${window.location.origin}/track?id=${result.complaintId}&token=${result.trackingToken}`
                  }
                />
                <Button
                  size="sm"
                  onClick={() =>
                    copy(
                      result.trackingUrl ||
                        `${window.location.origin}/track?id=${result.complaintId}&token=${result.trackingToken}`
                    )
                  }
                >
                  <Copy size={13} />
                </Button>
              </div>
            </div>

            <Button variant="secondary" full onClick={() => setResult(null)}>
              File Another Report
            </Button>
          </div>
        </Card>
      ) : (
        <Card title="Describe the Incident" subtitle="Include how many people are affected, injuries, and any hazards.">
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <FieldGroup label="Description of Incident" hint="Min 5 / Max 5000 characters.">
              <Textarea
                rows={5}
                required
                placeholder="Describe what happened. Include number of affected people, injuries, fire status, flooding, etc."
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
            </FieldGroup>

            <div className="grid sm:grid-cols-2 gap-4">
              <FieldGroup label="Location / Landmark">
                <Input
                  icon={MapPin}
                  placeholder="e.g. Sector 4 Community Center"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </FieldGroup>
              <FieldGroup label="Source Type">
                <SegmentedControl value={sourceType} onChange={setSourceType} options={SOURCE_TYPES} />
              </FieldGroup>
            </div>

            <Button type="submit" full loading={submit.isPending}>
              <Send size={16} /> Submit Emergency Report
            </Button>
          </form>
        </Card>
      )}
    </div>
  );
}

function Banner({ tone, title, body }) {
  const toneClasses = {
    success: "bg-success-bg border-success/20 text-success",
    warning: "bg-warning-bg border-warning/20 text-warning",
    danger: "bg-danger-bg border-danger/20 text-danger",
  };
  const Icon = tone === "success" ? CheckCircle : AlertTriangle;
  return (
    <div className={`rounded-xl border p-4 flex items-start gap-3 ${toneClasses[tone]}`}>
      <Icon size={17} className="shrink-0 mt-0.5" />
      <div>
        <strong className="block text-sm text-text mb-0.5">{title}</strong>
        <span className="text-xs text-text-secondary">{body}</span>
      </div>
    </div>
  );
}

function DataBox({ label, value, mono }) {
  return (
    <div className="rounded-xl border border-border bg-surface-input px-4 py-3">
      <div className="text-[0.65rem] font-bold uppercase text-text-dim mb-1">{label}</div>
      <div className={`font-bold text-lg ${mono ? "font-mono" : ""}`}>{value}</div>
    </div>
  );
}
