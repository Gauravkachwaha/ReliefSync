import React, { useState } from "react";
import { Inbox, MapPin, Star } from "lucide-react";
import { Card, Badge, Button, Spinner, EmptyState, ErrorState, CountdownChip } from "../../components/ui";
import { useMyVolunteerOffers, useRespondToVolunteerOffer } from "../../hooks/api/useVolunteerOffers";
import { useToast } from "../../context/ToastContext";

export default function VolunteerOffers() {
  const { data: offers, isLoading, isError, refetch } = useMyVolunteerOffers("PENDING");
  const respond = useRespondToVolunteerOffer();
  const toast = useToast();
  const [actioningId, setActioningId] = useState(null);

  const handleRespond = async (offerId, decision) => {
    setActioningId(offerId);
    try {
      const res = await respond.mutateAsync({ offerId, decision });
      if (res.success) {
        toast.success(decision === "ACCEPT" ? "Assignment accepted" : "Offer declined");
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
        <h1 className="text-2xl font-semibold">Case Offers</h1>
        <p className="text-text-secondary text-sm mt-1">Offers requiring your acceptance.</p>
      </div>

      {isLoading ? (
        <Spinner size="lg" />
      ) : isError ? (
        <ErrorState message="Couldn't load offers." onRetry={refetch} />
      ) : !offers?.length ? (
        <EmptyState icon={Inbox} title="No pending offers" message="No assignment offers found matching your profile." />
      ) : (
        <div className="flex flex-col gap-4">
          {offers.map((offer) => (
            <Card key={offer._id} className="border-l-4 border-l-primary/50">
              <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                <div>
                  <h3 className="font-bold text-base">Task Offer: {offer.complaintId?.complaintId}</h3>
                  <CountdownChip expiresAt={offer.expiresAt} />
                </div>
                <div className="flex items-center gap-2">
                  <Badge status={offer.complaintId?.category} />
                  <Badge status={offer.complaintId?.severity} />
                  <span className="flex items-center gap-1 text-accent font-bold text-sm">
                    <Star size={13} fill="currentColor" /> {offer.matchScore}%
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-surface-input px-4 py-3 text-sm italic text-text-secondary mb-3">
                "{offer.complaintId?.originalText || "No incident description available."}"
              </div>

              {offer.complaintId?.locationHint && (
                <div className="flex items-center gap-1.5 text-xs text-text-secondary mb-4">
                  <MapPin size={13} className="text-accent" /> {offer.complaintId.locationHint}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-3 border-t border-border">
                <Button variant="danger" size="sm" disabled={actioningId === offer._id} onClick={() => handleRespond(offer._id, "REJECT")}>
                  Decline
                </Button>
                <Button size="sm" loading={actioningId === offer._id} onClick={() => handleRespond(offer._id, "ACCEPT")}>
                  Accept Assignment
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
