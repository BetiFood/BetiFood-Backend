const Beneficiary = require("../models/Beneficiary");

exports.createBeneficiary = async (req, res) => {
  try {
    const { name, address, phone, notes } = req.body;
    if (!name || !address) {
      return res.status(400).json({ message: "الاسم والعنوان مطلوبان" });
    }
    const isActive = req.user.role === "admin";
    const beneficiary = await Beneficiary.create({ name, address, phone, notes, isActive });
    res.status(201).json({ message: isActive ? "تم إضافة المستفيد بنجاح" : "تم إرسال طلب إضافة المستفيد بانتظار موافقة الإدارة", beneficiary });
  } catch (err) {
    res.status(500).json({ message: "حدث خطأ أثناء إضافة المستفيد" });
  }
};

exports.activateBeneficiary = async (req, res) => {
  try {
    const { id } = req.params;
    const beneficiary = await Beneficiary.findById(id);
    if (!beneficiary) {
      return res.status(404).json({ message: "المستفيد غير موجود" });
    }
    beneficiary.isActive = true;
    await beneficiary.save();
    res.status(200).json({ message: "تم تفعيل المستفيد بنجاح", beneficiary });
  } catch (err) {
    res.status(500).json({ message: "حدث خطأ أثناء التفعيل" });
  }
};

exports.deactivateBeneficiary = async (req, res) => {
  try {
    const { id } = req.params;
    const beneficiary = await Beneficiary.findById(id);
    if (!beneficiary) {
      return res.status(404).json({ message: "المستفيد غير موجود" });
    }
    beneficiary.isActive = false;
    await beneficiary.save();
    res.status(200).json({ message: "تم إلغاء تنشيط المستفيد بنجاح", beneficiary });
  } catch (err) {
    res.status(500).json({ message: "حدث خطأ أثناء إلغاء التفعيل" });
  }
}; 