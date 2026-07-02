import React, { useState, useEffect } from "react";
import { api } from "../services/api";
import { Card, Badge, Spinner, Modal } from "../components/Shared";
import {
  Shield,
  CheckCircle,
  AlertTriangle,
  FileText,
  BarChart2,
  List,
  Activity,
  Check,
  X,
  Compass,
  Clock,
  RefreshCw,
  Users,
  Briefcase
} from "lucide-react";

export default function SuperAdminDashboard() {
  const [activeTab, setActiveTab] = useState("analytics");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Data states
  const [analytics, setAnalytics] = useState(null);
  const [pendingNgos, setPendingNgos] = useState([]);
  const [spamQueue, setSpamQueue] = useState([]);
  const [escalations, setEscalations] = useState([]);
  const [auditLogs, setAuditLogs] = useState({ notifications: [], agentRuns: [] });

  // Action states
  const [resolvingId, setResolvingId] = useState(null);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolvedNote, setResolvedNote] = useState("");
  const [selectedEscalation, setSelectedEscalation] = useState(null);

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const loadAnalytics = async () => {
    try {
      const res = await api.superAdmin.getAnalytics();
      if (res.success) setAnalytics(res.data);
    } catch (err) {
      console.error("Failed to load analytics", err);
    }
  };

  const loadNgos = async () => {
    try {
      const res = await api.superAdmin.getNgoVerificationQueue("PENDING");
      if (res.success) setPendingNgos(res.data || []);
    } catch (err) {
      console.error("Failed to load NGOs", err);
    }
  };

  const loadSpamQueue = async () => {
    try {
      const res = await api.superAdmin.getSpamReviewQueue();
      if (res.success) setSpamQueue(res.data || []);
    } catch (err) {
      console.error("Failed to load spam queue", err);
    }
  };

  const loadEscalations = async () => {
    try {
      const res = await api.superAdmin.getEscalations("OPEN");
      if (res.success) setEscalations(res.data || []);
    } catch (err) {
      console.error("Failed to load escalations", err);
    }
  };

  const loadAuditLogs = async () => {
    try {
      const res = await api.superAdmin.getAuditLogs();
      if (res.success) setAuditLogs(res.data || { notifications: [], agentRuns: [] });
    } catch (err) {
      console.error("Failed to load audit logs", err);
    }
  };

  const loadAllData = async () => {
    setLoading(true);
    setError("");
    try {
      if (activeTab === "analytics") await loadAnalytics();
      else if (activeTab === "ngos") await loadNgos();
      else if (activeTab === "spam") await loadSpamQueue();
      else if (activeTab === "escalations") await loadEscalations();
      else if (activeTab === "audit") await loadAuditLogs();
    } catch (err) {
      setError(err.message || "Failed to load data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, [activeTab]);

  const handleVerifyNgo = async (ngoId, decision) => {
    if (!window.confirm(`Mark this NGO as ${decision}?`)) return;
    try {
      const res = await api.superAdmin.updateNgoVerification(ngoId, decision);
      if (res.success) {
        alert(res.message || `NGO verification marked as ${decision}`);
        setPendingNgos(prev => prev.filter(ngo => ngo._id !== ngoId));
        loadAnalytics();
      }
    } catch (err) {
      alert(err.message || "Failed to update NGO verification");
    }
  };

  const handleResolveSpam = async (complaintId, decision) => {
    try {
      const res = await api.superAdmin.resolveSpamReview(complaintId, decision);
      if (res.success) {
        alert(res.message || `Complaint marked as ${decision}`);
        setSpamQueue(prev => prev.filter(c => c._id !== complaintId));
        loadAnalytics();
      }
    } catch (err) {
      alert(err.message || "Failed to resolve spam review");
    }
  };

  const handleOpenResolveModal = (esc) => {
    setSelectedEscalation(esc);
    setResolvedNote("");
    setShowResolveModal(true);
  };

  const handleResolveEscalation = async (e) => {
    e.preventDefault();
    if (!selectedEscalation) return;
    setResolvingId(selectedEscalation._id);
    try {
      const res = await api.superAdmin.resolveEscalation(selectedEscalation._id, resolvedNote);
      if (res.success) {
        alert("Escalation marked as resolved.");
        setEscalations(prev => prev.filter(esc => esc._id !== selectedEscalation._id));
        setShowResolveModal(false);
        setSelectedEscalation(null);
      }
    } catch (err) {
      alert(err.message || "Failed to resolve escalation");
    } finally {
      setResolvingId(null);
    }
  };

  return (
    <div className="dashboard-container">
      {/* Sidebar Navigation */}
      <aside className="dashboard-sidebar">
        <div className="mb-4">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-widest block mb-2">Super Control</span>
          <h2 className="text-2xl font-black text-white leading-none">Super Admin</h2>
        </div>

        <nav className="flex flex-col gap-2">
          {[
            { id: "analytics", label: "Overview & Analytics", icon: BarChart2 },
            { id: "ngos", label: "NGO Verification", icon: Shield, badge: pendingNgos.length },
            { id: "spam", label: "Spam Review Queue", icon: AlertTriangle, badge: spamQueue.length },
            { id: "escalations", label: "Active Escalations", icon: AlertTriangle, badge: escalations.length },
            { id: "audit", label: "Agentic Audit Logs", icon: Activity }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`btn justify-start w-full px-4 py-3 ${activeTab === tab.id ? "btn-primary" : "btn-secondary"}`}
              style={{ border: "none" }}
            >
              <tab.icon size={18} />
              <span className="flex-1 text-left">{tab.label}</span>
              {tab.badge > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="dashboard-content">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight capitalize">
              {activeTab === "audit" ? "Agentic Audit Logs" : `${activeTab} Panel`}
            </h2>
            <p className="text-gray-400">Manage platform compliance, emergency routing, and AI workloads.</p>
          </div>
          <button onClick={loadAllData} className="btn btn-secondary p-3" disabled={loading}>
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        {error && (
          <div className="info-box info-box-danger mb-6">
            <AlertTriangle size={16} style={{ flexShrink: 0 }} />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {loading ? (
          <Spinner size="lg" />
        ) : (
          <div className="animate-in">
            {/* ANALYTICS TAB */}
            {activeTab === "analytics" && analytics && (
              <div className="flex flex-col gap-8">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {[
                    { label: "Total Complaints", value: analytics.totalComplaints, icon: FileText, color: "var(--accent)" },
                    { label: "Active Emergency Cases", value: analytics.activeCases, icon: Compass, color: "var(--primary)" },
                    { label: "Resolved Complaints", value: analytics.resolvedCases, icon: CheckCircle, color: "var(--success)" },
                    { label: "Spam Filtered Rate", value: `${analytics.totalComplaints > 0 ? Math.round((analytics.spamCount / analytics.totalComplaints) * 100) : 0}%`, icon: AlertTriangle, color: "var(--warning)" }
                  ].map((metric, i) => (
                    <Card key={i} hover={false} className="relative overflow-hidden">
                      <div className="absolute right-4 top-4 opacity-15">
                        <metric.icon size={48} style={{ color: metric.color }} />
                      </div>
                      <span className="text-xs uppercase tracking-wider text-gray-500 font-bold block mb-1">
                        {metric.label}
                      </span>
                      <span className="text-4xl font-extrabold text-white">{metric.value}</span>
                    </Card>
                  ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card title="NGO Network Statistics" hover={false}>
                    <div className="flex flex-col gap-4 text-sm text-gray-300">
                      <div className="flex justify-between border-b border-gray-800 pb-2">
                        <span>Total NGOs Registered</span>
                        <span className="font-bold text-white">{analytics.totalNgos}</span>
                      </div>
                      <div className="flex justify-between border-b border-gray-800 pb-2">
                        <span>Verified Response NGOs</span>
                        <span className="font-bold text-white">{analytics.verifiedNgos}</span>
                      </div>
                      <div className="flex justify-between border-b border-gray-800 pb-2">
                        <span>Pending Verification</span>
                        <span className="font-bold text-white">{analytics.totalNgos - analytics.verifiedNgos}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total Field Responders (Volunteers)</span>
                        <span className="font-bold text-white">{analytics.totalVolunteers}</span>
                      </div>
                    </div>
                  </Card>

                  <Card title="Quick Ingestion Links" hover={false}>
                    <p className="text-sm text-gray-400 mb-4">
                      Triage alerts, confirm NGO compliance, and verify critical queues.
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <button onClick={() => setActiveTab("ngos")} className="btn btn-secondary text-sm">
                        NGO Roster &rarr;
                      </button>
                      <button onClick={() => setActiveTab("spam")} className="btn btn-primary text-sm">
                        Review Spam Queue &rarr;
                      </button>
                    </div>
                  </Card>
                </div>
              </div>
            )}

            {/* NGO VERIFICATION TAB */}
            {activeTab === "ngos" && (
              <div className="flex flex-col gap-6">
                {pendingNgos.length === 0 ? (
                  <Card hover={false} className="text-center py-12 border-dashed border-gray-800">
                    <Shield size={48} className="text-gray-600 mx-auto mb-4" />
                    <h3 className="text-lg font-bold mb-1">All NGOs Compliant</h3>
                    <p className="text-sm text-gray-400">There are no pending NGO verification requests.</p>
                  </Card>
                ) : (
                  <div className="flex flex-col gap-4">
                    {pendingNgos.map(ngo => (
                      <Card
                        key={ngo._id}
                        title={ngo.name}
                        subtitle={`Registered email: ${ngo.email} | Tel: ${ngo.phone || "No phone"}`}
                        hover={false}
                      >
                        <div className="flex flex-col gap-4 mt-2">
                          <div className="flex flex-wrap gap-2">
                            {ngo.supportedCategories?.map((c, i) => (
                              <Badge key={i} status={c} />
                            ))}
                          </div>

                          <div className="text-xs text-gray-400 bg-black/20 p-3 rounded-xl border border-gray-800">
                            <span className="font-semibold block text-gray-300 mb-1">Service Areas:</span>
                            {ngo.serviceAreas?.join(", ") || "General dispatch area"}
                          </div>

                          <div className="flex gap-4 text-xs text-gray-500">
                            <span>Concurrent Cases Max Cap: {ngo.capacityConfig?.maxConcurrentCases || 10}</span>
                            <span>Response SLA: {ngo.responseSlaMinutes || 60} mins</span>
                          </div>

                          <div className="flex gap-3 justify-end border-t border-gray-800 pt-3">
                            <button
                              onClick={() => handleVerifyNgo(ngo._id, "REJECTED")}
                              className="btn btn-secondary text-red-400 border-red-500/10 hover:bg-red-500/5"
                            >
                              <X size={16} /> Reject Registration
                            </button>
                            <button
                              onClick={() => handleVerifyNgo(ngo._id, "VERIFIED")}
                              className="btn btn-primary"
                            >
                              <Check size={16} /> Verify NGO
                            </button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* SPAM REVIEW QUEUE TAB */}
            {activeTab === "spam" && (
              <div className="flex flex-col gap-6">
                {spamQueue.length === 0 ? (
                  <Card hover={false} className="text-center py-12 border-dashed border-gray-800">
                    <CheckCircle size={48} className="text-gray-600 mx-auto mb-4" />
                    <h3 className="text-lg font-bold mb-1">Spam Queue Empty</h3>
                    <p className="text-sm text-gray-400">All submissions cleared spam check layer cleanly.</p>
                  </Card>
                ) : (
                  <div className="flex flex-col gap-4">
                    {spamQueue.map(c => (
                      <Card
                        key={c._id}
                        title={`Flagged Report: ${c.complaintId}`}
                        subtitle={`Submitted: ${formatDate(c.createdAt)}`}
                        hover={false}
                      >
                        <div className="flex flex-col gap-4 mt-2">
                          <div className="flex gap-2">
                            <span className="text-xs text-cyan-400 font-semibold self-center">ML Spam Score: {Math.round(c.spamScore * 100)}%</span>
                            {c.spamRuleFlags?.map((flag, idx) => (
                              <Badge key={idx} status="CRITICAL" label={flag} />
                            ))}
                          </div>

                          <div className="bg-black/30 p-4 rounded-xl border border-gray-800">
                            <p className="text-sm text-gray-300 italic leading-relaxed">
                              "{c.originalText}"
                            </p>
                          </div>

                          {c.locationHint && (
                            <div className="text-xs text-gray-400">
                              Reported location hint: <span className="text-white">{c.locationHint}</span>
                            </div>
                          )}

                          <div className="flex gap-3 justify-end border-t border-gray-800 pt-3">
                            <button
                              onClick={() => handleResolveSpam(c._id, "BLOCK")}
                              className="btn btn-secondary text-red-400 border-red-500/10 hover:bg-red-500/5"
                            >
                              <X size={16} /> Block (Spam)
                            </button>
                            <button
                              onClick={() => handleResolveSpam(c._id, "ALLOW")}
                              className="btn btn-primary"
                            >
                              <Check size={16} /> Allow (Triage & Route)
                            </button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ESCALATIONS TAB */}
            {activeTab === "escalations" && (
              <div className="flex flex-col gap-6">
                {escalations.length === 0 ? (
                  <Card hover={false} className="text-center py-12 border-dashed border-gray-800">
                    <CheckCircle size={48} className="text-gray-600 mx-auto mb-4" />
                    <h3 className="text-lg font-bold mb-1">No Active Escalations</h3>
                    <p className="text-sm text-gray-400">NGO routing network is responsive and active.</p>
                  </Card>
                ) : (
                  <div className="flex flex-col gap-4">
                    {escalations.map(esc => (
                      <Card
                        key={esc._id}
                        title={`Escalation Alert: ${esc.complaintId?.complaintId || "Case alert"}`}
                        subtitle={`Triggered: ${formatDate(esc.createdAt)}`}
                        hover={false}
                        className="border-red-500/10"
                      >
                        <div className="flex flex-col gap-4 mt-2">
                          <div className="flex gap-2">
                            <Badge status={esc.priority || "HIGH"} />
                            <Badge status="CRITICAL" label={esc.reason} />
                          </div>

                          <div className="bg-black/30 p-4 rounded-xl border border-gray-800 text-xs text-gray-300">
                            <span className="font-bold text-gray-400 block mb-1">Escalation Message:</span>
                            "{esc.message}"
                          </div>

                          <div className="bg-black/10 p-3 rounded-xl border border-gray-800 text-xs text-gray-400">
                            <span className="font-semibold block text-gray-300 mb-1">Original Incident Text:</span>
                            "{esc.complaintId?.originalText || "No original text."}"
                          </div>

                          <div className="flex justify-between items-center text-xs text-gray-500">
                            <span>Landmark: {esc.complaintId?.locationHint || "General"}</span>
                            <button
                              onClick={() => handleOpenResolveModal(esc)}
                              className="btn btn-primary py-1 px-3 text-xs"
                            >
                              Resolve Escalation
                            </button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}

                {/* Resolve Escalation Modal */}
                {selectedEscalation && (
                  <Modal isOpen={showResolveModal} onClose={() => setShowResolveModal(false)} title="Resolve Platform Escalation">
                    <form onSubmit={handleResolveEscalation} className="flex flex-col gap-4">
                      <div className="form-group">
                        <label>Escalation ID</label>
                        <input type="text" readOnly className="text-mono" value={selectedEscalation._id} />
                      </div>
                      <div className="form-group">
                        <label>Resolution Action Log Note</label>
                        <textarea
                          required
                          rows={4}
                          value={resolvedNote}
                          onChange={e => setResolvedNote(e.target.value)}
                          placeholder="e.g. Assigned to backup NGO manually via phone coordination."
                        />
                      </div>
                      <button type="submit" disabled={resolvingId === selectedEscalation._id} className="btn btn-primary w-full">
                        {resolvingId === selectedEscalation._id ? "Saving resolution..." : "Mark Escalation Resolved"}
                      </button>
                    </form>
                  </Modal>
                )}
              </div>
            )}

            {/* AUDIT LOGS TAB */}
            {activeTab === "audit" && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Agentic workflow runs (7 columns) */}
                <div className="lg:col-span-7 flex flex-col gap-6">
                  <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                    <Compass size={18} className="text-cyan-400" />
                    Agent Runs
                  </h3>

                  {auditLogs.agentRuns?.length === 0 ? (
                    <Card hover={false} className="text-center py-8">
                      <p className="text-sm text-gray-400">No agent actions recorded yet.</p>
                    </Card>
                  ) : (
                    <div className="flex flex-col gap-4 max-h-[700px] overflow-y-auto pr-2">
                      {auditLogs.agentRuns.map(run => (
                        <Card
                          key={run._id}
                          title={run.agentType}
                          subtitle={`Incident Case: ${run.complaintId?.complaintId || "Triage Case"} | ${formatDate(run.createdAt)}`}
                          hover={false}
                          className="border-cyan-500/10"
                        >
                          <div className="flex flex-col gap-3 mt-2 text-xs">
                            <div className="flex justify-between items-center">
                              <span className="font-semibold text-gray-400">Agent Decision:</span>
                              <Badge status={run.status === "SUCCESS" ? "completed" : "cancelled"} label={run.status} />
                            </div>

                            <p className="bg-black/30 p-3 rounded-lg border border-gray-800 italic text-cyan-300">
                              "{run.decisionSummary}"
                            </p>

                            {run.toolCalls?.length > 0 && (
                              <div className="mt-1">
                                <span className="font-semibold text-gray-400 block mb-2">Tools Executed:</span>
                                <div className="flex flex-col gap-2">
                                  {run.toolCalls.map((tool, idx) => (
                                    <div key={idx} className="p-3 bg-black/40 rounded border border-gray-800/80 font-mono text-[11px] text-gray-400">
                                      <div className="text-white font-bold mb-1">&bull; {tool.toolName || "tool"}()</div>
                                      <div style={{ marginLeft: 8 }}>
                                        <div><span className="text-cyan-400">Args:</span> {JSON.stringify(tool.args)}</div>
                                        <div className="mt-1"><span className="text-green-400">Result:</span> {JSON.stringify(tool.result)}</div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>

                {/* Notifications delivered (5 columns) */}
                <div className="lg:col-span-5 flex flex-col gap-6">
                  <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                    <Clock size={18} className="text-cyan-400" />
                    Delivery Notifications
                  </h3>

                  {auditLogs.notifications?.length === 0 ? (
                    <Card hover={false} className="text-center py-8">
                      <p className="text-sm text-gray-400">No dispatch notification logs found.</p>
                    </Card>
                  ) : (
                    <div className="flex flex-col gap-3 max-h-[700px] overflow-y-auto pr-2">
                      {auditLogs.notifications.map(log => (
                        <div
                          key={log._id}
                          className="bg-black/20 p-4 rounded-xl border border-gray-800 text-xs text-gray-300 flex flex-col gap-2 relative"
                        >
                          <div className="flex justify-between items-start">
                            <span className="font-bold text-white">{log.subject}</span>
                            <span className="bg-cyan-500/10 text-cyan-400 text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                              {log.recipientType}
                            </span>
                          </div>
                          
                          <p className="text-gray-400 leading-relaxed italic">"{log.message}"</p>

                          <div className="flex justify-between items-center text-[10px] text-gray-500 mt-1 border-t border-gray-800/40 pt-2">
                            <span>Status: {log.status} | Channel: {log.channel}</span>
                            <span>{formatDate(log.createdAt)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
