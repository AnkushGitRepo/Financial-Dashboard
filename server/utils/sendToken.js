export const sendToken = (user, statusCode, message, res, rememberMe = false) => {
  const token = user.generateToken();
  const options = {
    httpOnly: true,
  };

  if (rememberMe) {
    options.expires = new Date(
      Date.now() + process.env.COOKIE_EXPIRE * 24 * 60 * 60 * 1000
    );
  }

  res
    .status(statusCode)
    .cookie("token", token, options)
    .json({
      success: true,
      user,
      message,
      token,
    });
};
