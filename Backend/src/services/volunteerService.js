import bcrypt from "bcryptjs";
import volunteerRepository from "../repositories/volunteerRepository.js";
import userRepository from "../repositories/userRepository.js";

const allowedAvailability = ["available", "busy", "on_assignment", "offline"];

const allowedVerificationStatuses = ["VERIFIED", "SUSPENDED"];

class VolunteerService {
  createServiceError(message, status = 400) {
    const error = new Error(message);
    error.status = status;
    return error;
  }

  normalizeText(value, fieldName, maxLength, required = false) {
    if (value === undefined || value === null) {
      if (required) {
        throw this.createServiceError(`${fieldName} is required`);
      }

      return undefined;
    }

    if (typeof value !== "string") {
      throw this.createServiceError(`${fieldName} must be text`);
    }

    const cleanedValue = value.trim();

    if (required && !cleanedValue) {
      throw this.createServiceError(`${fieldName} is required`);
    }

    if (cleanedValue.length > maxLength) {
      throw this.createServiceError(
        `${fieldName} cannot exceed ${maxLength} characters`,
      );
    }

    return cleanedValue || undefined;
  }

  normalizeStringList(value, fieldName, maxItems, maxLengthPerItem) {
    if (value === undefined) {
      return undefined;
    }

    if (!Array.isArray(value)) {
      throw this.createServiceError(`${fieldName} must be an array`);
    }

    if (value.length > maxItems) {
      throw this.createServiceError(
        `${fieldName} can contain at most ${maxItems} values`,
      );
    }

    const normalizedValues = [
      ...new Set(value.map((item) => String(item).trim()).filter(Boolean)),
    ];

    if (normalizedValues.some((item) => item.length > maxLengthPerItem)) {
      throw this.createServiceError(
        `Each ${fieldName} value cannot exceed ${maxLengthPerItem} characters`,
      );
    }

    return normalizedValues;
  }

  normalizeAvailability(value) {
    if (value === undefined) {
      return undefined;
    }

    const normalizedValue = String(value).trim().toLowerCase();

    if (!allowedAvailability.includes(normalizedValue)) {
      throw this.createServiceError(
        "availability must be available, busy, on_assignment, or offline",
      );
    }

    return normalizedValue;
  }

  normalizeVerificationStatus(value) {
    if (value === undefined) {
      return undefined;
    }

    const normalizedValue = String(value).trim().toUpperCase();

    if (!allowedVerificationStatuses.includes(normalizedValue)) {
      throw this.createServiceError(
        "verificationStatus must be VERIFIED or SUSPENDED",
      );
    }

    return normalizedValue;
  }

  normalizeMaxAssignments(value) {
    if (value === undefined) {
      return undefined;
    }

    const maxActiveAssignments = Number(value);

    if (
      !Number.isInteger(maxActiveAssignments) ||
      maxActiveAssignments < 1 ||
      maxActiveAssignments > 20
    ) {
      throw this.createServiceError(
        "maxActiveAssignments must be an integer from 1 to 20",
      );
    }

    return maxActiveAssignments;
  }

  normalizePassword(password) {
    if (typeof password !== "string") {
      throw this.createServiceError("password is required");
    }

    if (password.length < 8 || password.length > 128) {
      throw this.createServiceError(
        "password must contain 8 to 128 characters",
      );
    }

    return password;
  }

  async createVolunteer(volunteerData, ngoId) {
    const name = this.normalizeText(volunteerData.name, "name", 120, true);

    const email = this.normalizeText(
      volunteerData.email,
      "email",
      180,
      true,
    )?.toLowerCase();

    const location = this.normalizeText(
      volunteerData.location,
      "location",
      150,
      true,
    );

    const phone = this.normalizeText(volunteerData.phone, "phone", 30);

    const skills = this.normalizeStringList(
      volunteerData.skills,
      "skills",
      20,
      80,
    );

    if (!skills || skills.length === 0) {
      throw this.createServiceError("Provide at least one volunteer skill");
    }

    const preferredAreas = this.normalizeStringList(
      volunteerData.preferredAreas,
      "preferredAreas",
      20,
      120,
    );

    const maxActiveAssignments =
      this.normalizeMaxAssignments(volunteerData.maxActiveAssignments) || 3;

    const existingVolunteer = await volunteerRepository.findByEmail(email);

    if (existingVolunteer) {
      throw this.createServiceError(
        "A volunteer with this email already exists",
        409,
      );
    }

    return await volunteerRepository.create({
      name,
      email,
      phone: phone || null,
      location,
      skills,
      preferredAreas: preferredAreas?.length > 0 ? preferredAreas : [location],
      availability: "available",
      maxActiveAssignments,
      currentActiveAssignments: 0,
      reliabilityScore: 50,
      verificationStatus: "VERIFIED",
      ngoId,
      isActive: true,
    });
  }

  async getAllVolunteers(ngoId) {
    return await volunteerRepository.findByNgoId(ngoId);
  }

  async getVolunteerById(id, ngoId) {
    const volunteer = await volunteerRepository.findById(id, ngoId);

    if (!volunteer) {
      throw this.createServiceError("Volunteer not found", 404);
    }

    return volunteer;
  }

  async getVolunteerByUserId(userId, ngoId) {
    const volunteer = await volunteerRepository.findByUserId(userId, ngoId);

    if (!volunteer) {
      throw this.createServiceError(
        "Volunteer profile is not linked to this account",
        404,
      );
    }

    return volunteer;
  }

  async createVolunteerLoginAccount(volunteerId, ngoId, password) {
    const cleanPassword = this.normalizePassword(password);

    const volunteer = await this.getVolunteerById(volunteerId, ngoId);

    if (volunteer.userId) {
      throw this.createServiceError(
        "This volunteer already has a login account",
        409,
      );
    }

    if (volunteer.verificationStatus !== "VERIFIED") {
      throw this.createServiceError(
        "Only verified volunteers can receive login accounts",
        403,
      );
    }

    const existingUser = await userRepository.findByEmail(volunteer.email);

    if (existingUser) {
      throw this.createServiceError(
        "A user account already exists with this volunteer email",
        409,
      );
    }

    const hashedPassword = await bcrypt.hash(cleanPassword, 10);

    const user = await userRepository.create({
      name: volunteer.name,
      email: volunteer.email,
      password: hashedPassword,
      role: "volunteer",
      ngoId,
      isActive: true,
    });

    try {
      const linkedVolunteer = await volunteerRepository.update(
        volunteer._id,
        ngoId,
        {
          userId: user._id,
        },
      );

      if (!linkedVolunteer) {
        throw new Error("Could not link the login account to volunteer");
      }

      return {
        volunteer: linkedVolunteer,
        user,
      };
    } catch (error) {
      await userRepository.deleteById(user._id);

      throw this.createServiceError(
        "Volunteer account could not be linked. Please try again.",
        500,
      );
    }
  }

  async updateMyAvailability(userId, ngoId, availability) {
    const normalizedAvailability = this.normalizeAvailability(availability);

    if (!normalizedAvailability) {
      throw this.createServiceError("availability is required");
    }

    const volunteer = await this.getVolunteerByUserId(userId, ngoId);

    const updatedVolunteer = await volunteerRepository.update(
      volunteer._id,
      ngoId,
      {
        availability: normalizedAvailability,
      },
    );

    if (!updatedVolunteer) {
      throw this.createServiceError("Volunteer not found", 404);
    }

    return updatedVolunteer;
  }

  async updateVolunteer(id, ngoId, updateData) {
    const volunteer = await this.getVolunteerById(id, ngoId);

    const sanitizedUpdate = {};

    const name = this.normalizeText(updateData.name, "name", 120);

    if (name !== undefined) {
      sanitizedUpdate.name = name;
    }

    const phone = this.normalizeText(updateData.phone, "phone", 30);

    if (phone !== undefined) {
      sanitizedUpdate.phone = phone || null;
    }

    const location = this.normalizeText(updateData.location, "location", 150);

    if (location !== undefined) {
      sanitizedUpdate.location = location;
    }

    const skills = this.normalizeStringList(
      updateData.skills,
      "skills",
      20,
      80,
    );

    if (skills !== undefined) {
      if (skills.length === 0) {
        throw this.createServiceError(
          "A volunteer must have at least one skill",
        );
      }

      sanitizedUpdate.skills = skills;
    }

    const preferredAreas = this.normalizeStringList(
      updateData.preferredAreas,
      "preferredAreas",
      20,
      120,
    );

    if (preferredAreas !== undefined) {
      sanitizedUpdate.preferredAreas = preferredAreas;
    }

    const availability = this.normalizeAvailability(updateData.availability);

    if (availability !== undefined) {
      sanitizedUpdate.availability = availability;
    }

    const verificationStatus = this.normalizeVerificationStatus(
      updateData.verificationStatus,
    );

    if (verificationStatus !== undefined) {
      sanitizedUpdate.verificationStatus = verificationStatus;
    }

    const maxActiveAssignments = this.normalizeMaxAssignments(
      updateData.maxActiveAssignments,
    );

    if (maxActiveAssignments !== undefined) {
      if (maxActiveAssignments < volunteer.currentActiveAssignments) {
        throw this.createServiceError(
          "maxActiveAssignments cannot be lower than currentActiveAssignments",
        );
      }

      sanitizedUpdate.maxActiveAssignments = maxActiveAssignments;
    }

    if (updateData.isActive !== undefined) {
      if (typeof updateData.isActive !== "boolean") {
        throw this.createServiceError("isActive must be true or false");
      }

      sanitizedUpdate.isActive = updateData.isActive;
    }

    if (Object.keys(sanitizedUpdate).length === 0) {
      throw this.createServiceError(
        "Provide at least one valid volunteer field to update",
      );
    }

    const updatedVolunteer = await volunteerRepository.update(
      id,
      ngoId,
      sanitizedUpdate,
    );

    if (!updatedVolunteer) {
      throw this.createServiceError("Volunteer not found", 404);
    }

    return updatedVolunteer;
  }
}

export default new VolunteerService();
