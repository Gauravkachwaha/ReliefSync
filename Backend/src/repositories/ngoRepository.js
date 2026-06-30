import NGO from "../models/NGO.js";

class NgoRepository {
  async create(ngoData) {
    return await NGO.create(ngoData);
  }

  async findById(id) {
    return await NGO.findById(id);
  }

  async findByEmail(email) {
    return await NGO.findOne({ email });
  }

  async updateById(id, updateData) {
    return await NGO.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });
  }

  async findByVerificationStatus(verificationStatus) {
    return await NGO.find({ verificationStatus }).sort({
      createdAt: -1,
    });
  }

  // Only verified NGOs with the required help category can enter routing.
  async findVerifiedByCategory(category) {
    return await NGO.find({
      verificationStatus: "VERIFIED",
      supportedCategories: category,
    });
  }
}

export default new NgoRepository();
