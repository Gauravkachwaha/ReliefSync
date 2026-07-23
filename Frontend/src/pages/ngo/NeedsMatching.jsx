import React, { useState } from "react";
import { Compass, Users, Star } from "lucide-react";
import { Card, Badge, Button, Spinner, EmptyState, ErrorState } from "../../components/ui";
import { useNeeds, useRecommendations } from "../../hooks/api/useNeeds";
import { useCreateAssignment } from "../../hooks/api/useAssignments";
import { useToast } from "../../context/ToastContext";

export default function NeedsMatching() {
  const { data: needs, isLoading, isError, refetch } = useNeeds();
  const [selected, setSelected] = useState(null);
  const { data: recs, isLoading: recsLoading, isError: recsError } = useRecommendations(selected?._id);
  const createAssignment = useCreateAssignment();
  const toast = useToast();
  const [assigningId, setAssigningId] = useState(null);

  const activeNeeds = (needs || []).filter((n) => !["completed", "resolved"].includes(n.status));

  const handleAssign = async (volunteerId) => {
    setAssigningId(volunteerId);
    try {
      const res = await createAssignment.mutateAsync({ needId: selected._id, volunteerId });
      if (res.success) {
        toast.success("Volunteer assigned", "Task allocation created.");
        setSelected(null);
      }
    } catch (err) {
      toast.error("Assignment failed", err.message);
    } finally {
      setAssigningId(null);
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-up">
      <div>
        <h1 className="text-2xl font-extrabold">Needs & Matching</h1>
        <p className="text-text-secondary text-sm mt-1">Select an accepted complaint to match volunteers.</p>
      </div>

      <div className="grid lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 flex flex-col gap-3">
          {isLoading ? (
            <Spinner size="lg" />
          ) : isError ? (
            <ErrorState message="Couldn't load needs." onRetry={refetch} />
          ) : activeNeeds.length === 0 ? (
            <EmptyState title="All Clear" message="No pending needs require assignments." />
          ) : (
            activeNeeds.map((need) => (
              <Card
                key={need._id}
                hover
                onClick={() => setSelected(need)}
                className={selected?._id === need._id ? "border-l-4 border-l-primary" : ""}
              >
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-bold text-sm">{need.title}</h4>
                  <Badge status={need.priority} />
                </div>
                <p className="text-xs text-text-secondary line-clamp-2 mb-2">{need.extractedData?.summary}</p>
                <div className="flex flex-wrap gap-1.5 text-[10px] text-text-dim">
                  {need.extractedData?.requiredSkills?.map((s, i) => (
                    <span key={i} className="bg-white/5 px-1.5 py-0.5 rounded border border-border">{s}</span>
                  ))}
                </div>
              </Card>
            ))
          )}
        </div>

        <div className="lg:col-span-7">
          {!selected ? (
            <div className="glass border-dashed h-full flex flex-col items-center justify-center text-center py-16 px-6">
              <Compass className="text-text-dim opacity-40 mb-4" size={40} />
              <h3 className="font-semibold text-text-secondary mb-1">Triage Engine Idle</h3>
              <p className="text-text-dim text-sm">Select a need from the left column to run AI matching recommendations.</p>
            </div>
          ) : (
            <Card title={selected.title} subtitle={selected.extractedData?.summary}>
              {recsLoading ? (
                <Spinner size="lg" />
              ) : recsError ? (
                <ErrorState message="Couldn't fetch recommendations." />
              ) : !recs?.recommendations?.length ? (
                <EmptyState icon={Users} title="No matches" message="No active, available volunteers matched this need." />
              ) : (
                <div className="flex flex-col gap-3">
                  {recs.recommendations.map((rec) => {
                    const v = rec.volunteer;
                    return (
                      <div key={v._id} className="rounded-xl border border-border bg-surface-input p-4">
                        <div className="flex justify-between items-start mb-1.5">
                          <div>
                            <h5 className="font-bold text-sm">{v.name}</h5>
                            <span className="text-[11px] text-text-dim">{v.email} · {v.phone}</span>
                          </div>
                          <span className="flex items-center gap-1 text-accent font-bold text-sm">
                            <Star size={13} fill="currentColor" /> {rec.matchScore} pts
                          </span>
                        </div>
                        {v.skills?.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-2">
                            {v.skills.map((s, i) => (
                              <span key={i} className="bg-white/5 px-1.5 py-0.5 rounded border border-border text-[10px] text-text-dim">{s}</span>
                            ))}
                          </div>
                        )}
                        <p className="text-[11px] text-text-dim mb-2">{rec.matchedSkillsCount} matched skill(s) · {v.location}</p>
                        <div className="flex justify-end">
                          <Button size="sm" loading={assigningId === v._id} onClick={() => handleAssign(v._id)}>
                            Assign Task
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
