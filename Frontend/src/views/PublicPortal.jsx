import React, { useState, useEffect } from "react";
import { api } from "../services/api";
import { Card, Badge, Spinner } from "../components/Shared";
import {
  AlertTriangle,
  Search,
  Send,
  Copy,
  CheckCircle,
  MapPin,
  FileText,
  FileAudio,
  FileImage,
  Clock,
  Shield,
  Users,
  Compass,
  Star,
  ExternalLink,
  Award
} from "lucide-react";

export default function PublicPortal() {
  const [activeSection, setActiveSection] = useState("report");
  const [text, setText] = useState("");
  const [location, setLocation] = useState("");
  const [sourceType, setSourceType] = useState("TEXT");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);

  // Tracking states
  const [trackId, setTrackId] = useState("");
  const [trackToken, setTrackToken] = useState("");
  const [tracking, setTracking] = useState(false);
  const [trackError, setTrackError] = useState("");
  const [tracked, setTracked] = useState(null);

  // Feedback states
  const [rating, setRating] = useState(5);
  const [comments, setComments] = useState("");
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  // NGO public list states
  const [ngos, setNgos] = useState([]);
  const [loadingNgos, setLoadingNgos] = useState(false);
  const [ngoSearch, setNgoSearch] = useState("");
  const [ngoCategoryFilter, setNgoCategoryFilter] = useState("ALL");

  const copy = (val) => {
    navigator.clipboard.writeText(val);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const fmt = (d) =>
    d
      ? new Date(d).toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit"
        })
      : "";

  const loadNgos = async () => {
    setLoadingNgos(true);
    try {
      const res = await api.public.getNgos();
      if (res.success) {
        setNgos(res.data || []);
      }
    } catch (err) {
      console.error("Failed to load NGOs list:", err);
    } finally {
      setLoadingNgos(false);
    }
  };

  useEffect(() => {
    loadNgos();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (text.trim().length < 5) {
      setError("Please provide at least 5 characters.");
      return;
    }
    setSubmitting(true);
    setError("");
    setResult(null);
    try {
      const res = await api.public.submitComplaint(text, location, sourceType);
      if (res.success) {
        setResult(res.data || res);
        setText("");
        setLocation("");
      } else {
        setError(res.message || "Submission failed.");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleTrack = async (e) => {
    e.preventDefault();
    if (!trackId || !trackToken) {
      setTrackError("Both fields are required.");
      return;
    }
    setTracking(true);
    setTrackError("");
    setTracked(null);
    try {
      const res = await api.public.trackComplaint(trackId, trackToken);
      if (res.success && res.data) {
        setTracked(res.data);
      } else {
        setTrackError(res.message || "Not found.");
      }
    } catch (err) {
      setTrackError(err.message);
    } finally {
      setTracking(false);
    }
  };

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    if (!rating) return;
    setSubmittingFeedback(true);
    try {
      const res = await api.public.submitFeedback(
        tracked.complaintId,
        trackToken,
        rating,
        comments
      );
      if (res.success) {
        alert("Feedback submitted successfully! NGO Impact Board updated.");
        setTracked((prev) => ({
          ...prev,
          feedback: res.data.feedback
        }));
        setComments("");
        loadNgos();
      }
    } catch (err) {
      alert("Failed to submit feedback: " + err.message);
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const categories = [
    { v: "ALL", l: "All Categories" },
    { v: "MEDICAL_SUPPORT", l: "Medical Support" },
    { v: "FOOD_RELIEF", l: "Food & Water Relief" },
    { v: "SHELTER_SUPPORT", l: "Shelter Support" },
    { v: "DISASTER_RELIEF", l: "Disaster Relief" },
    { v: "WOMEN_CHILD_SAFETY", l: "Women & Child Safety" },
    { v: "CIVIC_GRIEVANCE", l: "Civic Grievance" },
    { v: "GENERAL_SUPPORT", l: "General Support" }
  ];

  // Filter NGOs for directory
  const filteredNgos = ngos.filter((ngo) => {
    const matchesSearch =
      ngo.name?.toLowerCase().includes(ngoSearch.toLowerCase()) ||
      ngo.serviceAreas?.some((a) =>
        a.toLowerCase().includes(ngoSearch.toLowerCase())
      );
    const matchesCategory =
      ngoCategoryFilter === "ALL" ||
      ngo.supportedCategories?.includes(ngoCategoryFilter);
    return matchesSearch && matchesCategory;
  });

  // Sort NGOs by impact score for board
  const sortedNgos = [...ngos].sort((a, b) => (b.impactScore || 0) - (a.impactScore || 0));

  return (
    <div className="page-container animate-in">
      <div className="text-center mb-8">
        <h2 className="page-title text-4xl font-black mb-3">
          Emergency Triage & <span className="gradient-text">Coordinations</span>
        </h2>
        <p className="page-subtitle max-w-2xl mx-auto text-gray-400 text-sm">
          Submit critical complaints anonymously. AI classification and spam detection layers route validated emergency tickets automatically to certified NGOs.
        </p>
      </div>

      {/* Modern Tabs Switcher */}
      <div className="flex justify-center gap-3 mb-8 border-b border-gray-800/40 pb-4 max-w-md mx-auto">
        <button
          onClick={() => setActiveSection("report")}
          className={`btn btn-sm ${activeSection === "report" ? "btn-primary" : "btn-secondary"}`}
        >
          <AlertTriangle size={14} /> File Report
        </button>
        <button
          onClick={() => setActiveSection("track")}
          className={`btn btn-sm ${activeSection === "track" ? "btn-primary" : "btn-secondary"}`}
        >
          <Search size={14} /> Track Status
        </button>
        <button
          onClick={() => setActiveSection("directory")}
          className={`btn btn-sm ${activeSection === "directory" ? "btn-primary" : "btn-secondary"}`}
        >
          <Users size={14} /> NGO Network
        </button>
      </div>

      {/* Main Tab Viewports */}
      <div className="tab-viewport">
        {/* TAB 1: File Emergency Report */}
        {activeSection === "report" && (
          <div className="max-w-2xl mx-auto animate-fade-in">
            {result ? (
              <Card title="Report Recorded" subtitle="Save the details below to track your case.">
                <div className="stack stack-lg">
                  {result.status === "DUPLICATE" ? (
                    <div className="info-box info-box-danger">
                      <AlertTriangle size={18} style={{ flexShrink: 0 }} />
                      <div>
                        <strong style={{ display: "block", marginBottom: 2 }}>
                          Duplicate Report Detected
                        </strong>
                        <span className="text-sm">
                          {result.message}
                        </span>
                      </div>
                    </div>
                  ) : result.status === "REVIEW_REQUIRED" ? (
                    <div className="info-box info-box-warning">
                      <AlertTriangle size={18} style={{ flexShrink: 0 }} />
                      <div>
                        <strong style={{ display: "block", marginBottom: 2 }}>
                          Pending Verification
                        </strong>
                        <span className="text-sm">
                          {result.message}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="info-box info-box-success">
                      <CheckCircle size={18} style={{ flexShrink: 0 }} />
                      <div>
                        <strong style={{ display: "block", marginBottom: 2 }}>
                          Report dispatched to NGOs.
                        </strong>
                        <span className="text-sm">
                          {result.message || "AI triage has classified your complaint."}
                        </span>
                      </div>
                    </div>
                  )}

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                    <div className="data-box">
                      <div className="data-label">Complaint ID</div>
                      <div className="data-value text-mono" style={{ fontSize: "1.1rem" }}>
                        {result.complaintId}
                      </div>
                    </div>
                    <div className="data-box">
                      <div className="data-label">Tracking Token</div>
                      <div className="row gap-sm">
                        <code className="text-accent text-sm break-all" style={{ flex: 1 }}>
                          {result.trackingToken?.substring(0, 24)}…
                        </code>
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
                        value={
                          result.trackingUrl ||
                          `${window.location.origin}/track/${result.complaintId}?token=${result.trackingToken}`
                        }
                      />
                      <button onClick={() => copy(result.trackingUrl || "")} className="btn btn-sm btn-primary">
                        <Copy size={13} />
                      </button>
                    </div>
                  </div>

                  <button onClick={() => setResult(null)} className="btn btn-secondary btn-full">
                    File Another Report
                  </button>
                </div>
              </Card>
            ) : (
              <Card title="Anonymous Ingestion Inbox" subtitle="AI extracts triage markers like category and severity.">
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
                          { t: "AUDIO", I: FileAudio }
                        ].map(({ t, I }) => (
                          <button
                            key={t}
                            type="button"
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
        )}

        {/* TAB 2: Track Report Status */}
        {activeSection === "track" && (
          <div className="max-w-2xl mx-auto animate-fade-in flex flex-col gap-6">
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
                      type="text"
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
                className="animate-in border-cyan-500/20"
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
                            <li key={i} className="text-sm" style={{ marginBottom: 4 }}>
                              {q}
                            </li>
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
                        <span className="font-bold">
                          {tracked.requiredPeople || 1} ({tracked.assignedPeopleCount || 0} assigned)
                        </span>
                      </div>
                    </div>
                    <div className="data-box">
                      <div className="data-label">Required Skills</div>
                      <span className="font-semibold capitalize text-sm">
                        {tracked.requiredSkills?.map((s) => s.replace(/_/g, " ")).join(", ") || "General Aid"}
                      </span>
                    </div>
                  </div>

                  <div className="row gap-sm text-dim text-xs border-b border-gray-800 pb-4">
                    <Clock size={12} /> Updated {fmt(tracked.updatedAt)}
                  </div>

                  {/* Feedback Section */}
                  {tracked.status === "RESOLVED" && (
                    <div className="mt-2 border-t border-gray-800/40 pt-4">
                      <span className="text-xs font-bold text-cyan-400 uppercase tracking-widest block mb-2">
                        Citizen Resolution Feedback
                      </span>
                      {tracked.feedback && tracked.feedback.rating ? (
                        <div className="info-box info-box-success text-xs flex flex-col gap-1">
                          <div className="flex items-center gap-1 font-bold text-white">
                            <CheckCircle size={13} /> Feedback Recorded
                          </div>
                          <div className="flex gap-1 items-center mt-1">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                size={12}
                                fill={i < tracked.feedback.rating ? "var(--warning)" : "none"}
                                color="var(--warning)"
                              />
                            ))}
                          </div>
                          {tracked.feedback.comments && (
                            <p className="mt-1 text-gray-300 italic">"{tracked.feedback.comments}"</p>
                          )}
                        </div>
                      ) : (
                        <form onSubmit={handleFeedbackSubmit} className="flex flex-col gap-3">
                          <div className="form-group mb-0">
                            <label className="text-[10px] text-gray-500 uppercase font-bold">Incident Rating</label>
                            <div className="flex gap-2 mt-1">
                              {[1, 2, 3, 4, 5].map((val) => (
                                <button
                                  key={val}
                                  type="button"
                                  onClick={() => setRating(val)}
                                  className={`btn btn-sm p-2 ${rating >= val ? "text-yellow-400" : "text-gray-600"}`}
                                >
                                  <Star size={16} fill={rating >= val ? "var(--warning)" : "none"} />
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="form-group mb-0">
                            <label className="text-[10px] text-gray-500 uppercase font-bold">Comments</label>
                            <input
                              type="text"
                              required
                              value={comments}
                              onChange={(e) => setComments(e.target.value)}
                              placeholder="Help us improve. e.g. Fast response, NGO was polite."
                              className="w-full text-xs"
                            />
                          </div>

                          <button
                            type="submit"
                            disabled={submittingFeedback}
                            className="btn btn-primary w-full text-xs py-2 mt-1"
                          >
                            {submittingFeedback ? "Submitting..." : "Submit Feedback"}
                          </button>
                        </form>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            )}
          </div>
        )}

        {/* TAB 3: NGO Network & Directory */}
        {activeSection === "directory" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in">
            {/* Left Side: NGO Impact Board (5 Columns) */}
            <div className="lg:col-span-5 flex flex-col gap-6">
              <div>
                <h3 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
                  <Award size={22} className="text-cyan-400" />
                  NGO Impact Board
                </h3>
                <p className="text-gray-400 text-xs mt-1">
                  Top responders ranked by verified completed cases, citizen feedback, and speed.
                </p>
              </div>

              {loadingNgos ? (
                <Spinner size="md" />
              ) : sortedNgos.length === 0 ? (
                <Card hover={false} className="text-center py-8">
                  <p className="text-sm text-gray-500">No verified NGOs active in the network yet.</p>
                </Card>
              ) : (
                <div className="flex flex-col gap-4">
                  {sortedNgos.map((ngo, idx) => (
                    <Card
                      key={ngo._id}
                      hover={false}
                      className="relative overflow-hidden border-l-4 border-l-cyan-500/40"
                      style={{ padding: "16px 20px" }}
                    >
                      <div className="absolute right-4 top-4 text-[10px] text-gray-500 font-extrabold">
                        RANK #{idx + 1}
                      </div>
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-extrabold text-white text-base flex items-center gap-1.5">
                            {ngo.name}
                            <CheckCircle size={14} className="text-cyan-400" />
                          </h4>
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            Joined: {new Date(ngo.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right mr-12">
                          <span className="text-2xl font-black text-cyan-400 block leading-none">
                            {ngo.impactScore || 0}
                          </span>
                          <span className="text-[9px] text-gray-500 uppercase tracking-widest font-bold">
                            Impact Index
                          </span>
                        </div>
                      </div>

                      {ngo.impactBadges?.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2 mb-3">
                          {ngo.impactBadges.map((badge, i) => (
                            <span
                              key={i}
                              className="bg-yellow-500/10 text-yellow-400 text-[9px] font-bold px-2 py-0.5 rounded border border-yellow-500/10"
                            >
                              {badge}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-4 text-[11px] text-gray-400 border-t border-gray-800/40 pt-2 mt-2">
                        <div>
                          Resolved Cases: <span className="font-bold text-white">{ngo.resolvedCasesCount || 0}</span>
                        </div>
                        <div>
                          Response SLA: <span className="font-bold text-white">{ngo.responseSlaMinutes}m</span>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Right Side: Verified NGO Directory (7 Columns) */}
            <div className="lg:col-span-7 flex flex-col gap-6">
              <div className="flex justify-between items-start flex-wrap gap-4">
                <div>
                  <h3 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
                    <Users size={22} className="text-violet-400" />
                    Verified NGO Directory
                  </h3>
                  <p className="text-gray-400 text-xs mt-1">
                    Explore capabilities, supported sectors, and areas served by response organizations.
                  </p>
                </div>
              </div>

              {/* Search/Filter Bar */}
              <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="Search NGOs by name or service area..."
                    value={ngoSearch}
                    onChange={(e) => setNgoSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-xs"
                  />
                  <Search className="absolute left-3 top-3 text-gray-500" size={13} />
                </div>

                <select
                  value={ngoCategoryFilter}
                  onChange={(e) => setNgoCategoryFilter(e.target.value)}
                  className="text-xs max-w-xs"
                >
                  {categories.map((cat) => (
                    <option key={cat.v} value={cat.v}>
                      {cat.l}
                    </option>
                  ))}
                </select>
              </div>

              {loadingNgos ? (
                <Spinner size="md" />
              ) : filteredNgos.length === 0 ? (
                <Card hover={false} className="text-center py-12">
                  <Users className="text-gray-600 mx-auto mb-4" size={36} />
                  <p className="text-sm text-gray-400">No NGOs matched your search or category filters.</p>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredNgos.map((ngo) => (
                    <Card key={ngo._id} hover={false} className="border-l-4 border-l-violet-500/40">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-extrabold text-white text-base">{ngo.name}</h4>
                          <span className="text-[10px] text-gray-400 block mt-0.5">
                            {ngo.email} | {ngo.phone || "No phone"}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 text-xs text-gray-300 mt-3 pt-3 border-t border-gray-800/50">
                        <div>
                          <span className="text-gray-500 font-bold uppercase text-[9px] block mb-1">
                            Sectors Supported
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {ngo.supportedCategories?.map((c, i) => (
                              <span key={i} className="bg-violet-500/10 text-violet-400 text-[9px] px-1.5 py-0.5 rounded border border-violet-500/10">
                                {c.replace(/_/g, " ")}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="mt-1">
                          <span className="text-gray-500 font-bold uppercase text-[9px] block mb-1">
                            Service Areas Covered
                          </span>
                          <span className="text-gray-400 text-[11px] leading-relaxed block">
                            {ngo.serviceAreas?.join(", ") || "General dispatch area"}
                          </span>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
