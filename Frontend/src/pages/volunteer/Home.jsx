import React from "react";
import { CheckCircle2, Circle, MinusCircle, AlertTriangle } from "lucide-react";
import { Card, StatCard, SegmentedControl, Spinner, ErrorState } from "../../components/ui";
import { useMyProfile, useUpdateMyAvailability } from "../../hooks/api/useVolunteers";
import { useMyVolunteerOffers } from "../../hooks/api/useVolunteerOffers";
import { useMyAssignments } from "../../hooks/api/useAssignments";
import { useToast } from "../../context/ToastContext";

const AVAILABILITY_OPTIONS = [
  { value: "available", label: "Available", icon: CheckCircle2 },
  { value: "busy", label: "Busy", icon: MinusCircle },
  { value: "offline", label: "Off Duty", icon: Circle },
];

export default function VolunteerHome() {
  const { data: profile, isLoading, isError, refetch } = useMyProfile();
  const { data: offers } = useMyVolunteerOffers("PENDING");
  const { data: assignments } = useMyAssignments();
  const updateAvailability = useUpdateMyAvailability();
  const toast = useToast();

  const handleToggle = async (status) => {
    try {
      await updateAvailability.mutateAsync(status);
      toast.success("Availability updated", `You're now marked as ${status}.`);
    } catch (err) {
      toast.error("Update failed", err.message);
    }
  };

  if (isLoading) return <Spinner size="lg" />;
  if (isError || !profile) {
    return (
      <ErrorState
        title="Profile not linked"
        message="We couldn't link your login to a volunteer profile. Contact your NGO admin."
        onRetry={refetch}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-up">
      <div>
        <h1 className="text-2xl font-semibold">Welcome back, {profile.name?.split(" ")[0]}</h1>
        <p className="text-text-secondary text-sm mt-1">Field Relief Responder</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-5">
        <StatCard label="Pending Offers" value={offers?.length ?? 0} icon={AlertTriangle} tone="warning" />
        <StatCard label="Active Tasks" value={assignments?.filter((a) => a.status !== "completed").length ?? 0} icon={CheckCircle2} tone="success" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card title="Profile">
          <div className="flex flex-col gap-3 text-sm">
            <Row label="Reliability Score" value={`${profile.reliabilityScore}/100`} />
            <Row label="Location" value={profile.location} />
            <Row label="Skills" value={profile.skills?.map((s) => s.replace(/_/g, " ")).join(", ") || "—"} />
          </div>
        </Card>

        <Card title="Availability Switch" subtitle="Open to receive new incident dispatches.">
          <SegmentedControl value={profile.availability} onChange={handleToggle} options={AVAILABILITY_OPTIONS} />
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between border-b border-border pb-2.5">
      <span className="text-text-secondary">{label}</span>
      <span className="font-semibold text-right">{value}</span>
    </div>
  );
}
