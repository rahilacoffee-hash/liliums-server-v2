
import UserModel from "../models/user.model.js";
import bcryptjs from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import sendEmail from "../config/sendEmail.js";
import verifyEmailTemplate from "../utils/verifyEmailTemplate.js";
import generatedAccessToken from "../utils/generatedAccessToken.js";
import generatedRefreshToken from "../utils/generatedRefreshToken.js";
import { sendResponse } from "../utils/Sendresponse.js";
import { OAuth2Client } from "google-auth-library";
import cloudinary from "../config/cloudinary.js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ACCESS_COOKIE_MS = 15 * 60 * 1000;
const REFRESH_COOKIE_MS = 7 * 24 * 60 * 60 * 1000;

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

function getCookieOptions() {
  const isProduction = process.env.NODE_ENV === "production";

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    path: "/",
  };
}

function setAuthCookies(res, accessToken, refreshToken) {
  const options = getCookieOptions();

  res.cookie("accessToken", accessToken, {
    ...options,
    maxAge: ACCESS_COOKIE_MS,
  });

  res.cookie("refreshToken", refreshToken, {
    ...options,
    maxAge: REFRESH_COOKIE_MS,
  });
}

function clearAuthCookies(res) {
  const options = getCookieOptions();

  res.clearCookie("accessToken", options);
  res.clearCookie("refreshToken", options);
}

function generateOtp() {
  return crypto.randomInt(100000, 1000000).toString();
}

function isStrongPassword(password) {
  if (typeof password !== "string") return false;

  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(
    password,
  );
}

function logError(context, error) {
  // Do not log request bodies, passwords, cookies, or tokens.
  console.error(`[${context}]`, {
    name: error?.name || "Error",
    message: error?.message || "Unexpected error",
    code: error?.code,
  });
}

function normalizeEmail(email) {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}

// REGISTER
export async function registerUserController(req, res) {
  try {
    const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
    const email = normalizeEmail(req.body.email);
    const { password, adminCode } = req.body;

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
        "Password must be at least 8 characters and include uppercase, lowercase, a number, and a special character",
      );
    }

    if (adminCode && adminCode !== process.env.ADMIN_SIGNUP_CODE) {
      return sendResponse(res, 403, false, "Invalid admin code");
    }

    const existingUser = await UserModel.findOne({ email }).lean();

    if (existingUser) {
      return sendResponse(res, 400, false, "Email already registered");
    }

    const role = adminCode ? "ADMIN" : "USER";
    const otpCode = generateOtp();
    const hashedPassword = await bcryptjs.hash(password, 12);

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

    if (!emailResult?.success) {
      logError(
        "registerUserController - sendEmail",
        emailResult?.error || new Error("Email delivery failed"),
      );

      return sendResponse(
        res,
        201,
        true,
        "Account created, but the verification email failed to send. Please request a new OTP or contact support.",
        { emailSent: false },
      );
    }

    return sendResponse(
      res,
      200,
      true,
      "Registered successfully. Check your email for OTP.",
    );
  } catch (error) {
    logError("registerUserController", error);

    if (error?.code === 11000) {
      return sendResponse(res, 409, false, "Email already registered");
    }

    return sendResponse(res, 500, false, "Internal server error");
  }
}

// VERIFY EMAIL
export async function verifyEmailController(req, res) {
  try {
    const email = normalizeEmail(req.body.email);
    const { otp } = req.body;

    if (!email || typeof otp !== "string") {
      return sendResponse(res, 400, false, "Provide email and OTP");
    }

    const user = await UserModel.findOne({ email });

    if (!user) {
      return sendResponse(res, 400, false, "Invalid or expired OTP");
    }

    if (
      !user.otp ||
      user.otp !== otp ||
      !user.otpExpiry ||
      new Date(user.otpExpiry).getTime() < Date.now()
    ) {
      return sendResponse(res, 400, false, "Invalid or expired OTP");
    }

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
    const email = normalizeEmail(req.body.email);
    const { password } = req.body;

    if (!email || typeof password !== "string" || !password) {
      return sendResponse(res, 400, false, "Provide email and password");
    }

    const user = await UserModel.findOne({ email });

    if (!user) {
      return sendResponse(res, 400, false, "Invalid email or password");
    }

    if (user.status === "Suspended") {
      return sendResponse(res, 403, false, "Your account has been suspended");
    }

    if (!user.verify_email) {
      return sendResponse(res, 403, false, "Please verify your email first");
    }

    const isMatch = await bcryptjs.compare(password, user.password);

    if (!isMatch) {
      return sendResponse(res, 400, false, "Invalid email or password");
    }

    const accessToken = await generatedAccessToken(user._id);
    const refreshToken = await generatedRefreshToken(user._id);

    user.refresh_token = refreshToken;
    user.last_login_date = new Date();

    await user.save();

    setAuthCookies(res, accessToken, refreshToken);

    return sendResponse(res, 200, true, "Login successful", {
      role: user.role,
      name: user.name,
    });
  } catch (error) {
    logError("loginUserController", error);
    return sendResponse(res, 500, false, "Internal server error");
  }
}

// LOGOUT
export async function logoutController(req, res) {
  try {
    const userId = req.userId;

    clearAuthCookies(res);

    if (userId) {
      await UserModel.findByIdAndUpdate(userId, {
        $set: { refresh_token: "" },
      });
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
    const user = await UserModel.findById(req.userId).select(
      "-password -refresh_token -otp -otpExpiry -passwordResetExpires -avatarPublicId",
    );

    if (!user) {
      return sendResponse(res, 404, false, "User not found");
    }

    return sendResponse(res, 200, true, "User fetched", user);
  } catch (error) {
    logError("userDetails", error);
    return sendResponse(res, 500, false, "Internal server error");
  }
}

// GET ALL USERS (admin only)
export async function getAllUsers(req, res) {
  try {
    const search =
      typeof req.query.search === "string" ? req.query.search.trim() : "";
    const role = req.query.role;
    const status = req.query.status;

    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(
      100,
      Math.max(1, Number.parseInt(req.query.limit, 10) || 20),
    );

    const filter = {};

    if (search) {
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

      filter.$or = [
        { name: { $regex: escapedSearch, $options: "i" } },
        { email: { $regex: escapedSearch, $options: "i" } },
      ];
    }

    if (role && role !== "All") filter.role = role;
    if (status && status !== "All") filter.status = status;

    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      UserModel.find(filter)
        .select(
          "-password -refresh_token -otp -otpExpiry -passwordResetExpires -avatarPublicId",
        )
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      UserModel.countDocuments(filter),
    ]);

    return sendResponse(res, 200, true, "Users fetched", {
      users,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    logError("getAllUsers", error);
    return sendResponse(res, 500, false, "Internal server error");
  }
}

// BLOCK / UNBLOCK USER (admin only)
export async function toggleUserStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ["Active", "Inactive", "Suspended"];

    if (!validStatuses.includes(status)) {
      return sendResponse(res, 400, false, "Invalid status value");
    }

    if (id === req.userId) {
      return sendResponse(
        res,
        400,
        false,
        "You cannot change your own account status",
      );
    }

    const user = await UserModel.findById(id);

    if (!user) {
      return sendResponse(res, 404, false, "User not found");
    }

    user.status = status;

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
    const name =
      typeof req.body.name === "string" ? req.body.name : undefined;
    const email =
      typeof req.body.email === "string"
        ? normalizeEmail(req.body.email)
        : undefined;
    const mobile =
      typeof req.body.mobile === "string" ? req.body.mobile.trim() : undefined;

    if (name !== undefined && !name.trim()) {
      return sendResponse(res, 400, false, "Name cannot be empty");
    }

    if (email !== undefined && !EMAIL_REGEX.test(email)) {
      return sendResponse(res, 400, false, "Invalid email address");
    }

    if (email !== undefined) {
      const emailExists = await UserModel.findOne({
        email,
        _id: { $ne: req.userId },
      }).lean();

      if (emailExists) {
        return sendResponse(res, 400, false, "Email already in use");
      }
    }

    const user = await UserModel.findById(req.userId);

    if (!user) {
      return sendResponse(res, 404, false, "User not found");
    }

    if (name !== undefined) user.name = name.trim();
    if (email !== undefined) user.email = email;
    if (mobile !== undefined) user.mobile = mobile;

    const previousAvatarPublicId = user.avatarPublicId;

    if (req.file) {
      user.avatar = req.file.path;
      user.avatarPublicId = req.file.filename;
    }

    await user.save();

    if (req.file && previousAvatarPublicId) {
      cloudinary.uploader
        .destroy(previousAvatarPublicId)
        .catch((error) =>
          logError("updateUserDetails - remove old avatar", error),
        );
    }

    const updatedUser = user.toObject();

    for (const key of [
      "password",
      "refresh_token",
      "otp",
      "otpExpiry",
      "passwordResetExpires",
      "avatarPublicId",
    ]) {
      delete updatedUser[key];
    }

    return sendResponse(res, 200, true, "Updated successfully", updatedUser);
  } catch (error) {
    logError("updateUserDetails", error);
    return sendResponse(res, 500, false, "Internal server error");
  }
}

// SAVE SHIPPING ADDRESS
export async function saveShippingAddress(req, res) {
  try {
    const {
      label = "Home",
      fullName,
      phone,
      address,
      city,
      state,
      country = "Nigeria",
    } = req.body;

    const fields = [fullName, phone, address, city, state];

    if (
      !fields.every(
        (value) => typeof value === "string" && value.trim().length > 0,
      )
    ) {
      return sendResponse(
        res,
        400,
        false,
        "Provide all required address fields",
      );
    }

    const user = await UserModel.findById(req.userId);

    if (!user) {
      return sendResponse(res, 404, false, "User not found");
    }

    const normalized = {
      label:
        typeof label === "string" && label.trim() ? label.trim() : "Home",
      fullName: fullName.trim(),
      phone: phone.trim(),
      address: address.trim(),
      city: city.trim(),
      state: state.trim(),
      country:
        typeof country === "string" && country.trim()
          ? country.trim()
          : "Nigeria",
    };

    const existingIndex = user.savedAddresses.findIndex(
      (item) =>
        item.address.toLowerCase() === normalized.address.toLowerCase() &&
        item.city.toLowerCase() === normalized.city.toLowerCase(),
    );

    if (existingIndex >= 0) {
      user.savedAddresses[existingIndex] = normalized;
    } else {
      user.savedAddresses.push(normalized);
    }

    await user.save();

    return sendResponse(res, 200, true, "Address saved", user.savedAddresses);
  } catch (error) {
    logError("saveShippingAddress", error);
    return sendResponse(res, 500, false, "Internal server error");
  }
}

// FORGOT PASSWORD
export async function forgotPasswordController(req, res) {
  try {
    const email = normalizeEmail(req.body.email);

    if (!EMAIL_REGEX.test(email)) {
      return sendResponse(
        res,
        200,
        true,
        "If that email is registered, an OTP has been sent",
      );
    }

    const user = await UserModel.findOne({ email });

    if (!user) {
      return sendResponse(
        res,
        200,
        true,
        "If that email is registered, an OTP has been sent",
      );
    }

    const otp = generateOtp();

    await UserModel.findByIdAndUpdate(user._id, {
      $set: {
        otp,
        otpExpiry: Date.now() + 10 * 60 * 1000,
        passwordResetExpires: null,
      },
    });

    const emailResult = await sendEmail({
      sendTo: email,
      subject: "Reset your Lilium's Glee password",
      text: `Your OTP is ${otp}`,
      html: verifyEmailTemplate(user.name, otp),
    });

    if (!emailResult?.success) {
      logError(
        "forgotPasswordController - sendEmail",
        emailResult?.error || new Error("Email delivery failed"),
      );
    }

    return sendResponse(
      res,
      200,
      true,
      "If that email is registered, an OTP has been sent",
    );
  } catch (error) {
    logError("forgotPasswordController", error);
    return sendResponse(res, 500, false, "Internal server error");
  }
}

// VERIFY FORGOT PASSWORD OTP
export async function verifyforgotPasswordOtp(req, res) {
  try {
    const email = normalizeEmail(req.body.email);
    const { otp } = req.body;

    if (!email || typeof otp !== "string") {
      return sendResponse(res, 400, false, "Provide email and OTP");
    }

    const user = await UserModel.findOne({ email });

    if (
      !user ||
      !user.otp ||
      user.otp !== otp ||
      !user.otpExpiry ||
      new Date(user.otpExpiry).getTime() < Date.now()
    ) {
      return sendResponse(res, 400, false, "Invalid or expired OTP");
    }

    user.otp = null;
    user.otpExpiry = null;
    user.passwordResetExpires = new Date(Date.now() + 15 * 60 * 1000);

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
    const email = normalizeEmail(req.body.email);
    const { newPassword, confirmPassword } = req.body;

    if (!email || !newPassword || !confirmPassword) {
      return sendResponse(res, 400, false, "Provide all fields");
    }

    if (!isStrongPassword(newPassword)) {
      return sendResponse(
        res,
        400,
        false,
        "Password must be at least 8 characters and include uppercase, lowercase, a number, and a special character",
      );
    }

    if (newPassword !== confirmPassword) {
      return sendResponse(res, 400, false, "Passwords do not match");
    }

    const user = await UserModel.findOne({ email });

    if (!user) {
      return sendResponse(
        res,
        400,
        false,
        "Invalid or expired password reset verification",
      );
    }

    if (
      !user.passwordResetExpires ||
      new Date(user.passwordResetExpires).getTime() < Date.now()
    ) {
      return sendResponse(
        res,
        400,
        false,
        "Password reset verification expired. Please request a new OTP.",
      );
    }

    user.password = await bcryptjs.hash(newPassword, 12);
    user.refresh_token = "";
    user.passwordResetExpires = null;
    user.otp = null;
    user.otpExpiry = null;

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
    const token = req.cookies?.refreshToken;

    if (!token) {
      return sendResponse(res, 401, false, "No refresh token provided");
    }

    let verifiedToken;

    try {
      verifiedToken = jwt.verify(
        token,
        process.env.SECRET_KEY_REFRESH_TOKEN,
      );
    } catch {
      clearAuthCookies(res);
      return sendResponse(res, 401, false, "Refresh token expired or invalid");
    }

    if (!verifiedToken?.id) {
      clearAuthCookies(res);
      return sendResponse(res, 401, false, "Refresh token expired or invalid");
    }

    const user = await UserModel.findById(verifiedToken.id);

    if (!user || user.refresh_token !== token) {
      clearAuthCookies(res);
      return sendResponse(res, 401, false, "Refresh token revoked");
    }

    if (user.status === "Suspended") {
      user.refresh_token = "";
      await user.save();
      clearAuthCookies(res);

      return sendResponse(res, 403, false, "Your account has been suspended");
    }

    const newAccessToken = await generatedAccessToken(user._id);
    const newRefreshToken = await generatedRefreshToken(user._id);

    user.refresh_token = newRefreshToken;
    await user.save();

    setAuthCookies(res, newAccessToken, newRefreshToken);

    return sendResponse(res, 200, true, "Token refreshed");
  } catch (error) {
    logError("refreshToken", error);
    return sendResponse(res, 500, false, "Internal server error");
  }
}

// GOOGLE LOGIN
export async function googleAuthController(req, res) {
  try {
    const { credential } = req.body;

    if (typeof credential !== "string" || !credential) {
      return sendResponse(res, 400, false, "Missing Google credential");
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    if (!payload) {
      return sendResponse(res, 401, false, "Invalid Google credential");
    }

    const {
      email: rawEmail,
      sub: googleId,
      picture,
      email_verified: emailVerified,
    } = payload;

    const email = normalizeEmail(rawEmail);

    if (!email || !googleId || !emailVerified) {
      return sendResponse(
        res,
        401,
        false,
        "Google account email is not verified",
      );
    }

    const name = payload.name || "Google User";
    let user = await UserModel.findOne({ email });

    if (!user) {
      user = new UserModel({
        name,
        email,
        googleId,
        avatar: picture,
        verify_email: true,
        role: "USER",
      });

      await user.save();
    } else if (!user.googleId) {
      user.googleId = googleId;

      if (!user.avatar) {
        user.avatar = picture;
      }

      await user.save();
    } else if (user.googleId !== googleId) {
      return sendResponse(
        res,
        403,
        false,
        "This email is already linked to another Google account",
      );
    }

    if (user.status === "Suspended") {
      return sendResponse(res, 403, false, "Your account has been suspended");
    }

    const accessToken = await generatedAccessToken(user._id);
    const refreshToken = await generatedRefreshToken(user._id);

    user.refresh_token = refreshToken;
    user.last_login_date = new Date();

    await user.save();

    setAuthCookies(res, accessToken, refreshToken);

    return sendResponse(res, 200, true, "Login successful", {
      role: user.role,
      name: user.name,
    });
  } catch (error) {
    logError("googleAuthController", error);
    return sendResponse(res, 500, false, "Google sign-in failed");
  }
}
