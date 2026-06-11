import "server-only";
import { cookies } from "next/headers";
import { createHmac, scryptSync, randomBytes, timingSafeEqual } from "crypto";
import { supabase, type Player } from "./supabase";

const COOKIE_NAME = "porra_session";
const ADMIN_COOKIE = "porra_admin";
const SECRET = process.env.SESSION_SECRET ?? "dev-secret-cambialo";

// ---------- PIN ----------
export function hashPin(pin: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(pin, salt, 32).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPin(pin: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const test = scryptSync(pin, salt, 32);
  const ref = Buffer.from(hash, "hex");
  return test.length === ref.length && timingSafeEqual(test, ref);
}

// ---------- Firma de cookies ----------
function sign(value: string): string {
  const sig = createHmac("sha256", SECRET).update(value).digest("hex");
  return `${value}.${sig}`;
}

function unsign(signed: string | undefined): string | null {
  if (!signed) return null;
  const idx = signed.lastIndexOf(".");
  if (idx < 0) return null;
  const value = signed.slice(0, idx);
  const sig = signed.slice(idx + 1);
  const expected = createHmac("sha256", SECRET).update(value).digest("hex");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return value;
}

// ---------- Sesión de jugador ----------
export async function setSession(playerId: string) {
  const jar = await cookies();
  jar.set(COOKIE_NAME, sign(playerId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 90, // 90 días
  });
}

export async function clearSession() {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
  jar.delete(ADMIN_COOKIE);
}

export async function getCurrentPlayer(): Promise<Player | null> {
  const jar = await cookies();
  const playerId = unsign(jar.get(COOKIE_NAME)?.value);
  if (!playerId) return null;
  const { data } = await supabase
    .from("players")
    .select("id, name, is_admin")
    .eq("id", playerId)
    .single();
  return (data as Player) ?? null;
}

// ---------- Sesión de administración ----------
export async function setAdminSession() {
  const jar = await cookies();
  jar.set(ADMIN_COOKIE, sign("admin"), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function isAdmin(): Promise<boolean> {
  const jar = await cookies();
  return unsign(jar.get(ADMIN_COOKIE)?.value) === "admin";
}

export function checkAdminPassword(pw: string): boolean {
  const expected = process.env.ADMIN_PASSWORD ?? "";
  if (!expected) return false;
  const a = Buffer.from(pw);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
