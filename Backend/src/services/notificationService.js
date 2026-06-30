import notificationRepository from "../repositories/notificationRepository.js";

import { enqueueNotificationDelivery } from "../queues/reliefBackgroundQueue.js";

class NotificationService {
  getDefaultChannel() {
    return (process.env.NOTIFICATION_DEFAULT_CHANNEL || "CONSOLE")
      .trim()
      .toUpperCase();
  }

  isConsoleEnabled() {
    return (
      String(process.env.NOTIFICATION_CONSOLE_ENABLED || "true")
        .trim()
        .toLowerCase() === "true"
    );
  }

  normalizeChannel(channel) {
    const selectedChannel = String(channel || this.getDefaultChannel())
      .trim()
      .toUpperCase();

    const allowedChannels = ["CONSOLE", "IN_APP", "EMAIL", "SMS", "WHATSAPP"];

    return allowedChannels.includes(selectedChannel)
      ? selectedChannel
      : "CONSOLE";
  }

  buildDeliveryJobId(notificationId) {
    return `notification_${String(notificationId)}`;
  }

  async createAndQueueNotification({
    idempotencyKey = null,
    type,
    recipientType,
    recipientUserId = null,
    ngoId = null,
    volunteerId = null,
    complaintId = null,
    ngoCaseOfferId = null,
    volunteerOfferId = null,
    channel = null,
    subject,
    message,
    payload = {},
  }) {
    const { notification, created } =
      await notificationRepository.createIfAbsent({
        idempotencyKey,
        type,
        recipientType,
        recipientUserId,
        ngoId,
        volunteerId,
        complaintId,
        ngoCaseOfferId,
        volunteerOfferId,
        channel: this.normalizeChannel(channel),
        subject,
        message,
        payload,
        status: "QUEUED",
      });

    const shouldQueue =
      created ||
      (notification.status === "QUEUED" && !notification.bullMqJobId);

    if (!shouldQueue) {
      return notification;
    }

    try {
      const job = await enqueueNotificationDelivery({
        notificationId: notification._id,
        notificationType: notification.type,
        jobId: this.buildDeliveryJobId(notification._id),
      });

      return await notificationRepository.saveBullMqJobId(
        notification._id,
        job.id,
      );
    } catch (error) {
      console.warn(
        `⚠️ Notification created but could not be queued: ${error.message}`,
      );

      return await notificationRepository.markQueueError(
        notification._id,
        error.message,
      );
    }
  }

  async deliverNotification(notificationId) {
    const notification =
      await notificationRepository.claimForProcessing(notificationId);

    if (!notification) {
      return {
        delivered: false,
        reason: "NOTIFICATION_NOT_FOUND_OR_NOT_DELIVERABLE",
      };
    }

    try {
      if (notification.channel === "CONSOLE") {
        await this.deliverConsoleNotification(notification);
      } else if (notification.channel === "IN_APP") {
        await this.deliverInAppNotification(notification);
      } else {
        throw new Error(
          `Channel ${notification.channel} is not implemented yet`,
        );
      }

      await notificationRepository.markSent(notification._id);

      return {
        delivered: true,
        notificationId: notification._id,
        channel: notification.channel,
        type: notification.type,
      };
    } catch (error) {
      await notificationRepository.markFailed(notification._id, error.message);

      throw error;
    }
  }

  async deliverConsoleNotification(notification) {
    if (!this.isConsoleEnabled()) {
      throw new Error("Console notification channel is disabled");
    }

    console.log("\n🔔 ReliefSync Notification");
    console.log("----------------------------------------");
    console.log(`Type: ${notification.type}`);
    console.log(`Channel: ${notification.channel}`);
    console.log(`Recipient: ${notification.recipientType}`);
    console.log(`Subject: ${notification.subject}`);
    console.log(`Message: ${notification.message}`);

    if (notification.complaintId) {
      console.log(`Complaint Mongo ID: ${notification.complaintId}`);
    }

    if (notification.ngoCaseOfferId) {
      console.log(`NGO Offer Mongo ID: ${notification.ngoCaseOfferId}`);
    }

    if (notification.volunteerOfferId) {
      console.log(`Volunteer Offer Mongo ID: ${notification.volunteerOfferId}`);
    }

    console.log("----------------------------------------\n");
  }

  async deliverInAppNotification(notification) {
    console.log(`📥 In-app notification stored: ${notification.type}`);
  }
}

export default new NotificationService();
