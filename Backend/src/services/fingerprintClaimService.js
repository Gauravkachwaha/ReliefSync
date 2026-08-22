import aiWorkflowCacheService from "./aiWorkflowCacheService.js";

const CLAIM_NAMESPACE = "dedupe:fingerprint";
const CLAIM_TTL_SECONDS = 24 * 60 * 60;

// Only deletes the key if it still points at the complaint releasing it —
// prevents releasing a claim a newer complaint has since taken over.
const RELEASE_IF_OWNER_SCRIPT = `
if redis.call("GET", KEYS[1]) == ARGV[1] then
  return redis.call("DEL", KEYS[1])
else
  return 0
end
`;

class FingerprintClaimService {
  buildKey(contentFingerprint) {
    return `${aiWorkflowCacheService.getKeyPrefix()}:${CLAIM_NAMESPACE}:${contentFingerprint}`;
  }

  // Atomically claims the fingerprint for this complaintId.
  // - redisAvailable: false means Redis couldn't be reached; caller should
  //   fall back to the old Mongo check-then-write path for this request.
  // - wonClaim: true means this request is the first for this fingerprint
  //   in the last 24h and should proceed normally.
  // - ownerComplaintId: set when wonClaim is false — the complaint this
  //   request is a duplicate of.
  async claim(contentFingerprint, complaintId) {
    const client = await aiWorkflowCacheService.getClient();

    if (!client) {
      return { redisAvailable: false, wonClaim: false, ownerComplaintId: null };
    }

    const key = this.buildKey(contentFingerprint);

    try {
      const result = await client.set(key, complaintId, {
        condition: "NX",
        expiration: { type: "EX", value: CLAIM_TTL_SECONDS },
      });

      if (result === "OK") {
        return { redisAvailable: true, wonClaim: true, ownerComplaintId: null };
      }

      const ownerComplaintId = await client.get(key);

      return { redisAvailable: true, wonClaim: false, ownerComplaintId };
    } catch (error) {
      console.warn(
        `⚠️ Redis fingerprint claim failed, falling back to DB check: ${error.message}`,
      );

      return { redisAvailable: false, wonClaim: false, ownerComplaintId: null };
    }
  }

  // Best-effort takeover when the claim's owner no longer exists in Mongo
  // (e.g. the winning request crashed before it could write its document).
  async reassign(contentFingerprint, complaintId) {
    const client = await aiWorkflowCacheService.getClient();

    if (!client) {
      return;
    }

    try {
      await client.set(this.buildKey(contentFingerprint), complaintId, {
        expiration: { type: "EX", value: CLAIM_TTL_SECONDS },
      });
    } catch (error) {
      console.warn(`⚠️ Redis fingerprint reassign failed: ${error.message}`);
    }
  }

  // Frees the fingerprint before the 24h TTL when the owning complaint
  // moves to a status that no longer counts as "the original" (mirrors
  // the BLOCKED/REJECTED_AS_SPAM/CANCELLED exclusion in the Mongo fallback query).
  async release(contentFingerprint, complaintId) {
    const client = await aiWorkflowCacheService.getClient();

    if (!client) {
      return;
    }

    try {
      await client.eval(RELEASE_IF_OWNER_SCRIPT, {
        keys: [this.buildKey(contentFingerprint)],
        arguments: [complaintId],
      });
    } catch (error) {
      console.warn(`⚠️ Redis fingerprint release failed: ${error.message}`);
    }
  }
}

export default new FingerprintClaimService();
