import UserModel from "../models/user.model.js";
import bcryptjs from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import sendEmail from "../config/sendEmail.js";
import verifyEmailTemplate from "../utils/verifyEmailTemplate.js";
import generatedAccessToken from "../utils/generatedAccessToken.js";
import generatedRefreshToken from "../utils/generatedRefreshToken.js";
import { sendResponse } from "../utils/Sendresponse.js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const isProd = process.env.NODE_ENV === "production";

function getCookieOptions() {
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "None" : "Lax",
  };
}

function generateOtp() {
  // crypto.randomInt is cryptographically secure, unlike Math.random()
  return crypto.randomInt(100000, 999999).toString();
}

function isStrongPassword(password) {
  // at least 8 chars, one uppercase, one lowercase, one number, one special char
  const strongRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
  return strongRegex.test(password);
}

function logError(context, error) {
  console.error(`[${context}]`, error);
}

// REGISTER
export async function registerUserController(req, res) {
  try {
    const { name, email, password, adminCode } = req.body;

    if (!name || !email || !password) {
      return sendResponse(res, 400, false, "Provide all fields");
    }

    if (!EMAIL_REGEX.test(email)) {
      return sendResponse(res, 400, false, "Invalid email address");
    }

    if (!isStrongPassword(password)) {
      return sendResponse(
        res,
        400,
        false,
        "Password must be at least 8 characters and include uppercase, lowercase, a number, and a special character"
      );
    }

    const existingUser = await UserModel.findOne({ email });
    if (existingUser) {
      return sendResponse(res, 400, false, "Email already registered");
    }

    let role = "USER";
    if (adminCode) {
      if (adminCode !== process.env.ADMIN_SIGNUP_CODE) {
        return sendResponse(res, 403, false, "Invalid admin code");
      }
      role = "ADMIN";
    }

    const otpCode = generateOtp();
    const hashedPassword = await bcryptjs.hash(password, 10);

    const user = new UserModel({
      name,
      email,
      password: hashedPassword,
      otp: otpCode,
      otpExpiry: Date.now() + 10 * 60 * 1000,
      role,
    });

    await user.save();

    const emailResult = await sendEmail({
      sendTo: email,
      subject: "Verify your Lilium's Glee account",
      text: `Your OTP is ${otpCode}`,
      html: verifyEmailTemplate(name, otpCode),
    });

    if (!emailResult.success) {
      logError("registerUserController - sendEmail", emailResult.error);
      return sendResponse(
        res,
        201,
        true,
        "Account created, but the verification email failed to send. Please use 'resend OTP' or contact support.",
        { emailSent: false }
      );
    }

    return sendResponse(res, 200, true, "Registered successfully. Check your email for OTP.");
  } catch (error) {
    logError("registerUserController", error);
    return sendResponse(res, 500, false, "Internal server error");
  }
}

// VERIFY EMAIL
export async function verifyEmailController(req, res) {
  try {
    const { email, otp } = req.body;
    const user = await UserModel.findOne({ email });

    if (!user) return sendResponse(res, 400, false, "User not found");
    if (user.otp !== otp) return sendResponse(res, 400, false, "Invalid OTP");
    if (user.otpExpiry < Date.now()) return sendResponse(res, 400, false, "OTP expired");

    user.verify_email = true;
    user.otp = null;
    user.otpExpiry = null;
    await user.save();

    return sendResponse(res, 200, true, "Email verified");
  } catch (error) {
    logError("verifyEmailController", error);
    return sendResponse(res, 500, false, "Internal server error");
  }
}

// LOGIN
export async function loginUserController(req, res) {
  try {
    const { email, password } = req.body;
    const user = await UserModel.findOne({ email });

    if (!user) return sendResponse(res, 400, false, "Invalid email or password");

    if (!user.verify_email) {
      return sendResponse(res, 403, false, "Please verify your email first");
    }

    const isMatch = await bcryptjs.compare(password, user.password);
    if (!isMatch) return sendResponse(res, 400, false, "Invalid email or password");

    const accessToken = await generatedAccessToken(user._id);
    const refreshToken = await generatedRefreshToken(user._id);

    user.refresh_token = refreshToken;
    user.last_login_date = new Date();
    await user.save();

    const cookiesOption = getCookieOptions();
    res.cookie("accessToken", accessToken, cookiesOption);
    res.cookie("refreshToken", refreshToken, cookiesOption);

    // Tokens live in httpOnly cookies only - not echoed back in the body
    return sendResponse(res, 200, true, "Login successful", { role: user.role, name: user.name });
  } catch (error) {
    logError("loginUserController", error);
    return sendResponse(res, 500, false, "Internal server error");
  }
}

// LOGOUT
export async function logoutController(req, res) {
  try {
    const userId = req.userId;
    const cookiesOption = getCookieOptions();

    res.clearCookie("accessToken", cookiesOption);
    res.clearCookie("refreshToken", cookiesOption);

    if (userId) {
      await UserModel.findByIdAndUpdate(userId, { refresh_token: "" });
    }

    return sendResponse(res, 200, true, "Logout successful");
  } catch (error) {
    logError("logoutController", error);
    return sendResponse(res, 500, false, "Internal server error");
  }
}

// GET USER DETAILS
export async function userDetails(req, res) {
  try {
    const user = await UserModel.findById(req.userId).select("-password -refresh_token -otp -otpExpiry");
    return sendResponse(res, 200, true, "User fetched", user);
  } catch (error) {
    logError("userDetails", error);
    return sendResponse(res, 500, false, "Internal server error");
  }
}

// GET ALL USERS (admin only) - supports search by name/email, role/status filter, pagination
export async function getAllUsers(req, res) {
  try {
    const { search, role, status, page = 1, limit = 20 } = req.query;

    let filter = {};

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    if (role && role !== "All") filter.role = role;
    if (status && status !== "All") filter.status = status;

    let skip = (Number(page) - 1) * Number(limit);

    const [users, total] = await Promise.all([
      UserModel.find(filter)
        .select("-password -refresh_token -otp -otpExpiry")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      UserModel.countDocuments(filter),
    ]);

    return sendResponse(res, 200, true, "Users fetched", {
      users,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
    });
  } catch (error) {
    logError("getAllUsers", error);
    return sendResponse(res, 500, false, "Internal server error");
  }
}

// BLOCK / UNBLOCK USER (admin only) - toggles between Active and Suspended
export async function toggleUserStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ["Active", "Inactive", "Suspended"];
    if (!validStatuses.includes(status)) {
      return sendResponse(res, 400, false, "Invalid status value");
    }

    if (id === req.userId) {
      return sendResponse(res, 400, false, "You cannot change your own account status");
    }

    const user = await UserModel.findById(id);
    if (!user) {
      return sendResponse(res, 404, false, "User not found");
    }

    user.status = status;

    // a suspended user's existing session should stop working immediately
    if (status === "Suspended") {
      user.refresh_token = "";
    }

    await user.save();

    return sendResponse(res, 200, true, `User status updated to ${status}`, {
      _id: user._id,
      status: user.status,
    });
  } catch (error) {
    logError("toggleUserStatus", error);
    return sendResponse(res, 500, false, "Internal server error");
  }
}

// DELETE USER (admin only)
export async function deleteUser(req, res) {
  try {
    const { id } = req.params;

    if (id === req.userId) {
      return sendResponse(res, 400, false, "You cannot delete your own account");
    }

    const user = await UserModel.findByIdAndDelete(id);
    if (!user) {
      return sendResponse(res, 404, false, "User not found");
    }

    return sendResponse(res, 200, true, "User deleted");
  } catch (error) {
    logError("deleteUser", error);
    return sendResponse(res, 500, false, "Internal server error");
  }
}

// UPDATE USER
export async function updateUserDetails(req, res) {
  try {
    const { name, email, mobile } = req.body;

    if (email) {
      if (!EMAIL_REGEX.test(email)) {
        return sendResponse(res, 400, false, "Invalid email address");
      }

      // prevent taking over someone else's email
      const emailExists = await UserModel.findOne({ email, _id: { $ne: req.userId } });
      if (emailExists) {
        return sendResponse(res, 400, false, "Email already in use");
      }
    }

    const updatedUser = await UserModel.findByIdAndUpdate(
      req.userId,
      { name, email, mobile },
      { new: true }
    ).select("-password -refresh_token -otp -otpExpiry");

    return sendResponse(res, 200, true, "Updated successfully", updatedUser);
  } catch (error) {
    logError("updateUserDetails", error);
    return sendResponse(res, 500, false, "Internal server error");
  }
}

// FORGOT PASSWORD
export async function forgotPasswordController(req, res) {
  try {
    const { email } = req.body;
    const user = await UserModel.findOne({ email });

    // don't reveal whether the email exists - respond the same either way
    if (!user) {
      return sendResponse(res, 200, true, "If that email is registered, an OTP has been sent");
    }

    const otp = generateOtp();
    await UserModel.findByIdAndUpdate(user._id, { otp, otpExpiry: Date.now() + 600000 });

    const emailResult = await sendEmail({
      sendTo: email,
      subject: "Reset your Lilium's Glee password",
      text: `Your OTP is ${otp}`,
      html: verifyEmailTemplate(user.name, otp),
    });

    if (!emailResult.success) {
      logError("forgotPasswordController - sendEmail", emailResult.error);
    }

    return sendResponse(res, 200, true, "If that email is registered, an OTP has been sent");
  } catch (error) {
    logError("forgotPasswordController", error);
    return sendResponse(res, 500, false, "Internal server error");
  }
}

// VERIFY FORGOT PASSWORD OTP
export async function verifyforgotPasswordOtp(req, res) {
  try {
    const { email, otp } = req.body;
    const user = await UserModel.findOne({ email });

    if (!user) return sendResponse(res, 404, false, "User not found");
    if (otp !== user.otp) return sendResponse(res, 400, false, "Invalid OTP");
    if (user.otpExpiry < Date.now()) return sendResponse(res, 400, false, "OTP expired");

    user.otp = null;
    user.otpExpiry = null;
    await user.save();

    return sendResponse(res, 200, true, "OTP verified");
  } catch (error) {
    logError("verifyforgotPasswordOtp", error);
    return sendResponse(res, 500, false, "Internal server error");
  }
}

// RESET PASSWORD
export async function resetPassword(req, res) {
  try {
    const { email, newPassword, confirmPassword } = req.body;

    if (!email || !newPassword || !confirmPassword) {
      return sendResponse(res, 400, false, "Provide all fields");
    }

    if (!isStrongPassword(newPassword)) {
      return sendResponse(
        res,
        400,
        false,
        "Password must be at least 8 characters and include uppercase, lowercase, a number, and a special character"
      );
    }

    if (newPassword !== confirmPassword) {
      return sendResponse(res, 400, false, "Passwords do not match");
    }

    const user = await UserModel.findOne({ email });
    if (!user) return sendResponse(res, 400, false, "User not found");

    user.password = await bcryptjs.hash(newPassword, 10);
    // invalidate any existing session on password reset
    user.refresh_token = "";
    await user.save();

    return sendResponse(res, 200, true, "Password updated");
  } catch (error) {
    logError("resetPassword", error);
    return sendResponse(res, 500, false, "Internal server error");
  }
}

// REFRESH TOKEN (with rotation)
export async function refreshToken(req, res) {
  try {
    const token = req.cookies.refreshToken;
    if (!token) {
      return sendResponse(res, 401, false, "No refresh token provided");
    }

    let verifyToken;
    try {
      verifyToken = jwt.verify(token, process.env.SECRET_KEY_REFRESH_TOKEN);
    } catch {
      return sendResponse(res, 401, false, "Refresh token expired or invalid");
    }

    const user = await UserModel.findById(verifyToken.id);

    // the stored token must match exactly - if it doesn't, this token was
    // already rotated/revoked (e.g. reused after logout or a prior refresh)
    if (!user || user.refresh_token !== token) {
      return sendResponse(res, 401, false, "Refresh token revoked");
    }

    // rotate: issue a brand new refresh token and invalidate the old one
    const newAccessToken = await generatedAccessToken(user._id);
    const newRefreshToken = await generatedRefreshToken(user._id);

    user.refresh_token = newRefreshToken;
    await user.save();

    const cookiesOption = getCookieOptions();
    res.cookie("accessToken", newAccessToken, cookiesOption);
    res.cookie("refreshToken", newRefreshToken, cookiesOption);

    return sendResponse(res, 200, true, "Token refreshed");
  } catch (error) {
    logError("refreshToken", error);
    return sendResponse(res, 500, false, "Internal server error");
  }
}