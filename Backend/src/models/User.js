import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
      select: false,
    },

    role: {
      type: String,
      enum: ["admin", "coordinator", "volunteer", "super_admin"],
      default: "coordinator",
      index: true,
    },

    // NGO users, including volunteers, must belong to one NGO.
    // Only Super Admin belongs to no specific NGO.
    ngoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "NGO",
      default: null,
      required: function () {
        return this.role !== "super_admin";
      },
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

userSchema.set("toJSON", {
  transform: (document, returnedObject) => {
    delete returnedObject.password;
    return returnedObject;
  },
});

const User = mongoose.model("User", userSchema);

export default User;

