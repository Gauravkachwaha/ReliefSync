import React from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Compass, Users, CheckCircle2 } from "lucide-react";
import { StatCard, Card, Spinner, ErrorState, Button } from "../../components/ui";
import { useOverview } from "../../hooks/api/useDashboard";

export default function Overview() {
  const { data: stats, isLoading, isError, refetch } = useOverview();
  const navigate = useNavigate();

  return (
    <div className="flex flex-col gap-8 animate-fade-up">
      <div>
        <h1 className="text-2xl font-semibold">Overview Dashboard</h1>
        <p className="text-text-secondary text-sm mt-1">Real-time stats and dispatch activity monitoring.</p>
      </div>

      {isLoading ? (
        <Spinner size="lg" />
      ) : isError ? (
        <ErrorState message="Couldn't load your overview stats." onRetry={refetch} />
      ) : (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <StatCard label="Active Claims (Needs)" value={stats?.totalNeeds ?? 0} icon={AlertTriangle} tone="warning" />
            <StatCard label="Active Assignments" value={stats?.activeAssignments ?? 0} icon={Compass} tone="primary" />
            <StatCard label="Available Personnel" value={stats?.availableVolunteers ?? 0} icon={Users} tone="accent" />
            <StatCard label="Completion Rate" value={`${stats?.completionRate ?? 0}%`} icon={CheckCircle2} tone="success" />
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <Card title="Operational Performance">
              <div className="flex flex-col divide-y divide-border">
                <Row label="Total Incidents Claimed" value={stats?.totalNeeds ?? 0} />
                <Row label="Active Field Operations" value={stats?.activeAssignments ?? 0} />
                <Row label="Resolved Assignments" value={stats?.completedAssignments ?? 0} />
                <Row label="Total Roster Volunteers" value={stats?.totalVolunteers ?? 0} />
              </div>
            </Card>
            <Card title="Quick Resources Link" subtitle="Jump straight into operational areas.">
              <div className="flex gap-3">
                <Button variant="secondary" onClick={() => navigate("/ngo/case-offers")}>
                  Accept Case Offers →
                </Button>
                <Button onClick={() => navigate("/ngo/needs")}>Match Volunteers →</Button>
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between py-2.5 text-sm">
      <span className="text-text-secondary">{label}</span>
      <span className="font-bold">{value}</span>
    </div>
  );
}
