import React, { useState } from "react";
import { ClipboardList, MapPin, Send } from "lucide-react";
import { Card, Badge, Button, Spinner, EmptyState, ErrorState, Select, Input } from "../../components/ui";
import { useMyAssignments, useUpdateMyAssignmentProgress } from "../../hooks/api/useAssignments";
import { useToast } from "../../context/ToastContext";

export default function VolunteerTasks() {
  const { data: assignments, isLoading, isError, refetch } = useMyAssignments();

  return (
    <div className="flex flex-col gap-6 animate-fade-up">
      <div>
        <h1 className="text-2xl font-semibold">Active Tasks &amp; Field Logs</h1>
        <p className="text-text-secondary text-sm mt-1">Review assignments and submit progress updates.</p>
      </div>

      {isLoading ? (
        <Spinner size="lg" />
      ) : isError ? (
        <ErrorState message="Couldn't load your assignments." onRetry={refetch} />
      ) : !assignments?.length ? (
        <EmptyState icon={ClipboardList} title="No active tasks" message="You have no active task assignments at this moment." />
      ) : (
        <div className="flex flex-col gap-4">
          {assignments.map((a) => (
            <AssignmentCard key={a._id} assignment={a} />
          ))}
        </div>
      )}
    </div>
  );
}

// Owns its own progress-draft state — each card is independent (fixes the
// shared-state bug where every card's form used to read/write one variable).
function AssignmentCard({ assignment: a }) {
  const [status, setStatus] = useState("in_progress");
  const [notes, setNotes] = useState("");
  const updateProgress = useUpdateMyAssignmentProgress();
  const toast = useToast();

  const title =
    a.complaintId?.aiExtractedData?.summary || a.needId?.title || "Relief Assignment";

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!notes.trim()) {
      toast.warning("Add a note", "Describe your progress before submitting.");
      return;
    }
    try {
      const res = await updateProgress.mutateAsync({ assignmentId: a._id, status, notes });
      if (res.success) {
        toast.success("Progress logged");
        setNotes("");
      }
    } catch (err) {
      toast.error("Submission failed", err.message);
    }
  };

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
        <div>
          <h4 className="font-bold text-sm">{title}</h4>
          <p className="text-[11px] text-text-dim mt-0.5">Assigned {new Date(a.createdAt).toLocaleDateString()}</p>
        </div>
        <Badge status={a.status} />
      </div>

      {a.complaintId?.locationHint && (
        <div className="flex items-center gap-1.5 text-xs text-text-secondary mb-2">
          <MapPin size={13} className="text-accent" /> {a.complaintId.locationHint}
        </div>
      )}
      {a.complaintId?.originalText && (
        <p className="text-xs text-text-dim italic mb-3">"{a.complaintId.originalText}"</p>
      )}

      {a.progressUpdates?.length > 0 && (
        <div className="flex flex-col gap-2 mb-3 border-t border-border pt-3">
          <span className="text-[10px] font-bold uppercase text-text-dim">Progress Logs</span>
          {a.progressUpdates.map((p, i) => (
            <div key={i} className="flex items-start gap-2 text-xs">
              <Badge status={p.status} />
              <span className="text-text-secondary flex-1">{p.message}</span>
              <span className="text-text-dim">{new Date(p.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
            </div>
          ))}
        </div>
      )}

      {a.status !== "completed" && (
        <form onSubmit={handleSubmit} className="flex gap-2 pt-3 border-t border-border">
          <div className="w-40 shrink-0">
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </Select>
          </div>
          <div className="flex-1 min-w-0">
            <Input placeholder="Field progress note…" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <Button size="icon" variant="secondary" type="submit" loading={updateProgress.isPending}>
            <Send size={15} />
          </Button>
        </form>
      )}
    </Card>
  );
}
