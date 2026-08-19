import User from "../models/User.js";

class UserRepository {
  async create(userData) {
    return await User.create(userData);
  }

  // Password is selected only here because login needs it.
  async findByEmail(email) {
    return await User.findOne({
      email: String(email).toLowerCase(),
    })
      .select("+password")
      .populate("ngoId");
  }

  async findById(id) {
    return await User.findById(id).populate("ngoId");
  }

  async findByIdWithRefreshTokens(id) {
    return await User.findById(id).select("+refreshTokenHashes").populate("ngoId");
  }

  async addRefreshTokenHash(id, tokenHash, maxSessions) {
    return await User.findByIdAndUpdate(id, {
      $push: {
        refreshTokenHashes: {
          $each: [tokenHash],
          $slice: -maxSessions,
        },
      },
    });
  }

  async rotateRefreshTokenHash(id, oldHash, newHash, maxSessions) {
    return await User.findOneAndUpdate(
      { _id: id, isActive: true, refreshTokenHashes: oldHash },
      [
        {
          $set: {
            refreshTokenHashes: {
              $slice: [
                {
                  $concatArrays: [
                    {
                      $filter: {
                        input: "$refreshTokenHashes",
                        as: "hash",
                        cond: { $ne: ["$$hash", oldHash] },
                      },
                    },
                    [newHash],
                  ],
                },
                -maxSessions,
              ],
            },
          },
        },
      ],
      { new: true },
    ).populate("ngoId");
  }

  async removeRefreshTokenHash(id, tokenHash) {
    return await User.findByIdAndUpdate(id, {
      $pull: { refreshTokenHashes: tokenHash },
    });
  }

  async findByNgoId(ngoId) {
    return await User.find({ ngoId });
  }

  async deleteById(id) {
    return await User.findByIdAndDelete(id);
  }
}

export default new UserRepository();
