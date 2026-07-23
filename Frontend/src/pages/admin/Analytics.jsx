import React from "react";
import { useNavigate } from "react-router-dom";
import { FileWarning, Activity, CheckCircle2, ShieldAlert } from "lucide-react";
import { StatCard, Card, Spinner, ErrorState, Button } from "../../components/ui";
import { useAnalytics } from "../../hooks/api/useSuperAdmin";

export default function Analytics() {
  const { data, isLoading, isError, refetch } = useAnalytics();
  const navigate = useNavigate();

  const spamRate = data?.totalComplaints ? Math.round((data.spamCount / data.totalComplaints) * 100) : 0;
  const pendingNgos = data ? data.totalNgos - data.verifiedNgos : 0;

  return (
    <div className="flex flex-col gap-8 animate-fade-up">
      <div>
        <h1 className="text-2xl font-semibold">Analytics</h1>
        <p className="text-text-secondary text-sm mt-1">Platform-wide compliance and emergency routing overview.</p>
      </div>

      {isLoading ? (
        <Spinner size="lg" />
      ) : isError ? (
        <ErrorState message="Couldn't load analytics." onRetry={refetch} />
      ) : (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <StatCard label="Total Complaints" value={data?.totalComplaints ?? 0} icon={FileWarning} tone="primary" />
            <StatCard label="Active Emergency Cases" value={data?.activeCases ?? 0} icon={Activity} tone="warning" />
            <StatCard label="Resolved Complaints" value={data?.resolvedCases ?? 0} icon={CheckCircle2} tone="success" />
            <StatCard label="Spam Filtered Rate" value={`${spamRate}%`} icon={ShieldAlert} tone="danger" />
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <Card title="NGO Network Statistics">
              <div className="flex flex-col divide-y divide-border">
                <Row label="Total NGOs Registered" value={data?.totalNgos ?? 0} />
                <Row label="Verified Response NGOs" value={data?.verifiedNgos ?? 0} />
                <Row label="Pending Verification" value={pendingNgos} />
                <Row label="Total Field Responders" value={data?.totalVolunteers ?? 0} />
              </div>
            </Card>
            <Card title="Quick Ingestion Links">
              <div className="flex gap-3">
                <Button variant="secondary" onClick={() => navigate("/admin/ngos")}>Review NGOs →</Button>
                <Button onClick={() => navigate("/admin/spam")}>Spam Queue →</Button>
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
    <div className="flex justify-between py-2.5 text-sm">
      <span className="text-text-secondary">{label}</span>
      <span className="font-bold">{value}</span>
    </div>
  );
}
