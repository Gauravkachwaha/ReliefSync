import NotificationLog from "../models/NotificationLog.js";

class NotificationRepository {
  async create(notificationData) {
    return await NotificationLog.create(notificationData);
  }

  async createIfAbsent(notificationData) {
    const idempotencyKey = String(notificationData.idempotencyKey || "").trim();

    if (!idempotencyKey) {
      const notification = await this.create(notificationData);

      return {
        notification,
        created: true,
      };
    }

    const existingNotification = await NotificationLog.findOne({
      idempotencyKey,
    });

    if (existingNotification) {
      return {
        notification: existingNotification,
        created: false,
      };
    }

    try {
      const notification = await NotificationLog.create({
        ...notificationData,
        idempotencyKey,
      });

      return {
        notification,
        created: true,
      };
    } catch (error) {
      if (error?.code !== 11000) {
        throw error;
      }

      const notification = await NotificationLog.findOne({
        idempotencyKey,
      });

      if (!notification) {
        throw error;
      }

      return {
        notification,
        created: false,
      };
    }
  }

  async findById(notificationId) {
    return await NotificationLog.findById(notificationId);
  }

  async updateById(notificationId, updateData) {
    return await NotificationLog.findByIdAndUpdate(notificationId, updateData, {
      new: true,
      runValidators: true,
    });
  }

  async claimForProcessing(notificationId) {
    return await NotificationLog.findOneAndUpdate(
      {
        _id: notificationId,
        status: {
          $in: ["QUEUED", "FAILED"],
        },
      },
      {
        $set: {
          status: "PROCESSING",
          lastAttemptAt: new Date(),
        },

        $inc: {
          deliveryAttempts: 1,
        },
      },
      {
        new: true,
        runValidators: true,
      },
    );
  }

  async markSent(notificationId) {
    return await NotificationLog.findByIdAndUpdate(
      notificationId,
      {
        $set: {
          status: "SENT",
          sentAt: new Date(),
          failedAt: null,
          lastError: null,
        },
      },
      {
        new: true,
        runValidators: true,
      },
    );
  }

  async markFailed(notificationId, errorMessage) {
    return await NotificationLog.findByIdAndUpdate(
      notificationId,
      {
        $set: {
          status: "FAILED",
          failedAt: new Date(),
          lastError: String(errorMessage || "Unknown error").slice(0, 1000),
        },
      },
      {
        new: true,
        runValidators: true,
      },
    );
  }

  async markQueueError(notificationId, errorMessage) {
    return await NotificationLog.findByIdAndUpdate(
      notificationId,
      {
        $set: {
          status: "QUEUED",
          lastError: String(errorMessage || "Queue error").slice(0, 1000),
        },
      },
      {
        new: true,
        runValidators: true,
      },
    );
  }

  async saveBullMqJobId(notificationId, jobId) {
    return await NotificationLog.findByIdAndUpdate(
      notificationId,
      {
        $set: {
          bullMqJobId: String(jobId),
          lastError: null,
        },
      },
      {
        new: true,
        runValidators: true,
      },
    );
  }
}

export default new NotificationRepository();
