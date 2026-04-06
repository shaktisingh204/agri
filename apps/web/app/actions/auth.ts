"use server";

import { getDb } from "../../lib/mongodb";
import { hash, compare } from "bcryptjs";
import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";

export async function registerUser(formData: {
  email: string;
  password: string;
  fullName: string;
  companyName: string;
  role?: string;
}) {
  const { email, password, fullName, companyName, role } = formData;

  if (!email || !password || !fullName || !companyName) {
    return { error: "email, password, fullName, companyName are required" };
  }

  if (password.length < 8) {
    return { error: "Password must be at least 8 characters" };
  }

  const db = await getDb();
  const existingUser = await db.collection("users").findOne({ email });
  if (existingUser) {
    return { error: "A user with this email already exists" };
  }

  const tenantSlug = companyName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const passwordHash = await hash(password, 12);

  const tenantResult = await db.collection("tenants").insertOne({
    companyName,
    slug: `${tenantSlug}-${Date.now()}`,
    planType: "FREE",
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const userResult = await db.collection("users").insertOne({
    tenantId: tenantResult.insertedId,
    email,
    passwordHash,
    fullName,
    role: (role as "ADMIN" | "ANALYST" | "VIEWER") ?? "ADMIN",
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const jwtSecret = process.env.JWT_SECRET ?? "agri-secret-change-me";
  const token = jwt.sign(
    { sub: userResult.insertedId.toString(), tenantId: tenantResult.insertedId.toString(), role: role ?? "ADMIN", email },
    jwtSecret,
    { expiresIn: "7d" }
  );

  return {
    accessToken: token,
    user: { id: userResult.insertedId.toString(), email, fullName, role: role ?? "ADMIN" },
    tenant: { id: tenantResult.insertedId.toString(), companyName, planType: "FREE" },
  };
}

export async function loginUser(formData: { email: string; password: string }) {
  const { email, password } = formData;

  if (!email || !password) {
    return { error: "email and password are required" };
  }

  const db = await getDb();
  const user = await db.collection("users").findOne({ email });

  if (!user || !(await compare(password, user.passwordHash))) {
    return { error: "Invalid credentials" };
  }

  const tenant = await db.collection("tenants").findOne({ _id: new ObjectId(user.tenantId) });

  const jwtSecret = process.env.JWT_SECRET ?? "agri-secret-change-me";
  const token = jwt.sign(
    { sub: user._id.toString(), tenantId: user.tenantId.toString(), role: user.role, email: user.email },
    jwtSecret,
    { expiresIn: "7d" }
  );

  return {
    accessToken: token,
    user: { id: user._id.toString(), email: user.email, fullName: user.fullName, role: user.role },
    tenant: { id: user.tenantId.toString(), companyName: tenant?.companyName ?? "", planType: tenant?.planType ?? "FREE" },
  };
}
