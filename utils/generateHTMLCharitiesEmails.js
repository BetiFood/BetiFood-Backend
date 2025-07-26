function generateDonationConfirmationEmail({
  charityName,
  confirmationLink,
  meals,
  message,
  amount,
}) {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const logoUrl = `https://res.cloudinary.com/${cloudName}/image/upload/v1751602440/with_bg_fbnbll.svg`;
  return `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>طلب تبرع جديد</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f7f7f7;">
    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
        <tr>
            <td align="center" style="padding: 20px 0;">
                <table role="presentation" border="0" cellspacing="0" cellpadding="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.07);">
                    <!-- Header -->
                    <tr>
                        <td align="center" style="padding: 30px 20px 20px 20px; border-bottom: 1px solid #eaeaea;">
                            <img src="${logoUrl}" alt="BetiFood Logo" width="80" style="margin-bottom: 16px;" />
                            <h1 style="margin: 10px 0 5px 0; font-size: 24px; color: #ff7043;">بيتي فود</h1>
                        </td>
                    </tr>
                    <!-- Main Content -->
                    <tr>
                        <td align="center" style="padding: 40px 30px;">
                            <h2 style="margin: 0 0 20px 0; color: #333333; font-size: 20px; text-align: center;">تأكيد طلب التبرع</h2>
                            <p style="margin: 0 0 15px 0; font-size: 16px; line-height: 24px; color: #555555; text-align: center;">
                                مرحباً ${charityName}،<br>
                                لديك طلب تبرع جديد بقيمة <strong>${amount} جنية مصري</strong>.
                            </p>
                            <p style="margin: 0 0 10px 0; font-size: 15px; color: #555555; text-align: center;">
                                الرسالة: ${message || "لا توجد رسالة"}
                            </p>
                            <p style="margin: 0 0 10px 0; font-size: 15px; color: #555555; text-align: center;">الوجبات المطلوبة:</p>
                            <ul style="list-style: none; padding: 0; margin: 0 0 20px 0;">
                              ${meals
                                .map(
                                  (m) =>
                                    `<li style='font-size:15px; color:#444; margin-bottom:4px;'>🍽️ ${m.name} - الكمية: ${m.quantity}</li>`
                                )
                                .join("")}
                            </ul>
                            <!-- CTA Button -->
                            <table role="presentation" border="0" cellspacing="0" cellpadding="0" width="100%">
                                <tr>
                                    <td align="center" style="padding: 20px 0;">
                                        <a href="${confirmationLink}" target="_blank" style="display: inline-block; padding: 15px 30px; font-size: 16px; font-weight: bold; color: #ffffff; background: #ff7043; text-decoration: none; border-radius: 4px; text-align: center;">تأكيد التبرع</a>
                                    </td>
                                </tr>
                            </table>
                            <!-- Fallback Text Link -->
                            <p style="margin: 25px 0 0 0; font-size: 14px; line-height: 21px; color: #777777; text-align: center;">
                                إذا لم يعمل الزر، انسخ الرابط التالي والصقه في متصفحك:<br>
                                <a href="${confirmationLink}" style="color: #ff7043; text-decoration: underline; word-break: break-all;">${confirmationLink}</a>
                            </p>
                        </td>
                    </tr>
                    <!-- Support Note -->
                    <tr>
                        <td align="center" style="padding: 20px 30px 40px 30px;">
                            <p style="margin: 0; font-size: 14px; line-height: 21px; color: #777777; text-align: center;">
                                إذا لم تطلب هذا التبرع، يرجى تجاهل هذه الرسالة.
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

function generateDonationReadyForPickupEmail({
  charityName,
  cook,
  meals,
  message,
  amount,
}) {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const logoUrl = `https://res.cloudinary.com/${cloudName}/image/upload/v1751602440/with_bg_fbnbll.svg`;
  // Prepare Google Maps link for cook location
  let locationHtml = "غير محدد";
  if (cook.location && cook.location.latitude && cook.location.longitude) {
    const lat = cook.location.latitude;
    const lng = cook.location.longitude;
    locationHtml = `<a href="https://www.google.com/maps?q=${lat},${lng}" target="_blank" style="color: #007bff; text-decoration: underline;">اضغط هنا لعرض الموقع على الخريطة</a>`;
  }
  return `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>طلب التبرع جاهز للاستلام</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f7f7f7;">
    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
        <tr>
            <td align="center" style="padding: 20px 0;">
                <table role="presentation" border="0" cellspacing="0" cellpadding="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.07);">
                    <!-- Header -->
                    <tr>
                        <td align="center" style="padding: 30px 20px 20px 20px; border-bottom: 1px solid #eaeaea;">
                            <img src="${logoUrl}" alt="BetiFood Logo" width="80" style="margin-bottom: 16px;" />
                            <h1 style="margin: 10px 0 5px 0; font-size: 24px; color: #ff7043;">بيتي فود</h1>
                        </td>
                    </tr>
                    <!-- Main Content -->
                    <tr>
                        <td align="center" style="padding: 40px 30px;">
                            <h2 style="margin: 0 0 20px 0; color: #333333; font-size: 20px; text-align: center;">طلب التبرع جاهز للاستلام</h2>
                            <p style="margin: 0 0 15px 0; font-size: 16px; line-height: 24px; color: #555555; text-align: center;">
                                مرحباً ${charityName}،<br>
                                تم تجهيز طلب التبرع الخاص بكم بقيمة <strong>${amount} جنية مصري</strong>.
                            </p>
                            <p style="margin: 0 0 10px 0; font-size: 15px; color: #555555; text-align: center;">
                                الرسالة: ${message || "لا توجد رسالة"}
                            </p>
                            <p style="margin: 0 0 10px 0; font-size: 15px; color: #555555; text-align: center;">الوجبات المطلوبة:</p>
                            <ul style="list-style: none; padding: 0; margin: 0 0 20px 0;">
                              ${meals
                                .map(
                                  (m) =>
                                    `<li style='font-size:15px; color:#444; margin-bottom:4px;'>🍽️ ${m.name} - الكمية: ${m.quantity}</li>`
                                )
                                .join("")}
                            </ul>
                            <h3 style="margin: 20px 0 10px 0; color: #ff7043; font-size: 18px;">معلومات الطباخ لاستلام الطلب:</h3>
                            <ul style="list-style: none; padding: 0; margin: 0 0 20px 0;">
                              <li style="font-size:15px; color:#444;">👨‍🍳 الاسم: ${
                                cook.name
                              }</li>
                              <li style="font-size:15px; color:#444;">📞 الهاتف: ${
                                cook.phone
                              }</li>
                              <li style="font-size:15px; color:#444;">🏠 العنوان: ${
                                cook.address || "غير محدد"
                              }</li>
                              <li style="font-size:15px; color:#444;">📍 الموقع: ${locationHtml}</li>
                            </ul>
                            <p style="margin: 0 0 10px 0; font-size: 15px; color: #555555; text-align: center;">يرجى التوجه إلى موقع الطباخ لاستلام الوجبات.</p>
                        </td>
                    </tr>
                    <!-- Support Note -->
                    <tr>
                        <td align="center" style="padding: 20px 30px 40px 30px;">
                            <p style="margin: 0; font-size: 14px; line-height: 21px; color: #777777; text-align: center;">
                                إذا لم تطلب هذا التبرع، يرجى تجاهل هذه الرسالة.
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

exports.generateDonationConfirmationEmail = generateDonationConfirmationEmail;
exports.generateDonationReadyForPickupEmail =
  generateDonationReadyForPickupEmail;
