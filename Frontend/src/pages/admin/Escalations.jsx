import React, { useState } from "react";
import { Siren, CheckCircle } from "lucide-react";
import { Card, Badge, Button, Tabs, Spinner, EmptyState, ErrorState, Modal, FieldGroup, Textarea } from "../../components/ui";
import { useEscalations, useResolveEscalation } from "../../hooks/api/useSuperAdmin";
import { useToast } from "../../context/ToastContext";

const TABS = [
  { value: "OPEN", label: "Open" },
  { value: "RESOLVED", label: "Resolved" },
];

const fmt = (d) => (d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "");

export default function Escalations() {
  const [status, setStatus] = useState("OPEN");
  const { data: escalations, isLoading, isError, refetch } = useEscalations(status);
  const resolve = useResolveEscalation();
  const toast = useToast();
  const [target, setTarget] = useState(null);
  const [note, setNote] = useState("");

  const handleResolve = async (e) => {
    e.preventDefault();
    try {
      const res = await resolve.mutateAsync({ escalationId: target._id, resolvedNote: note });
      if (res.success) {
        toast.success("Escalation resolved");
        setTarget(null);
        setNote("");
      }
    } catch (err) {
      toast.error("Resolution failed", err.message);
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-up">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">Active Escalations</h1>
          <p className="text-text-secondary text-sm mt-1">Cases that could not be resolved by automated routing.</p>
        </div>
        <Tabs value={status} onChange={setStatus} options={TABS} />
      </div>

      {isLoading ? (
        <Spinner size="lg" />
      ) : isError ? (
        <ErrorState message="Couldn't load escalations." onRetry={refetch} />
      ) : !escalations?.length ? (
        <EmptyState icon={status === "OPEN" ? Siren : CheckCircle} title={status === "OPEN" ? "No Active Escalations" : "No Resolved Escalations"} />
      ) : (
        <div className="flex flex-col gap-4">
          {escalations.map((esc) => (
            <Card key={esc._id} className="border-l-4 border-l-danger/50">
              <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                <div>
                  <h4 className="font-bold text-sm">Escalation Alert: {esc.complaintId?.complaintId || "Case alert"}</h4>
                  <p className="text-[11px] text-text-dim mt-0.5">Triggered {fmt(esc.createdAt)}</p>
                </div>
                <div className="flex gap-1.5">
                  <Badge status={esc.priority || "HIGH"} />
                  <Badge status={esc.reason} tone="medium" />
                </div>
              </div>

              <div className="rounded-xl border border-border bg-surface-input px-4 py-3 text-sm text-text-secondary mb-2">
                {esc.message}
              </div>
              {esc.complaintId?.originalText && (
                <p className="text-xs italic text-text-dim mb-2">"{esc.complaintId.originalText}"</p>
              )}
              {esc.complaintId?.locationHint && (
                <p className="text-xs text-text-dim mb-3">{esc.complaintId.locationHint}</p>
              )}

              {esc.status !== "RESOLVED" ? (
                <div className="flex justify-end pt-3 border-t border-border">
                  <Button size="sm" onClick={() => setTarget(esc)}>Resolve Escalation</Button>
                </div>
              ) : (
                esc.resolvedNote && (
                  <div className="text-xs text-text-dim border-t border-border pt-3">
                    Resolution: {esc.resolvedNote}
                  </div>
                )
              )}
            </Card>
          ))}
        </div>
      )}

      <Modal isOpen={!!target} onClose={() => setTarget(null)} title="Resolve Escalation">
        <form onSubmit={handleResolve} className="flex flex-col gap-4">
          <FieldGroup label="Escalation ID">
            <input readOnly className="w-full rounded-lg border border-border bg-surface-input px-3.5 py-2.5 text-sm text-text-dim" value={target?._id || ""} />
          </FieldGroup>
          <FieldGroup label="Resolution Action Log Note" hint="Required — describe how this was handled.">
            <Textarea required rows={4} value={note} onChange={(e) => setNote(e.target.value)} />
          </FieldGroup>
          <Button type="submit" full loading={resolve.isPending}>Save Resolution</Button>
        </form>
      </Modal>
    </div>
  );
}
