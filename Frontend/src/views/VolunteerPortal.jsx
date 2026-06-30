import React, { useState, useEffect } from "react";
import { api } from "../services/api";
import { Card, Badge, Spinner } from "../components/Shared";
import {
  Briefcase,
  ToggleLeft,
  ToggleRight,
  MapPin,
  Check,
  X,
  Send,
  AlertTriangle,
  Calendar
} from "lucide-react";

export default function VolunteerPortal() {
  const [profile, setProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  // Offers
  const [offers, setOffers] = useState([]);
  const [loadingOffers, setLoadingOffers] = useState(false);
  const [actioningOffer, setActioningOffer] = useState(null);

  // Assignments
  const [assignments, setAssignments] = useState([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [updatingTask, setUpdatingTask] = useState(null);
  const [progressNotes, setProgressNotes] = useState("");
  const [progressStatus, setProgressStatus] = useState("in_progress");

  // Load profile data
  const loadProfile = async () => {
    setLoadingProfile(true);
    try {
      const response = await api.volunteers.getMyProfile();
      if (response.success) {
        setProfile(response.data);
      }
    } catch (err) {
      console.error("Failed to load volunteer profile", err);
    } finally {
      setLoadingProfile(false);
    }
  };

  // Load volunteer offers (PENDING cases)
  const loadOffers = async () => {
    setLoadingOffers(true);
    try {
      const response = await api.volunteerOffers.getMyOffers("PENDING");
      if (response.success) {
        setOffers(response.data);
      }
    } catch (err) {
      console.error("Failed to load task offers", err);
    } finally {
      setLoadingOffers(false);
    }
  };

  // Load volunteer assignments (Tasks in progress)
  const loadAssignments = async () => {
    setLoadingAssignments(true);
    try {
      const response = await api.assignments.getMyAssignments();
      if (response.success) {
        setAssignments(response.data);
      }
    } catch (err) {
      console.error("Failed to load active assignments", err);
    } finally {
      setLoadingAssignments(false);
    }
  };

  // Run on mount
  useEffect(() => {
    loadProfile();
    loadOffers();
    loadAssignments();
  }, []);

  // Update availability toggle
  const handleToggleAvailability = async (newStatus) => {
    try {
      const res = await api.volunteers.updateMyAvailability(newStatus);
      if (res.success && res.data) {
        setProfile(res.data);
        alert(`Status updated to: ${newStatus.toUpperCase()}`);
      }
    } catch (err) {
      alert("Failed to toggle status: " + err.message);
    }
  };

  // Accept or Reject offer
  const handleOfferResponse = async (offerId, decision) => {
    setActioningOffer(offerId);
    try {
      const res = await api.volunteerOffers.respondToOffer(offerId, decision);
      if (res.success) {
        alert(res.message || `Offer successfully ${decision === "ACCEPT" ? "accepted" : "rejected"}`);
        // Reload details
        loadOffers();
        loadAssignments();
        loadProfile(); // Reliability/Availability status might change
      }
    } catch (err) {
      alert(err.message || "Failed to submit decision");
    } finally {
      setActioningOffer(null);
    }
  };

  // Submit progress report
  const handleProgressSubmit = async (e, assignmentId) => {
    e.preventDefault();
    if (!progressNotes.trim()) {
      alert("Please write progress report notes before submitting.");
      return;
    }
    setUpdatingTask(assignmentId);
    try {
      const res = await api.assignments.updateMyAssignmentProgress(
        assignmentId,
        progressStatus,
        progressNotes
      );
      if (res.success) {
        alert("Progress report submitted successfully.");
        setProgressNotes("");
        loadAssignments();
        // If completed, reload profile as status returns to 'available'
        if (progressStatus === "completed") {
          loadProfile();
        }
      }
    } catch (err) {
      alert(err.message || "Failed to upload progress status");
    } finally {
      setUpdatingTask(null);
    }
  };

  // Helper date formatter
  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in">
      
      {/* LEFT COLUMN: Profile & Settings (4 Columns) */}
      <div className="lg:col-span-4 flex flex-col gap-6">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight">Volunteer Portal</h2>
          <p className="text-gray-400">Review assignments and manage availability settings.</p>
        </div>

        {loadingProfile ? (
          <Spinner size="md" />
        ) : profile ? (
          <Card hover={false} title={profile.name} subtitle="Field Relief Responder">
            <div className="flex flex-col gap-5 mt-2">
              
              {/* Reliability index */}
              <div className="flex justify-between items-center bg-black/20 p-4 rounded-xl border border-gray-800">
                <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Reliability Score</span>
                <span className="text-2xl font-extrabold text-green-400">{profile.reliabilityScore || 100}/100</span>
              </div>

              {/* Status toggles */}
              <div className="flex flex-col gap-3">
                <label className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1 block">Availability Switch</label>
                
                {[
                  { id: "available", label: "Available", desc: "Open to receive new incident dispatches", activeColor: "text-green-400 border-green-500/20 bg-green-500/5" },
                  { id: "busy", label: "Busy", desc: "Temporary paused. No matches will be routed", activeColor: "text-yellow-400 border-yellow-500/20 bg-yellow-500/5" },
                  { id: "off_duty", label: "Off Duty", desc: "Away from relief operations", activeColor: "text-red-400 border-red-500/20 bg-red-500/5" }
                ].map(status => {
                  const isCurrent = profile.availability === status.id;
                  return (
                    <button
                      key={status.id}
                      type="button"
                      onClick={() => handleToggleAvailability(status.id)}
                      className={`btn justify-start text-left p-3 ${isCurrent ? status.activeColor : "btn-secondary"}`}
                      style={{ border: isCurrent ? "1px solid" : "none" }}
                    >
                      <div className="flex-1">
                        <span className="font-bold text-sm block">{status.label}</span>
                        <span className="text-[10px] text-gray-400 leading-none">{status.desc}</span>
                      </div>
                      {isCurrent ? <ToggleRight className="text-cyan-400" size={24} /> : <ToggleLeft size={24} />}
                    </button>
                  );
                })}
              </div>

              {/* Specialist capabilities list */}
              <div className="border-t border-gray-800 pt-4">
                <span className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-2 block">Specialist Skills</span>
                <div className="flex flex-wrap gap-2">
                  {profile.skills?.map((skill, idx) => (
                    <span key={idx} className="badge badge-medium capitalize">
                      {skill.replace(/_/g, " ")}
                    </span>
                  )) || <span className="text-xs text-gray-400">No specialties listed.</span>}
                </div>
              </div>

              <div className="text-[10px] text-gray-500 mt-2">
                Primary Area: <span className="text-white capitalize">{profile.location || "General"}</span>
              </div>

            </div>
          </Card>
        ) : (
          <Card hover={false} className="border-dashed border-red-500/20 text-center py-6">
            <AlertTriangle className="text-red-400 mx-auto mb-2" size={32} />
            <p className="text-sm text-gray-400">Failed to link your login account to a volunteer profile.</p>
          </Card>
        )}
      </div>

      {/* RIGHT COLUMN: Offers & Active Assignments (8 Columns) */}
      <div className="lg:col-span-8 flex flex-col gap-8">
        
        {/* SECTION 1: Active Cases Offers (Dispatched wave) */}
        <div>
          <h3 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
            <Calendar size={20} className="text-cyan-400" />
            Case Offers (Requires Acceptance)
          </h3>

          {loadingOffers ? (
            <Spinner size="md" />
          ) : offers.length === 0 ? (
            <Card hover={false} className="text-center py-10 border-dashed border-gray-800">
              <p className="text-sm text-gray-400">No pending assignment offers found matching your profile.</p>
            </Card>
          ) : (
            <div className="flex flex-col gap-4">
              {offers.map(offer => (
                <Card 
                  key={offer._id}
                  title={`Task Offer: ${offer.complaintId?.complaintId || "Case Triage"}`}
                  subtitle={`Offer expires in: ${Math.round((new Date(offer.expiresAt) - new Date()) / 60000)} mins`}
                  className="border-primary/20"
                  hover={false}
                >
                  <div className="flex flex-col gap-4 mt-2">
                    <div className="flex gap-2">
                      <Badge status={offer.complaintId?.category || "DISASTER_RELIEF"} />
                      <Badge status={offer.complaintId?.severity || "MEDIUM"} />
                      <span className="text-xs text-cyan-400 font-semibold self-center ml-auto">Match Score: {offer.matchScore || 100}%</span>
                    </div>

                    <div className="bg-black/30 p-4 rounded-xl border border-gray-800">
                      <p className="text-sm text-gray-300 italic leading-relaxed">
                        "{offer.complaintId?.originalText || "No incident description available."}"
                      </p>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-gray-400">
                      {offer.complaintId?.locationHint && (
                        <span className="flex items-center gap-1">
                          <MapPin size={14} className="text-cyan-400" />
                          Landmark: {offer.complaintId.locationHint}
                        </span>
                      )}
                    </div>

                    <div className="flex gap-3 justify-end border-t border-gray-800 pt-3">
                      <button
                        disabled={actioningOffer === offer._id}
                        onClick={() => handleOfferResponse(offer._id, "REJECT")}
                        className="btn btn-secondary text-red-400 border-red-500/10 hover:bg-red-500/5"
                      >
                        <X size={14} /> Decline
                      </button>
                      <button
                        disabled={actioningOffer === offer._id}
                        onClick={() => handleOfferResponse(offer._id, "ACCEPT")}
                        className="btn btn-primary"
                      >
                        <Check size={14} /> Accept Assignment
                      </button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* SECTION 2: Active Tasks */}
        <div>
          <h3 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
            <Briefcase size={20} className="text-violet-400" />
            Active Tasks & Field logs
          </h3>

          {loadingAssignments ? (
            <Spinner size="md" />
          ) : assignments.length === 0 ? (
            <Card hover={false} className="text-center py-10 border-dashed border-gray-800">
              <p className="text-sm text-gray-400 font-semibold">You have no active task assignments at this moment.</p>
            </Card>
          ) : (
            <div className="flex flex-col gap-6">
              {assignments.map(ass => (
                <Card key={ass._id} hover={false} className="border-l-4 border-l-violet-500">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-bold text-white text-lg">
                        {ass.complaintId?.aiExtractedData?.summary || ass.needId?.title || "Relief Assignment"}
                      </h4>
                      <span className="text-xs text-gray-400 block mt-0.5">Assigned: {formatDate(ass.createdAt)}</span>
                    </div>
                    <Badge status={ass.status} />
                  </div>

                  <div className="flex flex-col gap-3 text-xs text-gray-300 mt-4">
                    {/* Location details */}
                    <div className="flex items-center gap-2">
                      <MapPin size={16} className="text-cyan-400 shrink-0" />
                      <span>
                        <span className="font-semibold text-white">Location Landmark:</span> {ass.complaintId?.locationHint || "General sector Area"}
                      </span>
                    </div>

                    {/* Full report text */}
                    <div className="bg-black/30 p-4 rounded-xl border border-gray-800 mt-2">
                      <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold block mb-1">Raw Alert Description</span>
                      <p className="text-xs italic leading-relaxed">
                        "{ass.complaintId?.originalText || "No original text available."}"
                      </p>
                    </div>

                    {/* Progress logs */}
                    {ass.progressUpdates?.length > 0 && (
                      <div className="mt-3">
                        <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold block mb-2">Progress Logs</span>
                        <div className="flex flex-col gap-2">
                          {ass.progressUpdates.map((update, idx) => (
                            <div key={idx} className="p-3 bg-black/20 rounded-lg border border-gray-800/50 flex gap-2 justify-between">
                              <div>
                                <Badge status={update.status} />
                                <p className="text-xs text-gray-300 mt-1 italic">"{update.message}"</p>
                              </div>
                              <span className="text-[10px] text-gray-500 shrink-0 self-center">{formatDate(update.timestamp)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Progress upload form */}
                    {ass.status !== "completed" && (
                      <form onSubmit={(e) => handleProgressSubmit(e, ass._id)} className="border-t border-gray-800/50 pt-4 mt-4 flex flex-col gap-4">
                        <span className="text-xs font-bold text-violet-400 uppercase tracking-wider">Submit Field Progress Log</span>
                        
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                          <div className="form-group md:col-span-4 mb-0">
                            <label>Updated Status</label>
                            <select 
                              value={progressStatus} 
                              onChange={e => setProgressStatus(e.target.value)}
                              className="w-full"
                            >
                              <option value="in_progress">In Progress</option>
                              <option value="completed">Completed (Mark resolved)</option>
                            </select>
                          </div>

                          <div className="form-group md:col-span-8 mb-0">
                            <label>Responder Activity Logs</label>
                            <div className="flex gap-2">
                              <input 
                                type="text" 
                                required
                                value={progressNotes} 
                                onChange={e => setProgressNotes(e.target.value)} 
                                placeholder="e.g. Distributed 10 packages, water level stable." 
                                className="flex-1"
                              />
                              <button 
                                type="submit" 
                                disabled={updatingTask === ass._id}
                                className="btn btn-primary"
                              >
                                {updatingTask === ass._id ? "Posting..." : <Send size={14} />}
                              </button>
                            </div>
                          </div>
                        </div>
                      </form>
                    )}

                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
