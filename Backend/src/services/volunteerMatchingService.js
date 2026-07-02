import complaintRepository from "../repositories/complaintRepository.js";
import volunteerRepository from "../repositories/volunteerRepository.js";
import volunteerOfferRepository from "../repositories/volunteerOfferRepository.js";
import agentLogService from "./agentLogService.js";
import emailService from "./emailService.js";

const MAX_PENDING_VOLUNTEER_OFFERS = 7;
const OFFER_BUFFER = 2;

class VolunteerMatchingService {
  normalizeValue(value = "") {
    return String(value)
      .toLowerCase()
      .replace(/[_-]/g, " ")
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  normalizeList(values = []) {
    if (!Array.isArray(values)) {
      return [];
    }

    return values.map((value) => this.normalizeValue(value)).filter(Boolean);
  }

  getRequiredVolunteerCount(complaint) {
    const count = Number.parseInt(complaint.requiredPeople, 10);

    return Number.isInteger(count) && count > 0 ? count : 1;
  }

  getPendingOfferTarget(complaint) {
    const requiredPeople = this.getRequiredVolunteerCount(complaint);

    const assignedPeople = Math.max(
      0,
      Number.parseInt(complaint.assignedPeopleCount, 10) || 0,
    );

    const remainingPeople = Math.max(0, requiredPeople - assignedPeople);

    if (remainingPeople === 0) {
      return 0;
    }

    return Math.min(
      MAX_PENDING_VOLUNTEER_OFFERS,
      Math.max(1, remainingPeople + OFFER_BUFFER),
    );
  }

  getMatchingSkills(requiredSkills, volunteerSkills) {
    const normalizedRequiredSkills = this.normalizeList(requiredSkills);
    const normalizedVolunteerSkills = this.normalizeList(volunteerSkills);

    const matchedSkills = normalizedRequiredSkills.filter((requiredSkill) => {
      return normalizedVolunteerSkills.some((volunteerSkill) => {
        return (
          volunteerSkill === requiredSkill ||
          volunteerSkill.includes(requiredSkill) ||
          requiredSkill.includes(volunteerSkill)
        );
      });
    });

    return {
      normalizedRequiredSkills,
      matchedSkills,
    };
  }

  getLocationMatch(locationHint, volunteer) {
    const normalizedComplaintLocation = this.normalizeValue(locationHint);

    if (!normalizedComplaintLocation) {
      return {
        matches: false,
        matchedArea: null,
      };
    }

    const areas = [
      ...(Array.isArray(volunteer.preferredAreas)
        ? volunteer.preferredAreas
        : []),
      volunteer.location,
    ];

    for (const area of areas) {
      const normalizedArea = this.normalizeValue(area);

      if (
        normalizedArea &&
        (normalizedComplaintLocation.includes(normalizedArea) ||
          normalizedArea.includes(normalizedComplaintLocation))
      ) {
        return {
          matches: true,
          matchedArea: area,
        };
      }
    }

    return {
      matches: false,
      matchedArea: null,
    };
  }

  buildCandidate(complaint, volunteer) {
    const { normalizedRequiredSkills, matchedSkills } = this.getMatchingSkills(
      complaint.requiredSkills,
      volunteer.skills,
    );

    if (normalizedRequiredSkills.length > 0 && matchedSkills.length === 0) {
      return null;
    }

    const locationMatch = this.getLocationMatch(
      complaint.locationHint,
      volunteer,
    );

    const maxAssignments = Number(volunteer.maxActiveAssignments) || 1;

    const currentAssignments = Number(volunteer.currentActiveAssignments) || 0;

    const freeSlots = Math.max(0, maxAssignments - currentAssignments);

    const skillScore =
      normalizedRequiredSkills.length > 0
        ? Math.round(
            (matchedSkills.length / normalizedRequiredSkills.length) * 50,
          )
        : 25;

    const locationScore = locationMatch.matches ? 20 : 0;

    const reliabilityScore = Math.round(
      (Math.max(0, Number(volunteer.reliabilityScore) || 0) / 100) * 15,
    );

    const capacityScore = Math.round((freeSlots / maxAssignments) * 10);

    const matchScore = Math.min(
      100,
      skillScore + locationScore + reliabilityScore + capacityScore + 5,
    );

    const matchReasons = [
      `Volunteer is available with ${freeSlots}/${maxAssignments} workload slots free`,
      `Reliability score: ${volunteer.reliabilityScore || 0}/100`,
    ];

    if (matchedSkills.length > 0) {
      matchReasons.push(`Skill match: ${matchedSkills.join(", ")}`);
    }

    if (locationMatch.matches) {
      matchReasons.push(`Preferred-area match: ${locationMatch.matchedArea}`);
    }

    return {
      volunteer,
      matchScore,
      matchReasons,
    };
  }

  getOfferExpiryMinutes() {
    const configuredMinutes = Number.parseInt(
      process.env.VOLUNTEER_OFFER_EXPIRY_MINUTES,
      10,
    );

    if (!Number.isInteger(configuredMinutes) || configuredMinutes < 1) {
      return 15;
    }

    return Math.min(configuredMinutes, 24 * 60);
  }

  async dispatchAdditionalOffersForComplaint(
    complaint,
    reason = "INITIAL_DISPATCH",
  ) {
    if (!complaint?.acceptedNgoId) {
      throw new Error(
        "An NGO must accept the complaint before volunteer offers are created",
      );
    }

    if (complaint.status === "FULLY_ASSIGNED") {
      return {
        dispatched: false,
        complaint,
        offers: [],
      };
    }

    // I am first cleaning up offers that expired before this dispatch attempt.
    await volunteerOfferRepository.expirePendingOffersForComplaint(
      complaint._id,
    );

    const existingOffers = await volunteerOfferRepository.findByComplaintId(
      complaint._id,
    );

    const pendingOffers = existingOffers.filter((offer) => {
      return (
        offer.status === "PENDING" && new Date(offer.expiresAt) > new Date()
      );
    });

    const pendingOfferTarget = this.getPendingOfferTarget(complaint);

    const offersNeeded = pendingOfferTarget - pendingOffers.length;

    if (offersNeeded <= 0) {
      return {
        dispatched: false,
        complaint,
        offers: [],
      };
    }

    // I am never sending the same case to the same volunteer twice.
    const alreadyOfferedVolunteerIds = new Set(
      existingOffers.map((offer) => String(offer.volunteerId)),
    );

    const eligibleVolunteers =
      await volunteerRepository.findEligibleForMatching(
        complaint.acceptedNgoId,
      );

    const rankedCandidates = eligibleVolunteers
      .filter((volunteer) => {
        return !alreadyOfferedVolunteerIds.has(String(volunteer._id));
      })
      .map((volunteer) => this.buildCandidate(complaint, volunteer))
      .filter(Boolean)
      .sort((first, second) => {
        return second.matchScore - first.matchScore;
      });

    if (rankedCandidates.length === 0) {
      console.log(
        `⚠️ No additional eligible volunteers for complaint ${complaint.complaintId}`,
      );

      return {
        dispatched: false,
        complaint,
        offers: [],
      };
    }

    const selectedCandidates = rankedCandidates.slice(0, offersNeeded);

    const expiresAt = new Date(
      Date.now() + this.getOfferExpiryMinutes() * 60 * 1000,
    );

    const createdOffers = [];

    for (const candidate of selectedCandidates) {
      try {
        const offer = await volunteerOfferRepository.create({
          complaintId: complaint._id,
          ngoId: complaint.acceptedNgoId,
          volunteerId: candidate.volunteer._id,
          matchScore: candidate.matchScore,
          matchReasons: [
            ...candidate.matchReasons,
            `Dispatch reason: ${reason}`,
          ],
          expiresAt,
        });

        createdOffers.push(offer);

        // Send email alert to volunteer
        if (candidate.volunteer && candidate.volunteer.email) {
          emailService.sendVolunteerOfferAlert(candidate.volunteer.email, complaint).catch((err) => {
            console.error(`❌ Background email to volunteer ${candidate.volunteer.email} failed:`, err.message);
          });
        }
      } catch (error) {
        if (error?.code === 11000) {
          continue;
        }

        throw error;
      }
    }

    let updatedComplaint = complaint;

    if (createdOffers.length > 0 && complaint.status === "NGO_ACCEPTED") {
      updatedComplaint = await complaintRepository.updateById(complaint._id, {
        status: "VOLUNTEER_MATCHING",
      });
    }

    if (createdOffers.length > 0) {
      await agentLogService.logRun({
        complaintId: updatedComplaint._id,
        agentType: "Volunteer Dispatch Agent",
        toolCalls: [
          {
            toolName: "getEligibleVolunteers",
            args: { ngoId: updatedComplaint.acceptedNgoId, skills: updatedComplaint.requiredSkills },
            result: selectedCandidates.map(c => ({ volunteerId: c.volunteer._id, name: c.volunteer.name, matchScore: c.matchScore }))
          },
          {
            toolName: "createVolunteerOffers",
            args: { complaintId: updatedComplaint._id, volunteerIds: selectedCandidates.map(c => c.volunteer._id) },
            result: { offersCreated: createdOffers.length }
          }
        ],
        decisionSummary: `Dispatched volunteer offers to ${createdOffers.length} eligible volunteers based on score and availability.`,
        status: "SUCCESS"
      });
    }

    console.log(
      `✅ Created ${createdOffers.length} replacement/initial volunteer offer(s) for ${complaint.complaintId}`,
    );

    return {
      dispatched: createdOffers.length > 0,
      complaint: updatedComplaint,
      offers: createdOffers,
    };
  }

  async dispatchOffersForComplaint(complaint) {
    return await this.dispatchAdditionalOffersForComplaint(
      complaint,
      "INITIAL_DISPATCH",
    );
  }

  async getVolunteerOffersForNgo(ngoId, status) {
    return await volunteerOfferRepository.findByNgoIdAndStatus(ngoId, status);
  }
}

export default new VolunteerMatchingService();
