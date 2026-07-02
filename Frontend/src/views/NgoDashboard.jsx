import React, { useState, useEffect } from "react";
import { api } from "../services/api";
import { Card, Badge, Spinner, Modal } from "../components/Shared";
import {
  BarChart2,
  Inbox,
  AlertCircle,
  Users,
  Compass,
  FileText,
  Upload,
  Plus,
  Check,
  X,
  MapPin,
  ChevronRight,
  RefreshCw,
  Search,
  BookOpen
} from "lucide-react";

export default function NgoDashboard() {
  const [activeTab, setActiveTab] = useState("overview");

  // Dashboard metrics
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);
  
  // Case Offers
  const [offers, setOffers] = useState([]);
  const [loadingOffers, setLoadingOffers] = useState(false);
  const [actioningOffer, setActioningOffer] = useState(null);

  // Needs & Recommendations
  const [needs, setNeeds] = useState([]);
  const [loadingNeeds, setLoadingNeeds] = useState(false);
  const [selectedNeed, setSelectedNeed] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [recsError, setRecsError] = useState("");
  const [assigningVol, setAssigningVol] = useState(null);

  // Volunteers Roster
  const [volunteers, setVolunteers] = useState([]);
  const [loadingVolunteers, setLoadingVolunteers] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddVolunteer, setShowAddVolunteer] = useState(false);
  
  // New Volunteer form states
  const [vName, setVName] = useState("");
  const [vEmail, setVEmail] = useState("");
  const [vPhone, setVPhone] = useState("");
  const [vSkills, setVSkills] = useState("");
  const [vLocation, setVLocation] = useState("");
  const [vPreferredAreas, setVPreferredAreas] = useState("");
  const [vMaxAssignments, setVMaxAssignments] = useState(2);
  const [vReliability, setVReliability] = useState(90);
  const [vPassword, setVPassword] = useState("");
  const [submittingVolunteer, setSubmittingVolunteer] = useState(false);
  const [volError, setVolError] = useState("");

  // Assignments
  const [assignments, setAssignments] = useState([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);

  // Situation Reports
  const [reports, setReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [pdfTitle, setPdfTitle] = useState("");
  const [textTitle, setTextTitle] = useState("");
  const [repText, setRepText] = useState("");
  const [repFile, setRepFile] = useState(null);
  const [submittingReport, setSubmittingReport] = useState(false);
  const [reportError, setReportError] = useState("");
  const [selectedReport, setSelectedReport] = useState(null);

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  // Load functions
  const loadStats = async () => {
    setLoadingStats(true);
    try {
      const response = await api.dashboard.getOverview();
      if (response.success) {
        setStats(response.data);
      }
    } catch (err) {
      console.error("Failed to load dashboard metrics", err);
    } finally {
      setLoadingStats(false);
    }
  };

  const loadCaseOffers = async () => {
    setLoadingOffers(true);
    try {
      const response = await api.ngo.getCaseOffers("PENDING");
      if (response.success) {
        setOffers(response.data);
      }
    } catch (err) {
      console.error("Failed to load case offers", err);
    } finally {
      setLoadingOffers(false);
    }
  };

  const loadNeeds = async () => {
    setLoadingNeeds(true);
    try {
      const response = await api.needs.list();
      if (response.success) {
        setNeeds(response.data);
      }
    } catch (err) {
      console.error("Failed to load claims", err);
    } finally {
      setLoadingNeeds(false);
    }
  };

  const loadVolunteers = async () => {
    setLoadingVolunteers(true);
    try {
      const response = await api.volunteers.list();
      if (response.success) {
        setVolunteers(response.data);
      }
    } catch (err) {
      console.error("Failed to load volunteers roster", err);
    } finally {
      setLoadingVolunteers(false);
    }
  };

  const loadAssignments = async () => {
    setLoadingAssignments(true);
    try {
      const response = await api.assignments.list();
      if (response.success) {
        setAssignments(response.data);
      }
    } catch (err) {
      console.error("Failed to load assignments", err);
    } finally {
      setLoadingAssignments(false);
    }
  };

  const loadReports = async () => {
    setLoadingReports(true);
    try {
      const response = await api.reports.list();
      if (response.success) {
        setReports(response.data);
      }
    } catch (err) {
      console.error("Failed to load sit-reps", err);
    } finally {
      setLoadingReports(false);
    }
  };

  // Load case offers on mount to populate the notification badge
  useEffect(() => {
    loadCaseOffers();
  }, []);

  // Run on tab switch
  useEffect(() => {
    if (activeTab === "overview") {
      loadStats();
    } else if (activeTab === "offers") {
      loadCaseOffers();
    } else if (activeTab === "needs") {
      loadNeeds();
      setSelectedNeed(null);
      setRecommendations([]);
    } else if (activeTab === "volunteers") {
      loadVolunteers();
    } else if (activeTab === "assignments") {
      loadAssignments();
    } else if (activeTab === "reports") {
      loadReports();
    }
  }, [activeTab]);

  // Respond to incoming emergency wave
  const handleOfferResponse = async (offerId, decision) => {
    setActioningOffer(offerId);
    try {
      const res = await api.ngo.respondToCaseOffer(offerId, decision);
      if (res.success) {
        // Reload list
        setOffers(prev => prev.filter(o => o._id !== offerId));
        alert(res.message || `Case successfully ${decision === "ACCEPT" ? "accepted" : "rejected"}`);
      }
    } catch (err) {
      alert(err.message || "Failed to respond to offer");
    } finally {
      setActioningOffer(null);
    }
  };

  // Get matching volunteer recommendations
  const handleFetchRecommendations = async (need) => {
    setSelectedNeed(need);
    setLoadingRecs(true);
    setRecsError("");
    setRecommendations([]);
    try {
      const res = await api.matching.getRecommendations(need._id);
      if (res.success) {
        setRecommendations(res.recommendations || []);
      } else {
        setRecsError(res.message || "Failed to find matching volunteers");
      }
    } catch (err) {
      setRecsError(err.message || "Error running match score calculator");
    } finally {
      setLoadingRecs(false);
    }
  };

  // Create manual assignment
  const handleAssignVolunteer = async (volunteerId) => {
    setAssigningVol(volunteerId);
    try {
      const res = await api.assignments.create(selectedNeed._id, volunteerId);
      if (res.success) {
        alert("Volunteer assignment successfully dispatched! Alert email has been triggered.");
        // Refresh need list and reset recs
        loadNeeds();
        setSelectedNeed(null);
        setRecommendations([]);
      }
    } catch (err) {
      alert(err.message || "Failed to create assignment");
    } finally {
      setAssigningVol(null);
    }
  };

  // Complete assignment
  const handleCompleteAssignment = async (assignmentId) => {
    if (!window.confirm("Mark this assignment as completed? This will re-enable the volunteer's availability.")) return;
    try {
      const res = await api.assignments.updateStatus(assignmentId, "completed", "NGO Admin completed task.");
      if (res.success) {
        alert("Assignment marked as completed.");
        loadAssignments();
      }
    } catch (err) {
      alert(err.message || "Failed to update assignment status");
    }
  };

  // Create Volunteer
  const handleCreateVolunteer = async (e) => {
    e.preventDefault();
    setSubmittingVolunteer(true);
    setVolError("");

    const skillsArr = vSkills.split(",").map(s => s.trim()).filter(Boolean);
    const prefAreasArr = vPreferredAreas.split(",").map(a => a.trim()).filter(Boolean);

    try {
      const response = await api.volunteers.create({
        name: vName,
        email: vEmail,
        phone: vPhone,
        skills: skillsArr,
        location: vLocation,
        preferredAreas: prefAreasArr,
        maxActiveAssignments: vMaxAssignments,
        reliabilityScore: vReliability,
        availability: "available",
        isActive: true
      });

      if (response.success && response.data) {
        const createdVol = response.data;
        // Optionally create login account
        if (vPassword) {
          await api.volunteers.createLoginAccount(createdVol._id, vPassword);
        }
        alert("Volunteer profile and login account created successfully!");
        setShowAddVolunteer(false);
        // Clear fields
        setVName("");
        setVEmail("");
        setVPhone("");
        setVSkills("");
        setVLocation("");
        setVPreferredAreas("");
        setVPassword("");
        loadVolunteers();
      }
    } catch (err) {
      setVolError(err.message || "Failed to save volunteer profile");
    } finally {
      setSubmittingVolunteer(false);
    }
  };

  // Submit Text Report
  const handleTextReportSubmit = async (e) => {
    e.preventDefault();
    if (!textTitle || !repText) {
      setReportError("Title and description content are required");
      return;
    }
    setSubmittingReport(true);
    setReportError("");
    try {
      const res = await api.reports.submitText(textTitle, repText);
      if (res.success) {
        alert("Situation Report created successfully. Incident summary processed by AI.");
        setTextTitle("");
        setRepText("");
        loadReports();
      }
    } catch (err) {
      setReportError(err.message || "Failed to submit situation report");
    } finally {
      setSubmittingReport(false);
    }
  };

  // Submit PDF Report
  const handlePdfReportSubmit = async (e) => {
    e.preventDefault();
    if (!pdfTitle || !repFile) {
      setReportError("Title and PDF file are required");
      return;
    }
    setSubmittingReport(true);
    setReportError("");
    try {
      const res = await api.reports.submitPdf(pdfTitle, repFile);
      if (res.success) {
        alert("PDF Situation report parsed. AI summaries extracted successfully.");
        setPdfTitle("");
        setRepFile(null);
        // Reset file input element
        document.getElementById("pdf-file-input").value = "";
        loadReports();
      }
    } catch (err) {
      setReportError(err.message || "Failed to parse PDF report");
    } finally {
      setSubmittingReport(false);
    }
  };

  // View report details
  const viewReportDetail = async (report) => {
    try {
      const res = await api.reports.getById(report._id);
      if (res.success) {
        setSelectedReport(res.data);
      }
    } catch (err) {
      alert("Failed to load report summary: " + err.message);
    }
  };

  // Filter volunteers
  const filteredVolunteers = volunteers.filter(v => 
    v.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.skills?.some(s => s.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="dashboard-container">
      {/* Sidebar Navigation */}
      <aside className="dashboard-sidebar">
        <div className="mb-4">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-widest block mb-2">NGO Control Panel</span>
          <h2 className="text-2xl font-black text-white leading-none">Admin</h2>
        </div>
        
        <nav className="flex flex-col gap-2">
          {[
            { id: "overview", label: "Stats & Overview", icon: BarChart2 },
            { id: "offers", label: "Case Offers", icon: Inbox, badge: offers.length },
            { id: "needs", label: "Needs & Matching", icon: Compass },
            { id: "volunteers", label: "Volunteers Roster", icon: Users },
            { id: "assignments", label: "Task Allocations", icon: Check },
            { id: "reports", label: "Situation Reports", icon: FileText }
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
        
        {/* OVERVIEW TAB */}
        {activeTab === "overview" && (
          <div className="flex flex-col gap-8 animate-fade-in">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-3xl font-extrabold tracking-tight">Overview Dashboard</h2>
                <p className="text-gray-400">Real-time stats and dispatch activity monitoring.</p>
              </div>
              <button onClick={loadStats} className="btn btn-secondary p-3" disabled={loadingStats}>
                <RefreshCw size={16} className={loadingStats ? "animate-spin" : ""} />
              </button>
            </div>

            {loadingStats ? (
              <Spinner size="lg" />
            ) : stats ? (
              <div className="flex flex-col gap-8">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {[
                    { label: "Active Claims (Needs)", value: stats.totalNeeds, icon: AlertCircle, color: "var(--accent)" },
                    { label: "Active Assignments", value: stats.activeAssignments, icon: Compass, color: "var(--primary)" },
                    { label: "Available Personnel", value: stats.availableVolunteers, icon: Users, color: "var(--success)" },
                    { label: "Completion Rate", value: `${stats.completionRate}%`, icon: Check, color: "var(--success)" }
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

                {/* Additional Stats Details */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card title="Operational Performance" hover={false}>
                    <div className="flex flex-col gap-4 text-sm text-gray-300">
                      <div className="flex justify-between border-b border-gray-800 pb-2">
                        <span>Total Incidents claimed</span>
                        <span className="font-bold text-white">{stats.totalNeeds}</span>
                      </div>
                      <div className="flex justify-between border-b border-gray-800 pb-2">
                        <span>Active Field Operations</span>
                        <span className="font-bold text-white">{stats.activeAssignments}</span>
                      </div>
                      <div className="flex justify-between border-b border-gray-800 pb-2">
                        <span>Resolved Assignments</span>
                        <span className="font-bold text-white">{stats.completedAssignments}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total Roster Volunteers</span>
                        <span className="font-bold text-white">{stats.totalVolunteers}</span>
                      </div>
                    </div>
                  </Card>
                  <Card title="Quick Resources Link" hover={false}>
                    <p className="text-sm text-gray-400 mb-4">
                      Directly navigate to specific operational areas to resolve active alerts.
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <button onClick={() => setActiveTab("offers")} className="btn btn-secondary text-sm">
                        Accept Case Offers &rarr;
                      </button>
                      <button onClick={() => setActiveTab("needs")} className="btn btn-primary text-sm">
                        Match Volunteers &rarr;
                      </button>
                    </div>
                  </Card>
                </div>
              </div>
            ) : (
              <p>No operational stats found.</p>
            )}
          </div>
        )}

        {/* CASE OFFERS TAB */}
        {activeTab === "offers" && (
          <div className="flex flex-col gap-6 animate-fade-in">
            <div>
              <h2 className="text-3xl font-extrabold tracking-tight">Incoming Incident Offers</h2>
              <p className="text-gray-400">Complaints triaged by AI and dispatched according to your capabilities and area.</p>
            </div>

            {loadingOffers ? (
              <Spinner size="lg" />
            ) : offers.length === 0 ? (
              <Card hover={false} className="text-center py-12 border-dashed border-gray-800">
                <Inbox size={48} className="text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-1">Queue is Empty</h3>
                <p className="text-sm text-gray-400">No pending emergency case offers at this moment.</p>
              </Card>
            ) : (
              <div className="flex flex-col gap-4">
                {offers.map(offer => (
                  <Card 
                    key={offer._id}
                    title={`Incident Alert: ${offer.complaintId?.complaintId || "Case alert"}`}
                    subtitle={`Dispatched wave expires in: ${Math.round((new Date(offer.expiresAt) - new Date()) / 60000)} mins`}
                    className="border-primary/20"
                    hover={false}
                  >
                    <div className="flex flex-col gap-4 mt-2">
                      <div className="flex flex-wrap gap-2">
                        {offer.complaintId?.category && <Badge status={offer.complaintId.category} />}
                        {offer.complaintId?.severity && <Badge status={offer.complaintId.severity} />}
                      </div>

                      <div className="bg-black/30 p-4 rounded-xl border border-gray-800">
                        <p className="text-sm text-gray-300 italic leading-relaxed">
                          "{offer.complaintId?.originalText || "No description text."}"
                        </p>
                      </div>

                      <div className="flex items-center gap-6 text-xs text-gray-400">
                        {offer.complaintId?.locationHint && (
                          <span className="flex items-center gap-1">
                            <MapPin size={14} className="text-cyan-400" />
                            Landmark: {offer.complaintId.locationHint}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Users size={14} className="text-cyan-400" />
                          Required Staff: {offer.complaintId?.requiredPeople || 1}
                        </span>
                      </div>

                      <div className="flex gap-3 justify-end border-t border-gray-800/50 pt-4">
                        <button
                          disabled={actioningOffer === offer._id}
                          onClick={() => handleOfferResponse(offer._id, "REJECT")}
                          className="btn btn-secondary text-red-400 border-red-500/10 hover:bg-red-500/5"
                        >
                          <X size={16} /> Reject
                        </button>
                        <button
                          disabled={actioningOffer === offer._id}
                          onClick={() => handleOfferResponse(offer._id, "ACCEPT")}
                          className="btn btn-primary"
                        >
                          <Check size={16} /> Claim & Match Volunteers
                        </button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* NEEDS & MATCHING TAB */}
        {activeTab === "needs" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in">
            {/* Left side: Claimed list (5 Columns) */}
            <div className="lg:col-span-5 flex flex-col gap-6">
              <div>
                <h2 className="text-3xl font-extrabold tracking-tight">Needs Panel</h2>
                <p className="text-gray-400">Select an accepted complaint to match volunteers.</p>
              </div>

              {loadingNeeds ? (
                <Spinner size="lg" />
              ) : needs.filter(n => n.status !== "completed" && n.status !== "resolved").length === 0 ? (
                <Card hover={false} className="text-center py-12 border-dashed border-gray-800">
                  <Check size={48} className="text-gray-600 mx-auto mb-4" />
                  <h3 className="text-lg font-bold mb-1">All Clear</h3>
                  <p className="text-sm text-gray-400">No pending needs require assignments.</p>
                </Card>
              ) : (
                <div className="flex flex-col gap-4">
                  {needs
                    .filter(n => n.status !== "completed" && n.status !== "resolved")
                    .map(need => (
                      <Card
                        key={need._id}
                        onClick={() => handleFetchRecommendations(need)}
                        className={`border-l-4 ${selectedNeed?._id === need._id ? "border-l-primary bg-primary/5" : "border-l-gray-700"}`}
                        hover={true}
                      >
                        <div className="flex flex-col gap-2">
                          <div className="flex justify-between items-start">
                            <h4 className="font-bold text-white text-sm line-clamp-1">{need.title || "Incident claim"}</h4>
                            <Badge status={need.priority || "medium"} />
                          </div>
                          
                          <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">
                            {need.extractedData?.summary || "No extracted summary."}
                          </p>

                          <div className="flex items-center justify-between text-[10px] text-gray-500 mt-2">
                            <span className="capitalize">Skills: {need.extractedData?.requiredSkills?.join(", ") || "General"}</span>
                            <span>Needed: {need.extractedData?.affectedPeople || 1} person(s)</span>
                          </div>
                        </div>
                      </Card>
                    ))}
                </div>
              )}
            </div>

            {/* Right side: AI Recommendations (7 Columns) */}
            <div className="lg:col-span-7 flex flex-col gap-6">
              {selectedNeed ? (
                <div className="flex flex-col gap-6">
                  <div className="border-b border-gray-800 pb-4">
                    <span className="text-xs font-bold text-cyan-400 uppercase tracking-widest block mb-1">Selected need triage</span>
                    <h3 className="text-2xl font-bold text-white mb-2">{selectedNeed.title}</h3>
                    <p className="text-sm text-gray-400 leading-relaxed mb-3">
                      "{selectedNeed.extractedData?.summary || "No detailed summary."}"
                    </p>
                    
                    <div className="flex gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <MapPin size={12} /> Landmark: {selectedNeed.extractedData?.location || "Not specified"}
                      </span>
                      <span>Category: {selectedNeed.extractedData?.issueType || "General"}</span>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                      <Compass size={18} className="text-cyan-400" />
                      AI Recommended Volunteers
                    </h4>

                    {loadingRecs ? (
                      <Spinner size="md" />
                    ) : recsError ? (
                      <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs">
                        {recsError}
                      </div>
                    ) : recommendations.length === 0 ? (
                      <Card hover={false} className="text-center py-8">
                        <p className="text-sm text-gray-400">No active, available volunteers matched the required profile.</p>
                      </Card>
                    ) : (
                      <div className="flex flex-col gap-4">
                        {recommendations.map((rec, idx) => (
                          <Card key={idx} hover={false} className="border-l-4 border-l-green-500/40">
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <h5 className="font-bold text-white text-base">{rec.volunteer.name}</h5>
                                <p className="text-xs text-gray-400">{rec.volunteer.email} | {rec.volunteer.phone}</p>
                              </div>
                              <div className="text-right">
                                <span className="text-lg font-extrabold text-green-400 block">{rec.matchScore}%</span>
                                <span className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Match Score</span>
                              </div>
                            </div>

                            <div className="flex flex-col gap-2 text-xs text-gray-300 bg-black/20 p-3 rounded-xl mb-4 border border-gray-800">
                              <span className="font-semibold text-gray-400">Match Analysis:</span>
                              <ul className="list-disc pl-4 flex flex-col gap-1">
                                {rec.matchReasons?.map((reason, i) => (
                                  <li key={i}>{reason}</li>
                                ))}
                              </ul>
                            </div>

                            <div className="flex justify-between items-center text-xs text-gray-400">
                              <div className="flex gap-2">
                                <span className="capitalize">Skills: {rec.volunteer.skills?.join(", ")}</span>
                              </div>
                              <button
                                disabled={assigningVol === rec.volunteer._id}
                                onClick={() => handleAssignVolunteer(rec.volunteer._id)}
                                className="btn btn-primary py-1.5 px-3 text-xs"
                              >
                                {assigningVol === rec.volunteer._id ? "Assigning..." : "Assign Task"}
                              </button>
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center border border-dashed border-gray-800 rounded-2xl py-24 text-center">
                  <div>
                    <Compass size={48} className="text-gray-700 mx-auto mb-4" />
                    <h4 className="text-lg font-bold text-gray-400">Triage Engine Idle</h4>
                    <p className="text-sm text-gray-500">Select a need from the left column to run AI matching recommendations.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* VOLUNTEERS ROSTER TAB */}
        {activeTab === "volunteers" && (
          <div className="flex flex-col gap-6 animate-fade-in">
            <div className="flex justify-between items-start flex-wrap gap-4">
              <div>
                <h2 className="text-3xl font-extrabold tracking-tight">Volunteers Roster</h2>
                <p className="text-gray-400">Manage registered relief personnel and dispatch credentials.</p>
              </div>
              <button onClick={() => setShowAddVolunteer(true)} className="btn btn-primary">
                <Plus size={16} /> Register Volunteer
              </button>
            </div>

            <div className="relative">
              <input 
                type="text" 
                placeholder="Search volunteers by name, email, or skill..."
                className="w-full pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Search className="absolute left-3 top-3.5 text-gray-500" size={16} />
            </div>

            {loadingVolunteers ? (
              <Spinner size="lg" />
            ) : filteredVolunteers.length === 0 ? (
              <Card hover={false} className="text-center py-12">
                <Users className="text-gray-600 mx-auto mb-4" size={48} />
                <p className="text-sm text-gray-400">No volunteers found matching search criteria.</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredVolunteers.map(vol => (
                  <Card key={vol._id} hover={false}>
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-bold text-white text-lg">{vol.name}</h4>
                        <span className="text-xs text-gray-400 block mt-0.5">{vol.email} | {vol.phone}</span>
                      </div>
                      <Badge status={vol.availability} />
                    </div>

                    <div className="flex flex-col gap-2 text-xs text-gray-300 mt-3 pt-3 border-t border-gray-800/50">
                      <div className="flex justify-between">
                        <span>Reliability Index</span>
                        <span className="font-bold text-green-400">{vol.reliabilityScore || 100}/100</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Workload Allocation</span>
                        <span>{vol.currentActiveAssignments || 0} / {vol.maxActiveAssignments || 1} Cases</span>
                      </div>
                      <div className="flex justify-between items-start mt-1">
                        <span>Preferred Area</span>
                        <span className="capitalize">{vol.location || "General Area"}</span>
                      </div>
                      <div className="flex justify-between items-start mt-1">
                        <span>Specialist Skills</span>
                        <span className="capitalize text-cyan-400 text-right">{vol.skills?.join(", ") || "General Volunteering"}</span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {/* Modal Form for Adding Volunteer */}
            <Modal isOpen={showAddVolunteer} onClose={() => setShowAddVolunteer(false)} title="Register Relief Volunteer">
              <form onSubmit={handleCreateVolunteer} className="flex flex-col gap-4">
                {volError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs">
                    {volError}
                  </div>
                )}
                
                <div className="form-group">
                  <label>Full Name</label>
                  <input type="text" required value={vName} onChange={e => setVName(e.target.value)} placeholder="e.g. Gaurav Sharma" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="form-group">
                    <label>Email Address</label>
                    <input type="email" required value={vEmail} onChange={e => setVEmail(e.target.value)} placeholder="name@domain.com" />
                  </div>
                  <div className="form-group">
                    <label>Contact Phone</label>
                    <input type="tel" required value={vPhone} onChange={e => setVPhone(e.target.value)} placeholder="+91XXXXXXXXXX" />
                  </div>
                </div>

                <div className="form-group">
                  <label>Home Area / Primary Location</label>
                  <input type="text" required value={vLocation} onChange={e => setVLocation(e.target.value)} placeholder="e.g. Sector 4" />
                </div>

                <div className="form-group">
                  <label>Preferred Dispatch Sectors (Comma separated)</label>
                  <input type="text" value={vPreferredAreas} onChange={e => setVPreferredAreas(e.target.value)} placeholder="e.g. Sector 4, Sector 7, Outer Ring Road" />
                </div>

                <div className="form-group">
                  <label>Capabilities / Skills (Comma separated)</label>
                  <input type="text" value={vSkills} onChange={e => setVSkills(e.target.value)} placeholder="e.g. first_aid, food_distribution, search_rescue" />
                  <span className="text-[10px] text-gray-500">Keywords used by AI to match with claims: first_aid, medical_support, food_distribution, shelter_coordination, disaster_response</span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="form-group">
                    <label>Max Workload (Active tasks)</label>
                    <input type="number" min="1" max="10" value={vMaxAssignments} onChange={e => setVMaxAssignments(parseInt(e.target.value))} />
                  </div>
                  <div className="form-group">
                    <label>Starting Reliability Index (0-100)</label>
                    <input type="number" min="1" max="100" value={vReliability} onChange={e => setVReliability(parseInt(e.target.value))} />
                  </div>
                </div>

                <div className="form-group border-t border-gray-800 pt-4">
                  <label className="text-cyan-400 font-bold">Assign Login Credentials</label>
                  <input type="password" value={vPassword} onChange={e => setVPassword(e.target.value)} placeholder="Enter starting password for volunteer" />
                  <span className="text-[10px] text-gray-500">If password is provided, a login account will be generated automatically.</span>
                </div>

                <button type="submit" disabled={submittingVolunteer} className="btn btn-primary w-full mt-2">
                  {submittingVolunteer ? <Spinner size="sm" color="white" /> : "Save Profile & Credentials"}
                </button>
              </form>
            </Modal>
          </div>
        )}

        {/* ASSIGNMENTS TAB */}
        {activeTab === "assignments" && (
          <div className="flex flex-col gap-6 animate-fade-in">
            <div>
              <h2 className="text-3xl font-extrabold tracking-tight">Active Allocations</h2>
              <p className="text-gray-400">Track task status and field progress notifications submitted by responder personnel.</p>
            </div>

            {loadingAssignments ? (
              <Spinner size="lg" />
            ) : assignments.length === 0 ? (
              <Card hover={false} className="text-center py-12 border-dashed border-gray-800">
                <Compass className="text-gray-600 mx-auto mb-4" size={48} />
                <p className="text-sm text-gray-400">No active volunteer allocations found.</p>
              </Card>
            ) : (
              <div className="flex flex-col gap-4">
                {assignments.map(ass => (
                  <Card key={ass._id} hover={false} className="border-l-4 border-l-primary">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="font-bold text-white text-base">
                          Task: {ass.needId?.title || "Relief Assignment"}
                        </h4>
                        <span className="text-xs text-gray-400 block mt-0.5">
                          Assigned To: <span className="font-semibold text-white">{ass.volunteerId?.name || "Unassigned"}</span> | Email: {ass.volunteerId?.email}
                        </span>
                      </div>
                      <Badge status={ass.status} />
                    </div>

                    <div className="bg-black/20 p-4 rounded-xl border border-gray-800 text-xs text-gray-300 flex flex-col gap-2 mb-4">
                      <div>
                        <span className="font-semibold text-gray-400">Triage Summary:</span>
                        <p className="mt-1">"{ass.needId?.extractedData?.summary || "No triage summary available."}"</p>
                      </div>
                      {ass.notes && (
                        <div className="border-t border-gray-800 pt-2 mt-1">
                          <span className="font-semibold text-gray-400">Responder Notes:</span>
                          <p className="mt-1 text-cyan-300 italic">"{ass.notes}"</p>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-between items-center text-xs text-gray-500">
                      <span>Assigned at: {formatDate(ass.createdAt)}</span>
                      {ass.status !== "completed" && (
                        <button
                          onClick={() => handleCompleteAssignment(ass._id)}
                          className="btn btn-secondary py-1 px-3 text-xs text-green-400 hover:bg-green-500/5 hover:border-green-500/20"
                        >
                          Mark Completed
                        </button>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SITUATION REPORTS TAB */}
        {activeTab === "reports" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in">
            {/* Left side: Upload form (5 Columns) */}
            <div className="lg:col-span-5 flex flex-col gap-6">
              <div>
                <h2 className="text-3xl font-extrabold tracking-tight">Operational Reports</h2>
                <p className="text-gray-400">Submit situation updates. PDF files are parsed and analyzed by the AI extractor.</p>
              </div>

              <Card hover={false} title="Report ingestion">
                <div className="flex flex-col gap-6">
                  {reportError && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs">
                      {reportError}
                    </div>
                  )}

                  {/* Form 1: PDF Upload */}
                  <form onSubmit={handlePdfReportSubmit} className="flex flex-col gap-4 pb-6 border-b border-gray-800">
                    <span className="text-xs font-bold text-cyan-400 uppercase tracking-widest block">Option 1: Upload Incident PDF</span>
                    
                    <div className="form-group">
                      <label>Report Title</label>
                      <input type="text" required value={pdfTitle} onChange={e => setPdfTitle(e.target.value)} placeholder="e.g. Cyclone Triage Summary Area 4" />
                    </div>

                    <div className="form-group">
                      <label>PDF Document</label>
                      <input 
                        id="pdf-file-input"
                        type="file" 
                        accept=".pdf"
                        required
                        className="file:bg-violet-600 file:border-none file:px-3 file:py-1 file:rounded file:text-white file:text-xs file:cursor-pointer"
                        onChange={e => setRepFile(e.target.files[0])} 
                      />
                      <span className="text-[10px] text-gray-500">Max size 5MB. PDF parser extracts text for analysis.</span>
                    </div>

                    <button type="submit" disabled={submittingReport} className="btn btn-primary w-full">
                      {submittingReport ? (
                        <><Spinner size="sm" color="white" /> Processing PDF...</>
                      ) : (
                        <><Upload size={16} /> Process PDF Report</>
                      )}
                    </button>
                  </form>

                  {/* Form 2: Plain Text Submission */}
                  <form onSubmit={handleTextReportSubmit} className="flex flex-col gap-4">
                    <span className="text-xs font-bold text-violet-400 uppercase tracking-widest block">Option 2: Plain Text Update</span>

                    <div className="form-group">
                      <label>Report Title</label>
                      <input type="text" required value={textTitle} onChange={e => setTextTitle(e.target.value)} placeholder="e.g. Field Update Area 1" />
                    </div>

                    <div className="form-group">
                      <label>Incident Details (Raw text)</label>
                      <textarea 
                        required 
                        rows={4} 
                        value={repText} 
                        onChange={e => setRepText(e.target.value)} 
                        placeholder="Write details of the disaster assessment update..."
                      />
                    </div>

                    <button type="submit" disabled={submittingReport} className="btn btn-secondary w-full">
                      {submittingReport ? (
                        <><Spinner size="sm" /> Triaging Text...</>
                      ) : (
                        "File Text Report"
                      )}
                    </button>
                  </form>
                </div>
              </Card>
            </div>

            {/* Right side: Report Listing & Summaries (7 Columns) */}
            <div className="lg:col-span-7 flex flex-col gap-6">
              <div>
                <h3 className="text-2xl font-bold text-white mb-4">Ingested Situation Reports</h3>
                
                {loadingReports ? (
                  <Spinner size="lg" />
                ) : reports.length === 0 ? (
                  <Card hover={false} className="text-center py-8">
                    <p className="text-sm text-gray-400">No situation reports have been filed yet.</p>
                  </Card>
                ) : (
                  <div className="flex flex-col gap-4">
                    {reports.map(rep => (
                      <Card 
                        key={rep._id} 
                        title={rep.title} 
                        subtitle={`Submitted on ${formatDate(rep.createdAt)}`}
                        onClick={() => viewReportDetail(rep)}
                        hover={true}
                        className="cursor-pointer"
                      >
                        <div className="flex justify-between items-center text-xs text-cyan-400 mt-2">
                          <span className="flex items-center gap-1">
                            <BookOpen size={14} /> Type: {rep.reportType || "TEXT"}
                          </span>
                          <span className="flex items-center gap-1 hover:underline">
                            View summary details <ChevronRight size={14} />
                          </span>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              {/* Ingested Report Modal Detail */}
              {selectedReport && (
                <Modal isOpen={!!selectedReport} onClose={() => setSelectedReport(null)} title={selectedReport.title}>
                  <div className="flex flex-col gap-4">
                    <div>
                      <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Report Metadata</span>
                      <p className="text-xs text-gray-300 mt-1">
                        Type: {selectedReport.reportType} | Ingested: {formatDate(selectedReport.createdAt)}
                      </p>
                    </div>

                    <div className="border-t border-gray-800 pt-3">
                      <span className="text-[10px] text-cyan-400 uppercase font-bold tracking-wider">AI Extracted Summary</span>
                      <div className="p-4 bg-cyan-500/5 border border-cyan-500/10 rounded-xl mt-1 text-sm text-gray-200 leading-relaxed italic">
                        "{selectedReport.aiExtractedSummary || "Processing extraction summary..."}"
                      </div>
                    </div>

                    {selectedReport.originalText && (
                      <div className="border-t border-gray-800 pt-3">
                        <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Source Content</span>
                        <div className="max-h-48 overflow-y-auto bg-black/40 p-3 rounded border border-gray-800 text-xs text-gray-400 font-mono mt-1 break-words">
                          {selectedReport.originalText}
                        </div>
                      </div>
                    )}

                    <button onClick={() => setSelectedReport(null)} className="btn btn-secondary w-full mt-2">
                      Close Report Triage
                    </button>
                  </div>
                </Modal>
              )}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
