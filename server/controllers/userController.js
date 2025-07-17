import ErrorHandler from "../middlewares/error.js";
import { catchAsyncError } from "../middlewares/catchAsyncError.js";
import { User } from "../models/userModel.js";
import { sendEmail } from "../utils/sendEmail.js";
import twilio from "twilio";
import { sendToken } from "../utils/sendToken.js";
import crypto from "crypto";
import cloudinary from "cloudinary";
import DataUriParser from "datauri/parser.js";
import { config } from "dotenv";
import mongoose from "mongoose";

config();

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);



export const register = catchAsyncError(async (req, res, next) => {
  try {
    const { name, email, phone, password, verificationMethod } = req.body;
    if (!name || !email || !phone || !password || !verificationMethod) {
      return next(new ErrorHandler("All fields are required.", 400));
    }
    function validatePhoneNumber(phone) {
      const phoneRegex = /^\+?[1-9]\d{9,14}$/; // More flexible phone number validation (10-15 digits, optional +)
      return phoneRegex.test(phone);
    }

    if (!validatePhoneNumber(phone)) {
      return next(new ErrorHandler("Invalid phone number.", 400));
    }

    const existingUser = await User.findOne({
      $or: [
        {
          email,
          accountVerified: true,
        },
        {
          phone,
          accountVerified: true,
        },
      ],
    });

    if (existingUser) {
      return next(new ErrorHandler("Phone or Email is already used.", 400));
    }

    const registerationAttemptsByUser = await User.find({
      $or: [
        { phone, accountVerified: false },
        { email, accountVerified: false },
      ],
    });

    if (registerationAttemptsByUser.length > 3) {
      return next(
          new ErrorHandler(
              "You have exceeded the maximum number of attempts (3). Please try again after an hour.",
              400
          )
      );
    }

    const userData = {
      name,
      email,
      phone,
      password,
    };

    const user = await User.create(userData);
    const verificationCode = await user.generateVerificationCode();
    await user.save();
    sendVerificationCode(
        verificationMethod,
        verificationCode,
        name,
        email,
        phone,
        res
    );
  } catch (error) {
    next(error);
  }
});

async function sendVerificationCode(
    verificationMethod,
    verificationCode,
    name,
    email,
    phone,
    res
) {
  try {
    if (verificationMethod === "email") {
      const message = generateEmailTemplate(verificationCode);
      sendEmail({ email, subject: "Your Verification Code", message });
      res.status(200).json({
        success: true,
        message: `Verification email successfully sent to ${name}`,
      });
    } else if (verificationMethod === "phone") {
      const verificationCodeWithSpace = verificationCode
          .toString()
          .split("")
          .join(" ");
      let message = `Your verification code is ${verificationCodeWithSpace}. Please enter this code to verify your account.`;
      await client.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phone,
      });
      res.status(200).json({
        success: true,
        message: `OTP sent.`,
      });
    } else {
      return res.status(500).json({
        success: false,
        message: "Invalid verification method.",
      });
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Verification code failed to send.",
    });
  }
}

function generateEmailTemplate(verificationCode) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px; background-color: #f9f9f9;">
      <h2 style="color: #4CAF50; text-align: center;">Verification Code</h2>
      <p style="font-size: 16px; color: #333;">Dear User,</p>
      <p style="font-size: 16px; color: #333;">Your verification code is:</p>
      <div style="text-align: center; margin: 20px 0;">
        <span style="display: inline-block; font-size: 24px; font-weight: bold; color: #4CAF50; padding: 10px 20px; border: 1px solid #4CAF50; border-radius: 5px; background-color: #e8f5e9;">
          ${verificationCode}
        </span>
      </div>
      <p style="font-size: 16px; color: #333;">Please use this code to verify your email address. The code will expire in 10 minutes.</p>
      <p style="font-size: 16px; color: #333;">If you did not request this, please ignore this email.</p>
      <footer style="margin-top: 20px; text-align: center; font-size: 14px; color: #999;">
        <p>Thank you,<br>Your Company Team</p>
        <p style="font-size: 12px; color: #aaa;">This is an automated message. Please do not reply to this email.</p>
      </footer>
    </div>
  `;
}

export const verifyOTP = catchAsyncError(async (req, res, next) => {
  const { email, otp, phone } = req.body;

  function validatePhoneNumber(phone) {
    const phoneRegex = /^\+?[1-9]\d{9,14}$/; // More flexible phone number validation (10-15 digits, optional +)
    return phoneRegex.test(phone);
  }

  if (!validatePhoneNumber(phone)) {
    return next(new ErrorHandler("Invalid phone number.", 400));
  }

  try {
    const userAllEntries = await User.find({
      $or: [
        {
          email,
          accountVerified: false,
        },
        {
          phone,
          accountVerified: false,
        },
      ],
    }).sort({ createdAt: -1 });

    if (!userAllEntries) {
      return next(new ErrorHandler("User not found.", 404));
    }

    let user;

    if (userAllEntries.length > 1) {
      user = userAllEntries[0];

      await User.deleteMany({
        _id: { $ne: user._id },
        $or: [
          { phone, accountVerified: false },
          { email, accountVerified: false },
        ],
      });
    } else {
      user = userAllEntries[0];
    }

    if (user.verificationCode !== Number(otp)) {
      return next(new ErrorHandler("Invalid OTP.", 400));
    }

    const currentTime = Date.now();

    const verificationCodeExpire = new Date(
        user.verificationCodeExpire
    ).getTime();
    console.log(currentTime);
    console.log(verificationCodeExpire);
    if (currentTime > verificationCodeExpire) {
      return next(new ErrorHandler("OTP Expired.", 400));
    }

    user.accountVerified = true;
    user.verificationCode = null;
    user.verificationCodeExpire = null;
    await user.save({ validateModifiedOnly: true });

    sendToken(user, 200, "Account Verified.", res);
  } catch (error) {
    return next(new ErrorHandler("Internal Server Error.", 500));
  }
});

export const login = catchAsyncError(async (req, res, next) => {
  const { email, password, rememberMe } = req.body;
  if (!email || !password) {
    return next(new ErrorHandler("Email and password are required.", 400));
  }
  const user = await User.findOne({ email, accountVerified: true }).select(
      "+password"
  );
  if (!user) {
    return next(new ErrorHandler("Invalid email or password.", 400));
  }
  const isPasswordMatched = await user.comparePassword(password);
  if (!isPasswordMatched) {
    return next(new ErrorHandler("Invalid email or password.", 400));
  }
  sendToken(user, 200, "User logged in successfully.", res, rememberMe);
});

export const logout = catchAsyncError(async (req, res, next) => {
  res
      .status(200)
      .cookie("token", "", {
        expires: new Date(Date.now()),
        httpOnly: true,
      })
      .json({
        success: true,
        message: "Logged out successfully.",
      });
});

export const getUser = catchAsyncError(async (req, res, next) => {
  const user = req.user;
  res.status(200).json({
    success: true,
    user,
  });
});

export const forgotPassword = catchAsyncError(async (req, res, next) => {
  const user = await User.findOne({
    email: req.body.email,
    accountVerified: true,
  });
  if (!user) {
    return next(new ErrorHandler("User not found.", 404));
  }
  const resetToken = user.generateResetPasswordToken();
  await user.save({ validateBeforeSave: false });
  const resetPasswordUrl = `${process.env.FRONTEND_URL}/password/reset/${resetToken}`;

  const message = `Your Reset Password Token is:- \n\n ${resetPasswordUrl} \n\n If you have not requested this email then please ignore it.`;

  try {
    sendEmail({
      email: user.email,
      subject: "MERN AUTHENTICATION APP RESET PASSWORD",
      message,
    });
    res.status(200).json({
      success: true,
      message: `Email sent to ${user.email} successfully.`,
    });
  } catch (error) {
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save({ validateBeforeSave: false });
    return next(
        new ErrorHandler(
            error.message ? error.message : "Cannot send reset password token.",
            500
        )
    );
  }
});

export const resetPassword = catchAsyncError(async (req, res, next) => {
  const { token } = req.params;
  const resetPasswordToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");
  const user = await User.findOne({
    resetPasswordToken,
    resetPasswordExpire: { $gt: Date.now() },
  });
  if (!user) {
    return next(
        new ErrorHandler(
            "Reset password token is invalid or has been expired.",
            400
        )
    );
  }

  if (req.body.password !== req.body.confirmPassword) {
    return next(
        new ErrorHandler("Password & confirm password do not match.", 400)
    );
  }

  user.password = req.body.password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  await user.save();

  sendToken(user, 200, "Reset Password Successfully.", res);
});

export const updatePassword = catchAsyncError(async (req, res, next) => {
  const { oldPassword, newPassword, confirmPassword } = req.body;

  if (!oldPassword || !newPassword || !confirmPassword) {
    return next(new ErrorHandler("Please fill all the fields.", 400));
  }

  if (newPassword !== confirmPassword) {
    return next(
      new ErrorHandler("Password and confirm password do not match.", 400)
    );
  }

  const user = await User.findById(req.user.id).select("+password");

  const isPasswordMatched = await user.comparePassword(oldPassword);

  if (!isPasswordMatched) {
    return next(new ErrorHandler("Incorrect old password.", 400));
  }

  user.password = newPassword;
  await user.save();

  sendToken(user, 200, "Password updated successfully.", res);
});

export const updateProfile = catchAsyncError(async (req, res, next) => {
  const newUserData = {
    name: req.body.name,
    email: req.body.email,
    phone: req.body.phone,
    address: req.body.address,
    pincode: req.body.pincode,
    city: req.body.city,
    area: req.body.area,
    dob: req.body.dob,
    incomeLevel: req.body.incomeLevel,
    aadhaarPan: req.body.aadhaarPan,
    occupation: req.body.occupation,
    darkMode: req.body.darkMode,
    stockRebalancingUpdates: req.body.stockRebalancingUpdates,
    ipoInvestmentAdvice: req.body.ipoInvestmentAdvice,
    newsletter: req.body.newsletter,
    promotionalMails: req.body.promotionalMails,
  };

  if (req.file) {
    try {
      // Find the user to get the old avatar public_id
      const user = await User.findById(req.user.id);
      console.log("User fetched for avatar deletion:", user);
      console.log("User avatar public_id:", user.avatar ? user.avatar.public_id : "No avatar or public_id");

      // If an old avatar exists, destroy it from Cloudinary
      if (user.avatar && user.avatar.public_id) {
        cloudinary.v2.config({
          cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
          api_key: process.env.CLOUDINARY_API_KEY,
          api_secret: process.env.CLOUDINARY_API_SECRET,
        });
        try {
          await cloudinary.v2.uploader.destroy(user.avatar.public_id);
          console.log("Old avatar destroyed from Cloudinary:", user.avatar.public_id);
        } catch (destroyError) {
          console.error("Error destroying old avatar from Cloudinary:", destroyError);
        }
      }

      // Configure Cloudinary right before upload to ensure env vars are loaded
      cloudinary.v2.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
      });

      const parser = new DataUriParser();
      const fileUri = parser.format(
        req.file.originalname,
        req.file.buffer
      ).content;

      const myCloud = await cloudinary.v2.uploader.upload(fileUri);

      newUserData.avatar = {
        public_id: myCloud.public_id,
        url: myCloud.secure_url,
      };
    } catch (cloudinaryError) {
      console.error("Cloudinary upload failed:", cloudinaryError);
      return next(new ErrorHandler("Failed to upload image to Cloudinary.", 500));
    }
  }

  const user = await User.findByIdAndUpdate(req.user.id, newUserData, {
    new: true,
    runValidators: true,
    useFindAndModify: false,
  });

  res.status(200).json({
    success: true,
    user,
  });
});

export const sendOtpForUpdate = catchAsyncError(async (req, res, next) => {
  const { email, phone } = req.body;
  const user = req.user;

  if (email) {
    const existingUser = await User.findOne({ email, accountVerified: true });
    if (existingUser && existingUser._id.toString() !== user._id.toString()) {
      return next(new ErrorHandler("Email is already registered by another user.", 400));
    }
    user.verificationCode = await user.generateVerificationCode();
    user.verificationCodeExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save({ validateBeforeSave: false });

    const message = generateEmailTemplate(user.verificationCode);
    sendEmail({ email, subject: "Your Verification Code for Update", message });

    res.status(200).json({
      success: true,
      message: "OTP sent to your new email.",
    });
  } else if (phone) {
    const existingUser = await User.findOne({ phone, accountVerified: true });
    if (existingUser && existingUser._id.toString() !== user._id.toString()) {
      return next(new ErrorHandler("Phone number is already registered by another user.", 400));
    }
    user.verificationCode = await user.generateVerificationCode();
    user.verificationCodeExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save({ validateBeforeSave: false });

    const verificationCodeWithSpace = user.verificationCode
      .toString()
      .split("")
      .join(" ");
    let message = `Your verification code is ${verificationCodeWithSpace}. Please enter this code to verify your account.`;
    await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone,
    });

    res.status(200).json({
      success: true,
      message: "OTP sent to your new phone number.",
    });
  } else {
    return next(new ErrorHandler("Please provide an email or phone number.", 400));
  }
});

export const verifyOtpForUpdate = catchAsyncError(async (req, res, next) => {
  const { otp, email, phone } = req.body;
  const user = req.user;

  if (user.verificationCode !== Number(otp)) {
    return next(new ErrorHandler("Invalid OTP.", 400));
  }

  const currentTime = Date.now();
  const verificationCodeExpire = new Date(user.verificationCodeExpire).getTime();

  if (currentTime > verificationCodeExpire) {
    return next(new ErrorHandler("OTP Expired.", 400));
  }

  if (email) {
    user.email = email;
  } else if (phone) {
    user.phone = phone;
  }

  user.verificationCode = undefined;
  user.verificationCodeExpire = undefined;
  await user.save({ validateModifiedOnly: true });

  res.status(200).json({
    success: true,
    message: "Email/Phone updated successfully.",
  });
});

export const getIpoData = catchAsyncError(async (req, res, next) => {
  try {
    const db = mongoose.connection.useDb("financial-dashboard");
    const collection = db.collection("ipo_data");
    const ipoData = await collection.find({}).toArray();
    res.status(200).json({
      success: true,
      ipoData,
    });
  } catch (error) {
    return next(new ErrorHandler("Failed to fetch IPO data.", 500));
  }
});
  
