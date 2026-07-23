import React, { useState } from "react";
import { ShieldAlert, CheckCircle } from "lucide-react";
import { Card, Badge, Button, Spinner, EmptyState, ErrorState } from "../../components/ui";
import { useSpamQueue, useResolveSpam } from "../../hooks/api/useSuperAdmin";
import { useToast } from "../../context/ToastContext";

const fmt = (d) => (d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "");

export default function SpamQueue() {
  const { data: complaints, isLoading, isError, refetch } = useSpamQueue();
  const resolve = useResolveSpam();
  const toast = useToast();
  const [actioningId, setActioningId] = useState(null);

  const handleResolve = async (complaintId, decision) => {
    setActioningId(complaintId);
    try {
      const res = await resolve.mutateAsync({ complaintId, decision });
      if (res.success) toast.success(`Complaint marked ${decision}`);
    } catch (err) {
      toast.error("Action failed", err.message);
    } finally {
      setActioningId(null);
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-up">
      <div>
        <h1 className="text-2xl font-extrabold">Spam Review Queue</h1>
        <p className="text-text-secondary text-sm mt-1">Complaints flagged for manual review before routing.</p>
      </div>

      {isLoading ? (
        <Spinner size="lg" />
      ) : isError ? (
        <ErrorState message="Couldn't load the spam queue." onRetry={refetch} />
      ) : !complaints?.length ? (
        <EmptyState icon={CheckCircle} title="Spam Queue Empty" message="No complaints currently need manual review." />
      ) : (
        <div className="flex flex-col gap-4">
          {complaints.map((c) => (
            <Card key={c._id} className="border-l-4 border-l-warning/50">
              <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                <div>
                  <h4 className="font-bold text-sm">Flagged Report: {c.complaintId}</h4>
                  <p className="text-[11px] text-text-dim mt-0.5">Submitted {fmt(c.createdAt)}</p>
                </div>
                <span className="text-sm font-bold text-warning">
                  ML Spam Score: {Math.round((c.spamScore || 0) * 100)}%
                </span>
              </div>

              {c.spamRuleFlags?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {c.spamRuleFlags.map((f, i) => <Badge key={i} status="CRITICAL" label={f} />)}
                </div>
              )}

              <div className="rounded-xl border border-border bg-surface-input px-4 py-3 text-sm italic text-text-secondary mb-2">
                "{c.originalText}"
              </div>
              {c.locationHint && <p className="text-xs text-text-dim mb-3">{c.locationHint}</p>}

              <div className="flex justify-end gap-3 pt-3 border-t border-border">
                <Button variant="danger" size="sm" disabled={actioningId === c._id} onClick={() => handleResolve(c._id, "BLOCK")}>
                  Block (Spam)
                </Button>
                <Button variant="success" size="sm" loading={actioningId === c._id} onClick={() => handleResolve(c._id, "ALLOW")}>
                  Allow (Triage &amp; Route)
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
