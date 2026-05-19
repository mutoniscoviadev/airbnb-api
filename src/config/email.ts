import nodemailer from "nodemailer";

// Transporter created once at module load
const transporter = nodemailer.createTransport({
  host: process.env["EMAIL_HOST"],
  port: Number(process.env["EMAIL_PORT"]),
  secure: false,
  auth: {
    user: process.env["EMAIL_USER"],
    pass: process.env["EMAIL_PASS"],
  },
});

// Send email helper function
export const sendEmail = async (
  to: string,
  subject: string,
  html: string
): Promise<void> => {
  await transporter.sendMail({
    from: process.env["EMAIL_FROM"],
    to,
    subject,
    html,
  });
};