import nodemailer from "nodemailer";

let transporter = null;

const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }
  return transporter;
};

class EmailService {
  async sendEmail(to, subject, text) {
    try {
      const user = process.env.EMAIL_USER;
      const pass = process.env.EMAIL_PASS;

      if (!user || !pass || user.includes("example") || pass.includes("password")) {
        console.log(`✉️ [Console Email Fallback] To: ${to}\nSubject: ${subject}\nBody: ${text}\n`);
        return true;
      }

      const client = getTransporter();
      await client.sendMail({
        from: `"ReliefSync AI" <${user}>`,
        to,
        subject,
        text,
      });
      console.log(`✅ Email sent successfully to ${to}`);
      return true;
    } catch (err) {
      console.warn("⚠️ SMTP Email delivery failed, falling back to console log:", err.message);
      console.log(`✉️ [Console Email Fallback] To: ${to}\nSubject: ${subject}\nBody: ${text}\n`);
      return true;
    }
  }

  // this is for the urgency email sending (critical alert to ngo)

  async sendCriticalNeedAlert(need, ngoEmail) {
    const text = `
🚨 CRITICAL NEED ALERT

Title: ${need.title}
Priority: ${need.priority.toUpperCase()}

Location: ${need.extractedData?.location || "Not specified"}
Affected People: ${need.extractedData?.affectedPeople || "Unknown"}

Required Skills: ${need.extractedData?.requiredSkills?.join(", ") || "None"}

Please check the dashboard immediately and take action.

This is an automated alert from ReliefSync AI.
    `;
    // from is decided always
    return await this.sendEmail(ngoEmail, `🚨 CRITICAL: ${need.title}`, text);
  }

  // Assignment Alert to Volunteer
  async sendAssignmentAlert(volunteerEmail, needTitle) {
    const text = `
New Assignment Assigned to You

Task: ${needTitle}

Please login to ReliefSync AI and check your assignments.

Thank you for your support!
ReliefSync AI Team
    `;

    return await this.sendEmail(
      volunteerEmail,
      `New Assignment: ${needTitle}`,
      text,
    );
  }

  // Incident Offer Alert to NGO Admin
  async sendIncidentOfferAlert(ngoEmail, complaint) {
    const text = `
🚨 NEW INCIDENT ROUTED TO YOUR NGO

A new emergency complaint has been routed to your NGO by the ReliefSync AI engine.

Complaint ID: ${complaint.complaintId}
Category: ${complaint.category || "General"}
Severity: ${complaint.severity || "Medium"}
Location Landmark: ${complaint.locationHint || "General"}

AI Case Summary:
"${complaint.aiExtractedData?.summary || complaint.originalText || "No summary available."}"

Please log in to your NGO Dashboard immediately to accept or decline this case offer before it expires.

Thank you,
ReliefSync AI Team
    `;

    return await this.sendEmail(
      ngoEmail,
      `🚨 Urgent Case Offer: ${complaint.complaintId}`,
      text
    );
  }

  // Volunteer Case Offer Alert
  async sendVolunteerOfferAlert(volunteerEmail, complaint) {
    const text = `
🚨 NEW EMERGENCY ASSIGNMENT OFFER

You have received a new emergency response offer from your NGO.

Incident ID: ${complaint.complaintId}
Category: ${complaint.category || "General Support"}
Severity: ${complaint.severity || "Medium"}
Location Landmark: ${complaint.locationHint || "General"}

AI Incident Summary:
"${complaint.aiExtractedData?.summary || complaint.originalText || "No summary available."}"

Please log in to your Volunteer Portal immediately to accept or decline this offer before it expires.

Thank you for your service!
ReliefSync AI Team
    `;

    return await this.sendEmail(
      volunteerEmail,
      `🚨 Urgent Job Offer: ${complaint.complaintId}`,
      text
    );
  }
}

export default new EmailService();
