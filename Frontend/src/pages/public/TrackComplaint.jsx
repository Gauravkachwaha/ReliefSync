import React, { useState } from "react";
import { Search, Compass, Shield, Clock, Users, AlertTriangle, Star, CheckCircle } from "lucide-react";
import { Card, Badge, Button, FieldGroup, Input } from "../../components/ui";
import { useTrackComplaint, useSubmitFeedback } from "../../hooks/api/usePublic";
import { useToast } from "../../context/ToastContext";

const STAGES = [
  "SUBMITTED",
  "PROCESSING",
  "READY_FOR_ROUTING",
  "NGOS_NOTIFIED",
  "NGO_ACCEPTED",
  "VOLUNTEER_MATCHING",
  "FULLY_ASSIGNED",
  "IN_PROGRESS",
  "RESOLVED",
];

const fmt = (d) =>
  d ? new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "";

export default function TrackComplaint() {
  const [trackId, setTrackId] = useState("");
  const [trackToken, setTrackToken] = useState("");
  const [tracked, setTracked] = useState(null);
  const [rating, setRating] = useState(5);
  const [comments, setComments] = useState("");
  const track = useTrackComplaint();
  const feedback = useSubmitFeedback();
  const toast = useToast();

  const handleTrack = async (e) => {
    e.preventDefault();
    try {
      const res = await track.mutateAsync({ complaintId: trackId, token: trackToken });
      if (res.success && res.data) setTracked(res.data);
      else toast.error("Not found", res.message);
    } catch (err) {
      toast.error("Lookup failed", err.message);
    }
  };

  const handleFeedback = async (e) => {
    e.preventDefault();
    try {
      const res = await feedback.mutateAsync({
        complaintId: tracked.complaintId,
        token: trackToken,
        rating,
        comments,
      });
      if (res.success) {
        toast.success("Feedback submitted", "Thanks for helping improve the NGO Impact Board.");
        setTracked((prev) => ({ ...prev, feedback: res.data.feedback }));
        setComments("");
      }
    } catch (err) {
      toast.error("Feedback failed", err.message);
    }
  };

  const stageIndex = tracked ? STAGES.indexOf(tracked.status) : -1;

  return (
    <div className="flex-1 px-6 py-14 max-w-xl mx-auto w-full flex flex-col gap-6 animate-fade-up">
      <div className="text-center">
        <h1 className="text-3xl font-extrabold mb-2">
          Track Your <span className="gradient-text">Report</span>
        </h1>
        <p className="text-text-secondary text-sm">Enter the credentials you received on submission.</p>
      </div>

      <Card>
        <form onSubmit={handleTrack} className="flex flex-col gap-4">
          <FieldGroup label="Complaint ID">
            <Input
              icon={Compass}
              className="uppercase font-mono"
              placeholder="RS-XXXXXXXXXXXX"
              required
              value={trackId}
              onChange={(e) => setTrackId(e.target.value.trim().toUpperCase())}
            />
          </FieldGroup>
          <FieldGroup label="Private Tracking Token">
            <Input
              icon={Shield}
              type="password"
              className="font-mono"
              placeholder="Paste your tracking token"
              required
              value={trackToken}
              onChange={(e) => setTrackToken(e.target.value.trim())}
            />
          </FieldGroup>
          <Button type="submit" variant="secondary" full loading={track.isPending}>
            <Search size={15} /> Fetch Status
          </Button>
        </form>
      </Card>

      {tracked && (
        <Card title={`Case: ${tracked.complaintId}`} subtitle={`Filed ${fmt(tracked.createdAt)}`} className="animate-fade-up">
          <div className="flex flex-col gap-5">
            <div className="flex flex-wrap gap-2">
              <Badge status={tracked.status} />
              {tracked.severity && <Badge status={tracked.severity} />}
              {tracked.category && <Badge status={tracked.category} />}
            </div>

            {stageIndex >= 0 && (
              <div className="flex items-center gap-1">
                {STAGES.map((s, i) => (
                  <div
                    key={s}
                    className={`h-1.5 flex-1 rounded-full ${i <= stageIndex ? "bg-primary" : "bg-white/10"}`}
                    title={s}
                  />
                ))}
              </div>
            )}

            {tracked.summary && (
              <div className="rounded-xl border border-border bg-surface-input px-4 py-3">
                <div className="text-[0.65rem] font-bold uppercase text-text-dim mb-1">AI Case Summary</div>
                <p className="text-sm italic text-text-secondary leading-relaxed">"{tracked.summary}"</p>
              </div>
            )}

            {tracked.needsClarification && tracked.clarificationQuestions?.length > 0 && (
              <div className="rounded-xl border border-warning/20 bg-warning-bg p-4 flex gap-3">
                <AlertTriangle size={16} className="text-warning shrink-0 mt-0.5" />
                <div>
                  <strong className="block text-sm mb-1">Additional details needed:</strong>
                  <ul className="list-disc pl-4 text-sm text-text-secondary space-y-1">
                    {tracked.clarificationQuestions.map((q, i) => (
                      <li key={i}>{q}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-border bg-surface-input px-4 py-3">
                <div className="text-[0.65rem] font-bold uppercase text-text-dim mb-1">Personnel Needed</div>
                <div className="flex items-center gap-1.5 font-bold text-sm">
                  <Users size={13} className="text-accent" />
                  {tracked.requiredPeople || 1} ({tracked.assignedPeopleCount || 0} assigned)
                </div>
              </div>
              <div className="rounded-xl border border-border bg-surface-input px-4 py-3">
                <div className="text-[0.65rem] font-bold uppercase text-text-dim mb-1">Required Skills</div>
                <div className="font-semibold text-sm capitalize">
                  {tracked.requiredSkills?.map((s) => s.replace(/_/g, " ")).join(", ") || "General Aid"}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-text-dim text-xs border-b border-border pb-4">
              <Clock size={12} /> Updated {fmt(tracked.updatedAt)}
            </div>

            {tracked.status === "RESOLVED" && (
              <div>
                <span className="text-xs font-bold text-accent uppercase tracking-widest block mb-3">
                  Citizen Resolution Feedback
                </span>
                {tracked.feedback?.rating ? (
                  <div className="rounded-xl border border-success/20 bg-success-bg p-4 text-xs flex flex-col gap-1.5">
                    <div className="flex items-center gap-1.5 font-bold text-text">
                      <CheckCircle size={13} /> Feedback Recorded
                    </div>
                    <div className="flex gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} size={13} fill={i < tracked.feedback.rating ? "currentColor" : "none"} className="text-warning" />
                      ))}
                    </div>
                    {tracked.feedback.comments && (
                      <p className="text-text-secondary italic mt-1">"{tracked.feedback.comments}"</p>
                    )}
                  </div>
                ) : (
                  <form onSubmit={handleFeedback} className="flex flex-col gap-3">
                    <div className="flex gap-1.5">
                      {[1, 2, 3, 4, 5].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setRating(val)}
                          className="p-1 text-warning"
                        >
                          <Star size={18} fill={rating >= val ? "currentColor" : "none"} />
                        </button>
                      ))}
                    </div>
                    <Input
                      required
                      value={comments}
                      onChange={(e) => setComments(e.target.value)}
                      placeholder="Help us improve. e.g. Fast response, NGO was polite."
                    />
                    <Button type="submit" size="sm" loading={feedback.isPending}>
                      Submit Feedback
                    </Button>
                  </form>
                )}
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
