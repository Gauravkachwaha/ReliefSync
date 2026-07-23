import React from "react";
import { Bot, Bell } from "lucide-react";
import { Card, Badge, Spinner, EmptyState, ErrorState } from "../../components/ui";
import { useAuditLogs } from "../../hooks/api/useSuperAdmin";

const fmt = (d) => (d ? new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "");

export default function AuditLogs() {
  const { data, isLoading, isError, refetch } = useAuditLogs();

  if (isLoading) return <Spinner size="lg" />;
  if (isError) return <ErrorState message="Couldn't load audit logs." onRetry={refetch} />;

  const { agentRuns = [], notifications = [] } = data || {};

  return (
    <div className="flex flex-col gap-6 animate-fade-up">
      <div>
        <h1 className="text-2xl font-extrabold">Agentic Audit Logs</h1>
        <p className="text-text-secondary text-sm mt-1">AI agent activity and notification delivery trail.</p>
      </div>

      <div className="grid lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7">
          <Card title="Agent Runs">
            {agentRuns.length === 0 ? (
              <EmptyState icon={Bot} title="No agent actions recorded yet." />
            ) : (
              <div className="flex flex-col gap-3">
                {agentRuns.map((run) => (
                  <div key={run._id} className="rounded-xl border border-border bg-surface-input p-4">
                    <div className="flex justify-between items-start mb-1.5">
                      <div>
                        <h5 className="font-bold text-sm">{run.agentType}</h5>
                        <p className="text-[11px] text-text-dim">{run.complaintId?.complaintId} · {fmt(run.createdAt)}</p>
                      </div>
                      <Badge status={run.status === "SUCCESS" ? "COMPLETED" : "CANCELLED"} label={run.status} />
                    </div>
                    {run.decisionSummary && <p className="text-xs italic text-text-secondary mb-2">"{run.decisionSummary}"</p>}
                    {run.toolCalls?.length > 0 && (
                      <div className="flex flex-col gap-1.5 border-t border-border pt-2 mt-2">
                        {run.toolCalls.map((tc, i) => (
                          <div key={i} className="text-[10px] font-mono text-text-dim">
                            <span className="text-accent">{tc.toolName}()</span>{" "}
                            args={JSON.stringify(tc.args)} → {JSON.stringify(tc.result)}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="lg:col-span-5">
          <Card title="Delivery Notifications">
            {notifications.length === 0 ? (
              <EmptyState icon={Bell} title="No dispatch notification logs found." />
            ) : (
              <div className="flex flex-col gap-3">
                {notifications.map((n) => (
                  <div key={n._id} className="rounded-xl border border-border bg-surface-input p-4">
                    <div className="flex justify-between items-start mb-1.5">
                      <h5 className="font-bold text-sm">{n.subject}</h5>
                      <Badge status={n.recipientType} tone="medium" />
                    </div>
                    <p className="text-xs text-text-secondary italic mb-2">"{n.message}"</p>
                    <p className="text-[10px] text-text-dim">
                      Status: {n.status} · Channel: {n.channel} · {fmt(n.createdAt)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
