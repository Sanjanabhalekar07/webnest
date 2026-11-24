import {
  createHash,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";
import { connectToDatabase } from "./mongodb";
import { Session } from "../models/session";
import { User } from "../models/user";

const scrypt = promisify(scryptCallback);
const sessionCookie = "webnest_session";
const sessionLifetimeMs = 1000 * 60 * 60 * 24 * 30;

export type PublicUser = { id: string; name: string; email: string };

export class AuthError extends Error {
  constructor(
    message: string,
    public readonly status: number = 400,
  ) {
    super(message);
    this.name = "AuthError";
  }
}

function publicUser(user: {
  _id: unknown;
  name: string;
  email: string;
}): PublicUser {
  return { id: String(user._id), name: user.name, email: user.email };
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt.toString("hex")}:${derived.toString("hex")}`;
}

async function passwordMatches(password: string, stored: string) {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = (await scrypt(
    password,
    Buffer.from(saltHex, "hex"),
    expected.length,
  )) as Buffer;
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export const sessionCookieName = sessionCookie;
export const sessionLifetimeSeconds = sessionLifetimeMs / 1000;

export async function createUserSession(userId: string) {
  await connectToDatabase();
  const token = randomBytes(32).toString("base64url");
  await Session.create({
    tokenHash: hashToken(token),
    userId,
    expiresAt: new Date(Date.now() + sessionLifetimeMs),
  });
  return token;
}

export async function getSessionUserFromToken(
  token: string | null,
): Promise<PublicUser | null> {
  if (!token) return null;
  await connectToDatabase();
  const session = await Session.findOne({
    tokenHash: hashToken(token),
    expiresAt: { $gt: new Date() },
  }).lean();
  if (!session) return null;
  const user = await User.findById(session.userId).lean();
  return user ? publicUser(user) : null;
}

export async function deleteUserSessionFromToken(token: string | null) {
  if (token) {
    await connectToDatabase();
    await Session.deleteOne({ tokenHash: hashToken(token) });
  }
}

export async function signUp(input: {
  name?: unknown;
  email?: unknown;
  password?: unknown;
}) {
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const email =
    typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  const password = typeof input.password === "string" ? input.password : "";
  if (name.length < 2 || name.length > 60)
    throw new AuthError("Choose a username between 2 and 60 characters.");
  if (!/^\S+@\S+\.\S+$/.test(email))
    throw new AuthError("Enter a valid email address.");
  if (password.length < 8)
    throw new AuthError("Use a password with at least 8 characters.");
  await connectToDatabase();
  try {
    const user = await User.create({
      name,
      email,
      passwordHash: await hashPassword(password),
    });
    return {
      user: publicUser(user),
      sessionToken: await createUserSession(String(user._id)),
    };
  } catch (error) {
    if (
      typeof error === "object" &&
      error &&
      "code" in error &&
      error.code === 11000
    )
      throw new AuthError(
        "An account already exists for this email address.",
        409,
      );
    throw error;
  }
}

export async function logIn(emailInput: unknown, passwordInput: unknown) {
  const email =
    typeof emailInput === "string" ? emailInput.trim().toLowerCase() : "";
  const password = typeof passwordInput === "string" ? passwordInput : "";
  await connectToDatabase();
  const user = await User.findOne({ email }).select("+passwordHash");
  if (!user || !(await passwordMatches(password, user.passwordHash)))
    throw new AuthError("Email or password is incorrect.", 401);
  return {
    user: publicUser(user),
    sessionToken: await createUserSession(String(user._id)),
  };
}

export async function updateUserProfile(
  userId: string,
  input: {
    name?: unknown;
    email?: unknown;
    currentPassword?: unknown;
    newPassword?: unknown;
    confirmPassword?: unknown;
  },
): Promise<PublicUser> {
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const email =
    typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  const newPassword =
    typeof input.newPassword === "string" ? input.newPassword : "";
  const confirmPassword =
    typeof input.confirmPassword === "string" ? input.confirmPassword : "";

  if (name.length < 2 || name.length > 60)
    throw new AuthError("Choose a username between 2 and 60 characters.");
  if (!/^\S+@\S+\.\S+$/.test(email))
    throw new AuthError("Enter a valid email address.");
  if (newPassword || confirmPassword) {
    if (newPassword.length < 8)
      throw new AuthError("Use a password with at least 8 characters.");
    if (newPassword !== confirmPassword)
      throw new AuthError("The new passwords do not match.");
  }

  await connectToDatabase();
  const needsPasswordCheck = newPassword.length > 0;
  const user = needsPasswordCheck
    ? await User.findById(userId).select("+passwordHash")
    : await User.findById(userId);
  if (!user) throw new AuthError("Sign in before updating your account.", 401);

  const emailChanged = user.email !== email;
  if (emailChanged || needsPasswordCheck) {
    const currentPassword =
      typeof input.currentPassword === "string" ? input.currentPassword : "";
    const accountWithHash = needsPasswordCheck
      ? user
      : await User.findById(userId).select("+passwordHash");
    if (
      !accountWithHash ||
      !(await passwordMatches(currentPassword, accountWithHash.passwordHash))
    )
      throw new AuthError("Your current password is incorrect.", 401);
  }

  if (emailChanged) {
    const existing = await User.findOne({
      email,
      _id: { $ne: userId },
    }).select("_id");
    if (existing)
      throw new AuthError("An account already exists for this email address.", 409);
  }

  user.name = name;
  user.email = email;
  if (needsPasswordCheck) user.passwordHash = await hashPassword(newPassword);
  await user.save();
  return publicUser(user);
}

