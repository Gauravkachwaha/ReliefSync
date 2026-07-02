import complaintRepository from "../repositories/complaintRepository.js";
import ngoRepository from "../repositories/ngoRepository.js";
import ngoCaseOfferRepository from "../repositories/ngoCaseOfferRepository.js";
import agentLogService from "./agentLogService.js";
import emailService from "./emailService.js";

const MAX_NGO_OFFERS = 5;

class NgoRoutingService {
  normalizeLocation(value = "") {
    return String(value)
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  getLocationMatch(locationHint, serviceAreas = []) {
    const normalizedLocation = this.normalizeLocation(locationHint);

    if (!normalizedLocation || !Array.isArray(serviceAreas)) {
      return {
        matches: false,
        score: 0,
        reason: "",
      };
    }

    for (const serviceArea of serviceAreas) {
      const normalizedArea = this.normalizeLocation(serviceArea);

      if (!normalizedArea) {
        continue;
      }

      if (
        normalizedLocation.includes(normalizedArea) ||
        normalizedArea.includes(normalizedLocation)
      ) {
        return {
          matches: true,
          score: 35,
          reason: `Service area match: ${serviceArea}`,
        };
      }
    }

    return {
      matches: false,
      score: 0,
      reason: "",
    };
  }

  calculateScore(ngo, activeCases, locationMatch) {
    const maxCases = ngo.capacityConfig?.maxConcurrentCases || 10;

    const remainingCapacity = Math.max(0, maxCases - activeCases);

    const capacityScore = Math.min(
      10,
      Math.round((remainingCapacity / maxCases) * 10),
    );

    const slaMinutes = ngo.responseSlaMinutes || 60;

    const responseScore = slaMinutes <= 15 ? 5 : slaMinutes <= 30 ? 3 : 1;

    return 50 + locationMatch.score + capacityScore + responseScore;
  }

  async routeComplaint(complaint) {
    // I am preventing duplicate offers if routing is retried.
    const existingOffers = await ngoCaseOfferRepository.findByComplaintId(
      complaint._id,
    );

    if (existingOffers.length > 0) {
      return {
        routed: true,
        complaint,
        offers: existingOffers,
      };
    }

    // A complaint without category or location should not be auto-routed.
    if (!complaint.category || !complaint.locationHint) {
      return {
        routed: false,
        complaint,
        offers: [],
      };
    }

    const verifiedNgos = await ngoRepository.findByVerificationStatus("VERIFIED");

    const rankedCandidates = [];

    for (const ngo of verifiedNgos) {
      const activeCases =
        await complaintRepository.countActiveAcceptedCasesByNgoId(ngo._id);

      const maxCases = ngo.capacityConfig?.maxConcurrentCases || 10;

      const locationMatch = this.getLocationMatch(
        complaint.locationHint,
        ngo.serviceAreas,
      );

      const matchScore = this.calculateScore(ngo, activeCases, locationMatch);

      rankedCandidates.push({
        ngo,
        activeCases,
        matchScore,
        matchReasons: [
          `Category match: ${complaint.category}`,
          locationMatch.reason,
          `Capacity available: ${maxCases - activeCases}/${maxCases}`,
          `Response SLA: ${ngo.responseSlaMinutes || 60} minutes`,
        ],
      });
    }

    rankedCandidates.sort((first, second) => {
      return second.matchScore - first.matchScore;
    });

    const selectedCandidates = rankedCandidates;

    // No NGO is marked as accepted when no suitable verified NGO exists.
    if (selectedCandidates.length === 0) {
      return {
        routed: false,
        complaint,
        offers: [],
      };
    }

    const offers = [];

    for (const candidate of selectedCandidates) {
      const expiryMinutes = candidate.ngo.responseSlaMinutes || 60;

      const offer = await ngoCaseOfferRepository.create({
        complaintId: complaint._id,
        ngoId: candidate.ngo._id,
        matchScore: candidate.matchScore,
        matchReasons: candidate.matchReasons,
        expiresAt: new Date(Date.now() + expiryMinutes * 60 * 1000),
      });

      offers.push(offer);

      // Send email alert to NGO admin
      if (candidate.ngo.email) {
        emailService.sendIncidentOfferAlert(candidate.ngo.email, complaint).catch((err) => {
          console.error(`❌ Background email to NGO ${candidate.ngo.email} failed:`, err.message);
        });
      }
    }

    const updatedComplaint = await complaintRepository.updateById(
      complaint._id,
      {
        candidateNgoIds: selectedCandidates.map(
          (candidate) => candidate.ngo._id,
        ),
        status: "NGOS_NOTIFIED",
      },
    );

    await agentLogService.logRun({
      complaintId: updatedComplaint._id,
      agentType: "NGO Routing Agent",
      toolCalls: [
        {
          toolName: "getRelevantNgoKnowledge",
          args: { category: updatedComplaint.category, location: updatedComplaint.locationHint },
          result: { retrievedDocs: ["ngo_sop_emergency_routing"] }
        },
        {
          toolName: "findCandidateNGOs",
          args: { category: updatedComplaint.category, location: updatedComplaint.locationHint },
          result: selectedCandidates.map(c => ({ ngoId: c.ngo._id, name: c.ngo.name, matchScore: c.matchScore }))
        },
        {
          toolName: "createNgoNotifications",
          args: { complaintId: updatedComplaint._id, ngoIds: selectedCandidates.map(c => c.ngo._id) },
          result: { notificationsCreated: offers.length }
        }
      ],
      decisionSummary: `Routed complaint to ${offers.length} verified NGOs based on category and service area matching.`,
      retrievedDocumentIds: ["ngo_sop_emergency_routing"],
      status: "SUCCESS"
    });

    console.log(
      `✅ Complaint ${complaint.complaintId} routed to ${offers.length} verified NGO(s)`,
    );

    return {
      routed: true,
      complaint: updatedComplaint,
      offers,
    };
  }
}

export default new NgoRoutingService();
