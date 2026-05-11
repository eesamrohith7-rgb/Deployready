import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

const SECRET = process.env.JWT_SECRET || "dev-insecure-change-me";
const COOKIE = "wa_token";

export type JwtPayload = { uid: string; email: string };

export async function hashPassword(p: string) {
  return bcrypt.hash(p, 10);
}
export async function verifyPassword(p: string, hash: string) {
  return bcrypt.compare(p, hash);
}

export function signToken(payload: JwtPayload) {
  return jwt.sign(payload, SECRET, { expiresIn: "30d" });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    const r = jwt.verify(token, SECRET) as JwtPayload;
    if (!r?.uid) return null;
    return r;
  } catch {
    return null;
  }
}

export function getSession(): JwtPayload | null {
  const tok = cookies().get(COOKIE)?.value;
  if (!tok) return null;
  return verifyToken(tok);
}

export function setSessionCookie(token: string) {
  cookies().set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export function clearSessionCookie() {
  cookies().delete(COOKIE);
}

export const SESSION_COOKIE = COOKIE;
