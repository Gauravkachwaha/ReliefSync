import React from "react";
import { ClipboardCheck } from "lucide-react";
import { Card, Badge, Spinner, EmptyState, ErrorState } from "../../components/ui";
import { useAssignments } from "../../hooks/api/useAssignments";

const fmt = (d) => (d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "");

export default function Assignments() {
  const { data: assignments, isLoading, isError, refetch } = useAssignments();

  return (
    <div className="flex flex-col gap-6 animate-fade-up">
      <div>
        <h1 className="text-2xl font-semibold">Task Allocations</h1>
        <p className="text-text-secondary text-sm mt-1">Assigned volunteers and field progress.</p>
      </div>

      {isLoading ? (
        <Spinner size="lg" />
      ) : isError ? (
        <ErrorState message="Couldn't load assignments." onRetry={refetch} />
      ) : !assignments?.length ? (
        <EmptyState icon={ClipboardCheck} title="No active allocations" message="No volunteer allocations found." />
      ) : (
        <div className="flex flex-col gap-4">
          {assignments.map((a) => (
            <Card key={a._id}>
              <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                <div>
                  <h4 className="font-bold text-sm">{a.needId?.title || "Relief Assignment"}</h4>
                  <p className="text-[11px] text-text-dim mt-0.5">
                    {a.volunteerId?.name} · {a.volunteerId?.email} · {fmt(a.createdAt)}
                  </p>
                </div>
                <Badge status={a.status} />
              </div>
              {a.needId?.extractedData?.summary && (
                <p className="text-xs text-text-secondary italic mb-2">"{a.needId.extractedData.summary}"</p>
              )}
              {a.notes && (
                <p className="text-xs text-text-dim bg-black/5 rounded-lg px-3 py-2 mb-2">{a.notes}</p>
              )}
              {a.status !== "completed" && (
                <p className="text-[11px] text-text-dim pt-2 border-t border-border">
                  Awaiting the volunteer to confirm completion from their own app.
                </p>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
