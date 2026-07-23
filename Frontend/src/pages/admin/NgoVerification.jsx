import React, { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Card, Badge, Button, Tabs, Spinner, EmptyState, ErrorState, ConfirmDialog } from "../../components/ui";
import { useNgoQueue, useUpdateNgoVerification } from "../../hooks/api/useSuperAdmin";
import { useToast } from "../../context/ToastContext";

const TABS = [
  { value: "PENDING", label: "Pending" },
  { value: "VERIFIED", label: "Verified" },
  { value: "REJECTED", label: "Rejected" },
];

export default function NgoVerification() {
  const [status, setStatus] = useState("PENDING");
  const { data: ngos, isLoading, isError, refetch } = useNgoQueue(status);
  const updateVerification = useUpdateNgoVerification();
  const toast = useToast();
  const [confirm, setConfirm] = useState(null); // { ngoId, decision }

  const handleConfirm = async () => {
    try {
      const res = await updateVerification.mutateAsync({
        ngoId: confirm.ngoId,
        verificationStatus: confirm.decision,
      });
      if (res.success) toast.success(`NGO marked ${confirm.decision}`);
    } catch (err) {
      toast.error("Action failed", err.message);
    } finally {
      setConfirm(null);
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-up">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">NGO Verification</h1>
          <p className="text-text-secondary text-sm mt-1">Approve or reject organizations requesting network access.</p>
        </div>
        <Tabs value={status} onChange={setStatus} options={TABS} />
      </div>

      {isLoading ? (
        <Spinner size="lg" />
      ) : isError ? (
        <ErrorState message="Couldn't load NGOs." onRetry={refetch} />
      ) : !ngos?.length ? (
        <EmptyState icon={ShieldCheck} title="All Clear" message={`No NGOs with status ${status.toLowerCase()}.`} />
      ) : (
        <div className="flex flex-col gap-4">
          {ngos.map((ngo) => (
            <Card key={ngo._id}>
              <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                <div>
                  <h4 className="font-bold text-base">{ngo.name}</h4>
                  <p className="text-[11px] text-text-dim mt-0.5">{ngo.email} · {ngo.phone}</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {ngo.supportedCategories?.map((c, i) => <Badge key={i} status={c} tone="medium" />)}
                </div>
              </div>

              <div className="grid sm:grid-cols-3 gap-3 mb-4 text-xs">
                <div className="rounded-lg bg-surface-input border border-border px-3 py-2">
                  <div className="text-text-dim font-bold uppercase text-[9px] mb-1">Service Areas</div>
                  {ngo.serviceAreas?.join(", ") || "General dispatch area"}
                </div>
                <div className="rounded-lg bg-surface-input border border-border px-3 py-2">
                  <div className="text-text-dim font-bold uppercase text-[9px] mb-1">Capacity</div>
                  {ngo.capacityConfig?.maxConcurrentCases || 10} concurrent cases
                </div>
                <div className="rounded-lg bg-surface-input border border-border px-3 py-2">
                  <div className="text-text-dim font-bold uppercase text-[9px] mb-1">Response SLA</div>
                  {ngo.responseSlaMinutes || 60} minutes
                </div>
              </div>

              {status === "PENDING" && (
                <div className="flex justify-end gap-3 pt-3 border-t border-border">
                  <Button variant="danger" size="sm" onClick={() => setConfirm({ ngoId: ngo._id, decision: "REJECTED" })}>
                    Reject Registration
                  </Button>
                  <Button size="sm" onClick={() => setConfirm({ ngoId: ngo._id, decision: "VERIFIED" })}>
                    Verify NGO
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        isOpen={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={handleConfirm}
        title={confirm?.decision === "VERIFIED" ? "Verify this NGO?" : "Reject this NGO?"}
        message="This decision affects whether the organization can receive auto-routed cases."
        confirmLabel={confirm?.decision === "VERIFIED" ? "Verify" : "Reject"}
        danger={confirm?.decision === "REJECTED"}
        loading={updateVerification.isPending}
      />
    </div>
  );
}
