import React, { useState } from "react";
import { Inbox, MapPin, Users } from "lucide-react";
import { Card, Badge, Button, Spinner, EmptyState, ErrorState, CountdownChip } from "../../components/ui";
import { useCaseOffers, useRespondToCaseOffer } from "../../hooks/api/useCaseOffers";
import { useToast } from "../../context/ToastContext";

export default function CaseOffers() {
  const { data: offers, isLoading, isError, refetch } = useCaseOffers("PENDING");
  const respond = useRespondToCaseOffer();
  const toast = useToast();
  const [actioningId, setActioningId] = useState(null);

  const handleRespond = async (offerId, decision) => {
    setActioningId(offerId);
    try {
      const res = await respond.mutateAsync({ offerId, decision });
      if (res.success) {
        toast.success(
          decision === "ACCEPT" ? "Case claimed" : "Case rejected",
          decision === "ACCEPT" ? "Volunteer matching will begin shortly." : undefined
        );
      }
    } catch (err) {
      toast.error("Action failed", err.message);
    } finally {
      setActioningId(null);
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-up">
      <div>
        <h1 className="text-2xl font-semibold">Incoming Incident Offers</h1>
        <p className="text-text-secondary text-sm mt-1">
          Complaints triaged by AI and dispatched according to your capabilities and area.
        </p>
      </div>

      {isLoading ? (
        <Spinner size="lg" />
      ) : isError ? (
        <ErrorState message="Couldn't load case offers." onRetry={refetch} />
      ) : offers.length === 0 ? (
        <EmptyState icon={Inbox} title="Queue is Empty" message="No pending emergency case offers at this moment." />
      ) : (
        <div className="flex flex-col gap-4">
          {offers.map((offer) => (
            <Card key={offer._id} className="border-l-4 border-l-danger/50">
              <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                <div>
                  <h3 className="font-bold text-base">Incident Alert: {offer.complaintId?.complaintId}</h3>
                  <CountdownChip expiresAt={offer.expiresAt} />
                </div>
                <div className="flex gap-1.5">
                  <Badge status={offer.complaintId?.category} />
                  <Badge status={offer.complaintId?.severity} />
                </div>
              </div>

              <div className="rounded-xl border border-border bg-surface-input px-4 py-3 text-sm italic text-text-secondary mb-3">
                "{offer.complaintId?.originalText}"
              </div>

              <div className="flex items-center gap-5 text-xs text-text-secondary mb-4">
                {offer.complaintId?.locationHint && (
                  <span className="flex items-center gap-1"><MapPin size={13} className="text-accent" /> {offer.complaintId.locationHint}</span>
                )}
                <span className="flex items-center gap-1"><Users size={13} className="text-accent" /> Required Staff: {offer.complaintId?.requiredPeople || 1}</span>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-border">
                <Button
                  variant="danger"
                  size="sm"
                  disabled={actioningId === offer._id}
                  onClick={() => handleRespond(offer._id, "REJECT")}
                >
                  Reject
                </Button>
                <Button
                  size="sm"
                  loading={actioningId === offer._id}
                  onClick={() => handleRespond(offer._id, "ACCEPT")}
                >
                  Claim & Match Volunteers
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
