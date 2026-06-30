import React, { useState } from "react";
import { api } from "../services/api";
import { Card, Badge, Spinner } from "../components/Shared";
import {
  AlertTriangle, Search, Send, Copy, CheckCircle,
  MapPin, FileText, FileAudio, FileImage,
  Clock, Shield, Users, Compass
} from "lucide-react";

export default function PublicPortal() {
  const [text, setText] = useState("");
  const [location, setLocation] = useState("");
  const [sourceType, setSourceType] = useState("TEXT");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);

  const [trackId, setTrackId] = useState("");
  const [trackToken, setTrackToken] = useState("");
  const [tracking, setTracking] = useState(false);
  const [trackError, setTrackError] = useState("");
  const [tracked, setTracked] = useState(null);

  const copy = (val) => {
    navigator.clipboard.writeText(val);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const fmt = (d) => d ? new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "";

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (text.trim().length < 5) { setError("Please provide at least 5 characters."); return; }
    setSubmitting(true); setError(""); setResult(null);
    try {
      const res = await api.public.submitComplaint(text, location, sourceType);
      if (res.success) { setResult(res.data || res); setText(""); setLocation(""); }
      else setError(res.message || "Submission failed.");
    } catch (err) { setError(err.message); }
    finally { setSubmitting(false); }
  };

  const handleTrack = async (e) => {
    e.preventDefault();
    if (!trackId || !trackToken) { setTrackError("Both fields are required."); return; }
    setTracking(true); setTrackError(""); setTracked(null);
    try {
      const res = await api.public.trackComplaint(trackId, trackToken);
      if (res.success && res.data) setTracked(res.data);
      else setTrackError(res.message || "Not found.");
    } catch (err) { setTrackError(err.message); }
    finally { setTracking(false); }
  };

  return (
    <div className="page-container animate-in">
      <h2 className="page-title">
        Report an <span className="gradient-text">Emergency</span>
      </h2>
      <p className="page-subtitle">
        Submit critical incidents or resource requests. AI classification routes your report to verified local response organizations.
      </p>

      <div className="split-layout split-7-5">
        {/* ── LEFT: Submit Form ── */}
        <div>
          {result ? (
            <Card title="Report Recorded" subtitle="Save the details below to track your case.">
              <div className="stack stack-lg">
                <div className="info-box info-box-success">
                  <CheckCircle size={18} style={{ flexShrink: 0 }} />
                  <div>
                    <strong style={{ display: "block", marginBottom: 2 }}>Your report is in the routing queue.</strong>
                    <span className="text-sm">{result.message || "AI triage has classified your complaint."}</span>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <div className="data-box">
                    <div className="data-label">Complaint ID</div>
                    <div className="data-value text-mono" style={{ fontSize: "1.1rem" }}>{result.complaintId}</div>
                  </div>
                  <div className="data-box">
                    <div className="data-label">Tracking Token</div>
                    <div className="row gap-sm">
                      <code className="text-accent text-sm break-all" style={{ flex: 1 }}>{result.trackingToken?.substring(0, 24)}…</code>
                      <button onClick={() => copy(result.trackingToken)} className="btn btn-sm btn-secondary">
                        {copied ? <CheckCircle size={13} /> : <Copy size={13} />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="data-box">
                  <div className="data-label">Direct Tracking Link</div>
                  <div className="row gap-sm">
                    <input
                      readOnly
                      className="form-input text-sm text-mono"
                      style={{ flex: 1 }}
                      value={result.trackingUrl || `${window.location.origin}/track/${result.complaintId}?token=${result.trackingToken}`}
                    />
                    <button onClick={() => copy(result.trackingUrl || "")} className="btn btn-sm btn-primary">
                      <Copy size={13} />
                    </button>
                  </div>
                </div>

                <button onClick={() => setResult(null)} className="btn btn-secondary btn-full">File Another Report</button>
              </div>
            </Card>
          ) : (
            <Card>
              <form onSubmit={handleSubmit} className="stack stack-md">
                {error && (
                  <div className="info-box info-box-danger">
                    <AlertTriangle size={16} style={{ flexShrink: 0 }} />
                    <span className="text-sm">{error}</span>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Description of Incident</label>
                  <textarea
                    className="form-input"
                    rows={5}
                    required
                    placeholder="Describe what happened. Include number of affected people, injuries, fire status, flooding, etc."
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                  />
                  <span className="form-hint">Min 5 / Max 5000 characters. AI will parse this description.</span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div className="form-group">
                    <label className="form-label">Location / Landmark</label>
                    <div className="relative">
                      <MapPin size={15} style={{ position: "absolute", left: 12, top: 12, color: "var(--text-dim)" }} />
                      <input
                        className="form-input"
                        style={{ paddingLeft: 36 }}
                        placeholder="e.g. Sector 4 Community Center"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Source Type</label>
                    <div className="row gap-sm">
                      {[
                        { t: "TEXT", I: FileText },
                        { t: "IMAGE", I: FileImage },
                        { t: "AUDIO", I: FileAudio },
                      ].map(({ t, I }) => (
                        <button
                          key={t} type="button"
                          onClick={() => setSourceType(t)}
                          className={`btn btn-sm ${sourceType === t ? "btn-primary" : "btn-secondary"}`}
                          style={{ flex: 1 }}
                        >
                          <I size={14} /> {t}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <button type="submit" disabled={submitting} className="btn btn-primary btn-full">
                  {submitting ? <Spinner size="sm" /> : <><Send size={16} /> Submit Emergency Report</>}
                </button>
              </form>
            </Card>
          )}
        </div>

        {/* ── RIGHT: Tracking ── */}
        <div className="stack stack-lg">
          <Card title="Track Your Report" subtitle="Enter credentials received on submission.">
            <form onSubmit={handleTrack} className="stack stack-md">
              {trackError && (
                <div className="info-box info-box-danger">
                  <AlertTriangle size={14} style={{ flexShrink: 0 }} />
                  <span className="text-sm">{trackError}</span>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Complaint ID</label>
                <div className="relative">
                  <Compass size={15} style={{ position: "absolute", left: 12, top: 12, color: "var(--text-dim)" }} />
                  <input
                    className="form-input text-mono"
                    style={{ paddingLeft: 36, textTransform: "uppercase" }}
                    placeholder="RS-XXXXXXXXXXXX"
                    required
                    value={trackId}
                    onChange={(e) => setTrackId(e.target.value.trim().toUpperCase())}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Private Tracking Token</label>
                <div className="relative">
                  <Shield size={15} style={{ position: "absolute", left: 12, top: 12, color: "var(--text-dim)" }} />
                  <input
                    type="password"
                    className="form-input text-mono"
                    style={{ paddingLeft: 36 }}
                    placeholder="Paste your 64-character token"
                    required
                    value={trackToken}
                    onChange={(e) => setTrackToken(e.target.value.trim())}
                  />
                </div>
              </div>

              <button type="submit" disabled={tracking} className="btn btn-secondary btn-full">
                {tracking ? <Spinner size="sm" /> : <><Search size={15} /> Fetch Status</>}
              </button>
            </form>
          </Card>

          {tracked && (
            <Card
              title={`Case: ${tracked.complaintId}`}
              subtitle={`Filed ${fmt(tracked.createdAt)}`}
              className="animate-in"
            >
              <div className="stack stack-md">
                <div className="row-wrap gap-sm">
                  <Badge status={tracked.status} />
                  {tracked.severity && <Badge status={tracked.severity} />}
                  {tracked.category && <Badge status={tracked.category} />}
                </div>

                {tracked.summary && (
                  <div className="data-box">
                    <div className="data-label">AI Case Summary</div>
                    <p className="text-sm italic" style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>
                      "{tracked.summary}"
                    </p>
                  </div>
                )}

                {tracked.needsClarification && tracked.clarificationQuestions?.length > 0 && (
                  <div className="info-box info-box-warning">
                    <AlertTriangle size={15} style={{ flexShrink: 0 }} />
                    <div className="stack stack-xs">
                      <strong className="text-sm">Additional details needed:</strong>
                      <ul style={{ paddingLeft: 18, margin: 0 }}>
                        {tracked.clarificationQuestions.map((q, i) => (
                          <li key={i} className="text-sm" style={{ marginBottom: 4 }}>{q}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className="data-box">
                    <div className="data-label">Personnel Needed</div>
                    <div className="row gap-sm">
                      <Users size={14} style={{ color: "var(--accent)" }} />
                      <span className="font-bold">{tracked.requiredPeople || 1} ({tracked.assignedPeopleCount || 0} assigned)</span>
                    </div>
                  </div>
                  <div className="data-box">
                    <div className="data-label">Required Skills</div>
                    <span className="font-semibold capitalize text-sm">
                      {tracked.requiredSkills?.map(s => s.replace(/_/g, " ")).join(", ") || "General Aid"}
                    </span>
                  </div>
                </div>

                <div className="row gap-sm text-dim text-xs">
                  <Clock size={12} /> Updated {fmt(tracked.updatedAt)}
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
