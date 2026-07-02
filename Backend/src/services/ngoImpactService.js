import NGO from "../models/NGO.js";
import Complaint from "../models/Complaint.js";
import Assignment from "../models/Assignment.js";
import Volunteer from "../models/Volunteer.js";

class NgoImpactService {
  async recalculateNgoImpact(ngoId) {
    try {
      const ngo = await NGO.findById(ngoId);
      if (!ngo) return null;

      // 1. Verified resolved cases count
      const resolvedComplaints = await Complaint.find({
        acceptedNgoId: ngoId,
        status: "RESOLVED",
      });

      const resolvedCount = resolvedComplaints.length;

      // 2. Severity-weighted successful cases
      let severityPoints = 0;
      for (const comp of resolvedComplaints) {
        const sev = String(comp.severity || "").toUpperCase();
        if (sev === "CRITICAL") severityPoints += 15;
        else if (sev === "HIGH") severityPoints += 8;
        else if (sev === "MEDIUM") severityPoints += 3;
      }

      // 3. Fast response score (average response time from offer acceptance to assignment completion)
      let totalDurationMs = 0;
      let durationCount = 0;

      for (const comp of resolvedComplaints) {
        const assignments = await Assignment.find({
          complaintId: comp._id,
          status: "completed",
        });

        if (assignments.length > 0) {
          const completionTimes = assignments.map(
            (a) => new Date(a.updatedAt || a.completedAt || comp.updatedAt)
          );
          const latestCompletion = new Date(Math.max(...completionTimes));
          const duration = latestCompletion - new Date(comp.createdAt);
          if (duration > 0) {
            totalDurationMs += duration;
            durationCount += 1;
          }
        }
      }

      let responseTimeScore = 0;
      let avgDurationHours = 0;
      if (durationCount > 0) {
        const avgDurationMs = totalDurationMs / durationCount;
        avgDurationHours = avgDurationMs / (1000 * 60 * 60);

        if (avgDurationHours <= 1) responseTimeScore = 20;
        else if (avgDurationHours <= 3) responseTimeScore = 10;
        else if (avgDurationHours <= 6) responseTimeScore = 5;
      }

      // 4. Citizen feedback score
      const complaintsWithFeedback = resolvedComplaints.filter(
        (c) => c.feedback && c.feedback.rating
      );
      let avgFeedbackRating = 0;
      if (complaintsWithFeedback.length > 0) {
        const totalRating = complaintsWithFeedback.reduce(
          (sum, c) => sum + c.feedback.rating,
          0
        );
        avgFeedbackRating = totalRating / complaintsWithFeedback.length;
      }
      const feedbackScore = Math.round(avgFeedbackRating * 5); // max 25 points

      // 5. Volunteer participation score (active volunteers)
      const volunteerCount = await Volunteer.countDocuments({
        ngoId: ngoId,
        availability: { $ne: "offline" },
        isActive: true,
      });
      const volunteerParticipationScore = volunteerCount * 2;

      // 6. Unresolved accepted cases penalty
      const activeStates = [
        "NGO_ACCEPTED",
        "VOLUNTEER_MATCHING",
        "PARTIALLY_ASSIGNED",
        "FULLY_ASSIGNED",
        "IN_PROGRESS",
      ];
      const activeComplaintsCount = await Complaint.countDocuments({
        acceptedNgoId: ngoId,
        status: { $in: activeStates },
      });
      const unresolvedPenalty = activeComplaintsCount * 15;

      // 7. Repeated cancellation penalty
      const cancelledAssignmentsCount = await Assignment.countDocuments({
        ngoId: ngoId,
        status: "cancelled",
      });
      const cancellationPenalty = cancelledAssignmentsCount * 10;

      // Total raw impact score
      const rawImpactScore =
        resolvedCount * 10 +
        severityPoints +
        responseTimeScore +
        feedbackScore +
        volunteerParticipationScore -
        unresolvedPenalty -
        cancellationPenalty;

      // Capacity = active volunteers
      const capacity = Math.max(1, volunteerCount);

      // Normalized impact
      const normalizedScore = Math.max(
        0,
        Math.round((rawImpactScore / capacity) * 10) / 10
      );

      // 8. Badges assignment
      const badges = [];
      if (durationCount > 0 && avgDurationHours <= 1) {
        badges.push("Fastest Response");
      }
      if (resolvedCount >= 5) {
        const totalCasesAccepted = await Complaint.countDocuments({
          acceptedNgoId: ngoId,
        });
        const completionRate =
          totalCasesAccepted > 0
            ? (resolvedCount / totalCasesAccepted) * 100
            : 0;
        if (completionRate >= 90) {
          badges.push("Most Reliable NGO");
        }
      }
      if (normalizedScore >= 20) {
        badges.push("Top Community Impact");
      }

      // Check category champions
      const foodCount = resolvedComplaints.filter(
        (c) => c.category === "FOOD_RELIEF"
      ).length;
      if (foodCount >= 3) badges.push("Food Relief Champion");

      const medicalCount = resolvedComplaints.filter(
        (c) => c.category === "MEDICAL_SUPPORT"
      ).length;
      if (medicalCount >= 3) badges.push("Medical Support Champion");

      const safetyCount = resolvedComplaints.filter(
        (c) => c.category === "WOMEN_CHILD_SAFETY"
      ).length;
      if (safetyCount >= 3) badges.push("Women and Child Support Champion");

      ngo.impactScore = normalizedScore;
      ngo.impactBadges = badges;
      await ngo.save();

      console.log(
        `📈 NGO ${ngo.name} (${ngoId}) impact score recalculated: ${normalizedScore}`
      );
      return ngo;
    } catch (err) {
      console.error(
        `❌ Recalculating NGO impact score failed for NGO ${ngoId}:`,
        err.message
      );
      return null;
    }
  }

  async recalculateAllNgos() {
    try {
      const ngos = await NGO.find({ verificationStatus: "VERIFIED" });
      for (const ngo of ngos) {
        await this.recalculateNgoImpact(ngo._id);
      }
      console.log("📈 All verified NGOs impact scores recalculated successfully.");
    } catch (err) {
      console.error(
        "❌ Recalculating all NGOs impact scores failed:",
        err.message
      );
    }
  }
}

export default new NgoImpactService();
