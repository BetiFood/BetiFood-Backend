//  import sendResponse from "../utils/response.js";
const { sendResponse } = require("../utils/response.js");

const errorHandler = (error, req, res, next) => {
  const isDev = process.env.NODE_ENV === "dev";
  return sendResponse(res, {
    statusCode: error.statusCode || 500,
    success: false,
    message: error.message || "Internal server error",
    ...(isDev && { stack: error.stack }),
  });
};

module.exports = errorHandler;
