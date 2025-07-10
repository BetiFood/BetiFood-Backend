//  import sendResponse from "../utils/response.js";
const { sendResponse } = require("../utils/response.js");

const errorHandler = (error, req, res, next) => {
  const isDev = process.env.NODE_ENV === "dev";
  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || "خطأ في الخادم الداخلي",
    ...(isDev && error.stack ? { stack: error.stack } : {})
  });
};

module.exports = errorHandler;
