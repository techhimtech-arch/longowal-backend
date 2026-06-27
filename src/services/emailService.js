const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

class EmailService {
  constructor() {
    this.transporter = null;
    this.isConfigured = false;
    this.initTransporter();
  }

  /**
   * Initialize email transporter
   */
  initTransporter() {
    // Check if email is configured
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      logger.warn('Email service not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS in environment.');
      return;
    }

    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    this.isConfigured = true;
    logger.info('Email service initialized');
  }

  /**
   * Send email helper
   */
  async sendEmail(to, subject, html, text = '') {
    if (!this.isConfigured) {
      logger.warn('Email not sent - service not configured', { to, subject });
      return false;
    }

    try {
      const info = await this.transporter.sendMail({
        from: process.env.SMTP_FROM || `"School Management System" <${process.env.SMTP_USER}>`,
        to,
        subject,
        text: text || subject,
        html,
      });

      logger.info('Email sent', { messageId: info.messageId, to });
      return true;
    } catch (error) {
      logger.error('Email send failed', { error: error.message, to, subject });
      throw error;
    }
  }

  /**
   * Send welcome email to new school admin
   */
  async sendWelcomeEmail(user, school) {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; padding: 12px 24px; background: #4F46E5; color: white; text-decoration: none; border-radius: 6px; margin-top: 15px; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Welcome to School Management System!</h1>
          </div>
          <div class="content">
            <p>Dear <strong>${user.name}</strong>,</p>
            <p>Congratulations! Your school <strong>"${school.name}"</strong> has been successfully registered.</p>
            <p>You can now:</p>
            <ul>
              <li>Add classes and sections</li>
              <li>Manage students and teachers</li>
              <li>Track attendance and fees</li>
              <li>Generate reports</li>
            </ul>
            <p>Login with your registered email: <strong>${user.email}</strong></p>
            <a href="${process.env.FRONTEND_URL || '#'}" class="button">Go to Dashboard</a>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} School Management System. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail(user.email, 'Welcome to School Management System!', html);
  }

  /**
   * Send admission confirmation to parent
   */
  async sendAdmissionConfirmation(student, parentEmail) {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #059669; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
          .info-box { background: white; padding: 15px; border-radius: 6px; margin: 15px 0; border-left: 4px solid #059669; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Admission Confirmed</h1>
          </div>
          <div class="content">
            <p>Dear Parent/Guardian,</p>
            <p>We are pleased to inform you that the following student has been successfully admitted:</p>
            <div class="info-box">
              <p><strong>Student Name:</strong> ${student.firstName} ${student.lastName || ''}</p>
              <p><strong>Admission Number:</strong> ${student.admissionNumber}</p>
              <p><strong>Admission Date:</strong> ${new Date().toLocaleDateString()}</p>
            </div>
            <p>Please keep the admission number safe for future reference.</p>
            <p>Best regards,<br>School Administration</p>
          </div>
          <div class="footer">
            <p>This is an automated email. Please do not reply.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail(parentEmail, `Admission Confirmed - ${student.firstName} ${student.lastName || ''}`, html);
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(user, resetToken) {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #DC2626; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; padding: 12px 24px; background: #DC2626; color: white; text-decoration: none; border-radius: 6px; margin-top: 15px; }
          .warning { background: #FEF3C7; border: 1px solid #F59E0B; padding: 10px; border-radius: 6px; margin: 15px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 Password Reset Request</h1>
          </div>
          <div class="content">
            <p>Dear <strong>${user.name}</strong>,</p>
            <p>We received a request to reset your password. Click the button below to proceed:</p>
            <a href="${resetUrl}" class="button">Reset Password</a>
            <div class="warning">
              <p><strong>⚠️ Important:</strong></p>
              <ul>
                <li>This link expires in 1 hour</li>
                <li>If you didn't request this, ignore this email</li>
                <li>Never share this link with anyone</li>
              </ul>
            </div>
            <p>If the button doesn't work, copy this link:</p>
            <p style="word-break: break-all; font-size: 12px;">${resetUrl}</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} School Management System</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail(user.email, 'Password Reset Request', html);
  }

  /**
   * Send fee reminder email
   */
  async sendFeeReminder(student, parentEmail, feeDetails) {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #F59E0B; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
          .fee-table { width: 100%; border-collapse: collapse; margin: 15px 0; }
          .fee-table th, .fee-table td { border: 1px solid #ddd; padding: 10px; text-align: left; }
          .fee-table th { background: #F3F4F6; }
          .total { font-weight: bold; color: #DC2626; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>💰 Fee Payment Reminder</h1>
          </div>
          <div class="content">
            <p>Dear Parent/Guardian,</p>
            <p>This is a reminder that fee payment is pending for:</p>
            <p><strong>Student:</strong> ${student.firstName} ${student.lastName || ''}</p>
            <p><strong>Admission No:</strong> ${student.admissionNumber}</p>
            
            <table class="fee-table">
              <tr>
                <th>Fee Type</th>
                <th>Amount</th>
              </tr>
              <tr>
                <td>Total Fee</td>
                <td>₹${feeDetails.totalFee || 0}</td>
              </tr>
              <tr>
                <td>Paid Amount</td>
                <td>₹${feeDetails.paidAmount || 0}</td>
              </tr>
              <tr>
                <td class="total">Due Amount</td>
                <td class="total">₹${feeDetails.dueAmount || 0}</td>
              </tr>
            </table>
            
            <p>Please clear the dues at the earliest to avoid any inconvenience.</p>
            <p>Best regards,<br>School Administration</p>
          </div>
          <div class="footer">
            <p>This is an automated reminder. Please contact school office for queries.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail(parentEmail, `Fee Reminder - ${student.firstName} ${student.lastName || ''}`, html);
  }

  /**
   * Send attendance alert to parent
   */
  async sendAttendanceAlert(student, parentEmail, attendanceData) {
    const statusColor = attendanceData.status === 'absent' ? '#DC2626' : '#F59E0B';
    const statusEmoji = attendanceData.status === 'absent' ? '❌' : '⏰';
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: ${statusColor}; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
          .info-box { background: white; padding: 15px; border-radius: 6px; margin: 15px 0; border-left: 4px solid ${statusColor}; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${statusEmoji} Attendance Alert</h1>
          </div>
          <div class="content">
            <p>Dear Parent/Guardian,</p>
            <p>This is to inform you about your child's attendance:</p>
            <div class="info-box">
              <p><strong>Student:</strong> ${student.firstName} ${student.lastName || ''}</p>
              <p><strong>Date:</strong> ${new Date(attendanceData.date).toLocaleDateString()}</p>
              <p><strong>Status:</strong> <span style="color: ${statusColor}; font-weight: bold;">${attendanceData.status.toUpperCase()}</span></p>
              ${attendanceData.remarks ? `<p><strong>Remarks:</strong> ${attendanceData.remarks}</p>` : ''}
            </div>
            <p>If you have any concerns, please contact the school office.</p>
            <p>Best regards,<br>School Administration</p>
          </div>
          <div class="footer">
            <p>This is an automated notification.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail(parentEmail, `Attendance Alert - ${student.firstName} ${student.lastName || ''}`, html);
  }
}

module.exports = new EmailService();
