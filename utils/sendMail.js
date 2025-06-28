const nodemailer = require("nodemailer");
require("dotenv").config();
exports.sendEmail = async ({ to, subject, html }) => {
  console.log(process.env.EMAIL, process.env.EMAILPASS);
  // sender
  const transporter = nodemailer.createTransport({
    secure: true,
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },tls: {
  rejectUnauthorized: false,
}

  });
  // receiver
  const emailInfo = await transporter.sendMail({
    from: `BetiFood <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
  });
  return emailInfo.accepted.length < 1 ? false : true;
};
