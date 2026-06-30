import crypto from "crypto";

class SpamService {
  normalizeText(value = "") {
    return String(value).toLowerCase().replace(/\s+/g, " ").trim();
  }

  createContentFingerprint(text, locationHint = null) {
    const normalizedText = this.normalizeText(text);
    const normalizedLocation = this.normalizeText(locationHint || "");

    return crypto
      .createHash("sha256")
      .update(`${normalizedText}|${normalizedLocation}`)
      .digest("hex");
  }

  hasAnyTerm(text, terms) {
    return terms.some((term) => text.includes(term));
  }

  evaluateSubmission({ text }) {
    const rawText = String(text || "");
    const normalizedText = this.normalizeText(rawText);

    const ruleFlags = [];
    let score = 0;

    const addFlag = (flag, weight) => {
      if (!ruleFlags.includes(flag)) {
        ruleFlags.push(flag);
        score += weight;
      }
    };

    const safetyTerms = [
      "emergency",
      "urgent",
      "flood",
      "fire",
      "earthquake",
      "landslide",
      "cyclone",
      "medical emergency",
      "bleeding",
      "injured",
      "trapped",
      "child",
      "children",
      "violence",
      "attack",
      "disaster",
    ];

    const promotionalTerms = [
      "click here",
      "free cash",
      "win money",
      "earn money fast",
      "crypto giveaway",
      "loan approved",
      "limited offer",
      "buy followers",
      "telegram channel",
      "whatsapp group",
      "free recharge",
    ];

    const abusiveTerms = ["fuck", "bastard", "idiot", "moron", "stupid admin"];

    const hasUrgentSafetySignal = this.hasAnyTerm(normalizedText, safetyTerms);

    const hasSuspiciousLink =
      /(https?:\/\/|www\.)/i.test(rawText) ||
      /\b(?:bit\.ly|tinyurl\.com|t\.me)\b/i.test(rawText);

    if (hasSuspiciousLink) {
      addFlag("SUSPICIOUS_LINK", 0.45);
    }

    if (this.hasAnyTerm(normalizedText, promotionalTerms)) {
      addFlag("PROMOTIONAL_OR_SCAM_LANGUAGE", 0.6);
    }

    if (this.hasAnyTerm(normalizedText, abusiveTerms)) {
      addFlag("ABUSIVE_LANGUAGE", 0.2);
    }

    const lettersOnly = normalizedText.replace(/[^a-z]/g, "");

    if (lettersOnly.length < 4) {
      addFlag("MEANINGLESS_TEXT", 0.45);
    } else if (normalizedText.length < 12) {
      addFlag("VERY_SHORT_TEXT", 0.2);
    }

    if (/(.)\1{7,}/i.test(rawText)) {
      addFlag("EXCESSIVE_REPEATED_CHARACTERS", 0.2);
    }

    const words = normalizedText.split(" ").filter(Boolean);

    if (words.length >= 4 && new Set(words).size === 1) {
      addFlag("REPEATED_WORD_SPAM", 0.35);
    }

    const alphabeticCharacters = rawText.replace(/[^a-z]/gi, "");

    if (alphabeticCharacters.length >= 12) {
      const uppercaseCharacters = (rawText.match(/[A-Z]/g) || []).length;

      const uppercaseRatio = uppercaseCharacters / alphabeticCharacters.length;

      if (uppercaseRatio > 0.8) {
        addFlag("EXCESSIVE_CAPITAL_LETTERS", 0.15);
      }
    }

    const phoneNumbers = rawText.match(/\b(?:\+?91[\s-]?)?[6-9]\d{9}\b/g) || [];

    if (phoneNumbers.length >= 2) {
      addFlag("REPEATED_PHONE_NUMBERS", 0.25);
    }

    score = Math.min(0.99, Number(score.toFixed(2)));

    let decision = "ALLOW";

    // I am never auto-blocking a possible emergency only because rules are uncertain.
    if (hasUrgentSafetySignal && score >= 0.35) {
      decision = "HOLD_FOR_REVIEW";
    } else if (score >= 0.9) {
      decision = "BLOCK";
    } else if (score >= 0.45) {
      decision = "HOLD_FOR_REVIEW";
    }

    return {
      score,
      decision,
      ruleFlags,
      hasUrgentSafetySignal,
    };
  }
}

export default new SpamService();
