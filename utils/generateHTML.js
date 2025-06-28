function generateActivationEmail(link) {
  return `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>تفعيل حسابك في بيتي فود</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f7f7f7;">
    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
        <tr>
            <td align="center" style="padding: 20px 0;">
                <table role="presentation" border="0" cellspacing="0" cellpadding="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.07);">
                    <!-- Header -->
                    <tr>
                        <td align="center" style="padding: 30px 20px 20px 20px; border-bottom: 1px solid #eaeaea;">
                            <img src="https://beti-food-backend.vercel.app/with%20bg.png" alt="BetiFood Logo" width="80" style="margin-bottom: 16px;" />
                            <h1 style="margin: 10px 0 5px 0; font-size: 24px; color: #ff7043;">بيتي فود</h1>
                        </td>
                    </tr>
                    <!-- Main Content -->
                    <tr>
                        <td align="center" style="padding: 40px 30px;">
                            <h2 style="margin: 0 0 20px 0; color: #333333; font-size: 20px; text-align: center;">تفعيل حسابك في بيتي فود</h2>
                            <p style="margin: 0 0 25px 0; font-size: 16px; line-height: 24px; color: #555555; text-align: center;">
                                شكرًا لتسجيلك في بيتي فود. يرجى الضغط على الزر أدناه لتفعيل بريدك الإلكتروني والبدء في استخدام حسابك.
                            </p>
                            <!-- CTA Button -->
                            <table role="presentation" border="0" cellspacing="0" cellpadding="0" width="100%">
                                <tr>
                                    <td align="center" style="padding: 20px 0;">
                                        <a href="${link}" target="_blank" style="display: inline-block; padding: 15px 30px; font-size: 16px; font-weight: bold; color: #ffffff; background: #ff7043; text-decoration: none; border-radius: 4px; text-align: center;">تفعيل الحساب</a>
                                    </td>
                                </tr>
                            </table>
                            <!-- Fallback Text Link -->
                            <p style="margin: 25px 0 0 0; font-size: 14px; line-height: 21px; color: #777777; text-align: center;">
                                إذا لم يعمل الزر، انسخ الرابط التالي والصقه في متصفحك:<br>
                                <a href="${link}" style="color: #ff7043; text-decoration: underline; word-break: break-all;">${link}</a>
                            </p>
                        </td>
                    </tr>
                    <!-- Support Note -->
                    <tr>
                        <td align="center" style="padding: 20px 30px 40px 30px;">
                            <p style="margin: 0; font-size: 14px; line-height: 21px; color: #777777; text-align: center;">
                                إذا لم تطلب هذا التفعيل، يرجى تجاهل هذه الرسالة.
                            </p>
                        </td>
                    </tr>
                    <!-- Footer -->
                    <tr>
                        <td align="center" style="padding: 20px; background-color: #f7f7f7; border-radius: 0 0 8px 8px;">
                            <p style="margin: 0; font-size: 12px; line-height: 18px; color: #999999;">&copy; ${new Date().getFullYear()}  جميع الحقوق محفوظة بيتي فود</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
`;
}

function resetPasswordTemp(code) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Your ExamApp Password</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f0f4f8;">
    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
        <tr>
            <td align="center" style="padding: 40px 0;">
                <table role="presentation" border="0" cellspacing="0" cellpadding="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 8px 24px rgba(0,0,0,0.12); overflow: hidden;">
                    <!-- Header with Gradient -->
                    <tr>
                        <td style="background-image: linear-gradient(135deg, #EF4444 0%, #DC2626 100%); padding: 40px 20px;">
                            <table role="presentation" border="0" cellspacing="0" cellpadding="0" width="100%">
                                <tr>
                                    <td align="center">
                                        <!-- Logo Placeholder -->
                                        <div style="width: 80px; height: 80px; background-color: #ffffff; border-radius: 50%; display: inline-block; margin-bottom: 16px; line-height: 80px; text-align: center; color: #DC2626; font-weight: bold; font-size: 36px; box-shadow: 0 4px 10px rgba(0,0,0,0.2);">E</div>
                                        <h1 style="margin: 10px 0 5px 0; font-size: 28px; color: #ffffff; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">ExamApp</h1>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Main Content -->
                    <tr>
                        <td align="center" style="padding: 40px 30px 20px 30px;">
                            <table role="presentation" border="0" cellspacing="0" cellpadding="0" width="100%">
                                <tr>
                                    <td>
                                        <!-- Security Icon -->
                                        <div style="width: 60px; height: 60px; background-color: #FEF2F2; border-radius: 50%; display: inline-block; margin: 0 auto 20px auto; line-height: 60px; text-align: center; color: #EF4444; font-size: 24px;">🔐</div>
                                        
                                        <h2 style="margin: 0 0 20px 0; color: #1F2937; font-size: 24px; text-align: center; font-weight: 600;">Password Reset Request</h2>
                                        <p style="margin: 0 0 30px 0; font-size: 16px; line-height: 26px; color: #4B5563; text-align: center;">
                                            We received a request to reset your ExamApp password. Use the verification code below to complete the process.
                                        </p>
                                        
                                        <!-- Decorative Element -->
                                        <div style="width: 60px; height: 4px; background-image: linear-gradient(90deg, #EF4444, #DC2626); margin: 0 auto 30px auto; border-radius: 2px;"></div>
                                        
                                        <!-- Verification Code Box -->
                                        <table role="presentation" border="0" cellspacing="0" cellpadding="0" width="100%">
                                            <tr>
                                                <td align="center" style="padding: 20px 0;">
                                                    <table role="presentation" border="0" cellspacing="0" cellpadding="0">
                                                        <tr>
                                                            <td style="background-color: #F9FAFB; border: 2px dashed #D1D5DB; border-radius: 12px; padding: 25px 40px;">
                                                                <p style="margin: 0 0 8px 0; font-size: 14px; color: #6B7280; text-align: center; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Verification Code</p>
                                                                <div style="font-size: 32px; font-weight: bold; color: #1F2937; text-align: center; letter-spacing: 4px; font-family: 'Courier New', monospace;">${code}</div>
                                                            </td>
                                                        </tr>
                                                    </table>
                                                </td>
                                            </tr>
                                        </table>
                                        
                                        <!-- Instructions -->
                                        <p style="margin: 25px 0 0 0; font-size: 14px; line-height: 21px; color: #6B7280; text-align: center;">
                                            Enter this code in the password reset form. This code will expire in <strong>5 minutes</strong>.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Security Tips -->
                    <tr>
                        <td align="center" style="padding: 10px 30px 40px 30px;">
                            <table role="presentation" border="0" cellspacing="0" cellpadding="0" width="100%">
                                <tr>
                                    <td style="padding: 0;">
                                        <h3 style="margin: 0 0 20px 0; color: #1F2937; font-size: 16px; text-align: center; font-weight: 600;">Password Security Tips</h3>
                                        <table role="presentation" border="0" cellspacing="0" cellpadding="0" width="100%">
                                            <tr>
                                                <td width="33%" align="center" valign="top" style="padding: 10px;">
                                                    <div style="background-color: #F3F4F6; border-radius: 8px; padding: 20px 15px; height: 100%;">
                                                        <div style="font-size: 20px; margin-bottom: 8px;">🔒</div>
                                                        <p style="margin: 0; font-size: 13px; color: #4B5563; font-weight: 600;">Use Strong Passwords</p>
                                                    </div>
                                                </td>
                                                <td width="33%" align="center" valign="top" style="padding: 10px;">
                                                    <div style="background-color: #F3F4F6; border-radius: 8px; padding: 20px 15px; height: 100%;">
                                                        <div style="font-size: 20px; margin-bottom: 8px;">🔄</div>
                                                        <p style="margin: 0; font-size: 13px; color: #4B5563; font-weight: 600;">Change Regularly</p>
                                                    </div>
                                                </td>
                                                <td width="33%" align="center" valign="top" style="padding: 10px;">
                                                    <div style="background-color: #F3F4F6; border-radius: 8px; padding: 20px 15px; height: 100%;">
                                                        <div style="font-size: 20px; margin-bottom: 8px;">🚫</div>
                                                        <p style="margin: 0; font-size: 13px; color: #4B5563; font-weight: 600;">Don't Share Codes</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Security Notice -->
                    <tr>
                        <td align="center" style="padding: 0 30px 40px 30px;">
                            <table role="presentation" border="0" cellspacing="0" cellpadding="0" width="100%">
                                <tr>
                                    <td style="padding: 20px; background-color: #FEF2F2; border-radius: 8px; border-left: 4px solid #EF4444;">
                                        <p style="margin: 0; font-size: 14px; line-height: 21px; color: #7F1D1D; text-align: center;">
                                            <strong>Security Notice:</strong> If you didn't request this password reset, please ignore this email and contact our support team immediately.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #1F2937; padding: 30px 20px; border-radius: 0 0 12px 12px;">
                            <table role="presentation" border="0" cellspacing="0" cellpadding="0" width="100%">
                                <tr>
                                    <td align="center">
                                        <p style="margin: 0 0 10px 0; font-size: 14px; line-height: 21px; color: #D1D5DB;">
                                            &copy; 2025 ExamApp. All rights reserved.
                                        </p>
                                        <p style="margin: 0; font-size: 13px; line-height: 19px; color: #9CA3AF;">
                                            Securing your educational journey
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;
}

exports.generateActivationEmail = generateActivationEmail;
exports.resetPasswordTemp = resetPasswordTemp;
