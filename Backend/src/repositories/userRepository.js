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

  async findByNgoId(ngoId) {
    return await User.find({ ngoId });
  }

  async deleteById(id) {
    return await User.findByIdAndDelete(id);
  }
}

export default new UserRepository();
