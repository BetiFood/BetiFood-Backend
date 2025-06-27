const sendResponse = (
  res,
  { statusCode = 200, success = true, message = "", data, stack }
) => {
  const response = { success };

  if (message) response.message = message;
  if (success && data !== undefined) response.data = data;

  if (!success && stack) response.stack = stack;

  return res.status(statusCode).json(response);
};


module.exports = sendResponse;
