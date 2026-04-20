export interface User {
  username: string;
  password: string;
  role: "rep" | "dev" | "admin";
  name: string;
}

export const USERS: User[] = [
  { username: "alex", password: "password", role: "rep", name: "Alex P" },
  { username: "april", password: "password", role: "rep", name: "April D" },
  { username: "genele", password: "password", role: "rep", name: "Genele E" },
  { username: "kala", password: "password", role: "rep", name: "Kala M" },
  { username: "karen", password: "password", role: "rep", name: "Karen G" },
  { username: "samantha", password: "password", role: "rep", name: "Samantha M" },
  { username: "ted", password: "password", role: "admin", name: "Ted Herrera" },
];

const BOT_SECRET = process.env.BOT_SECRET || "designcenter2026";

export function signToken(user: User): string {
  const payload = JSON.stringify({
    username: user.username,
    role: user.role,
    name: user.name,
    ts: Date.now(),
  });
  const encoded = Buffer.from(payload).toString("base64url");
  const signature = Buffer.from(`${encoded}.${BOT_SECRET}`).toString("base64url");
  return `${encoded}.${signature}`;
}

export function getUserFromCookie(cookie: string): User | null {
  try {
    const [encoded, signature] = cookie.split(".");
    const expectedSig = Buffer.from(`${encoded}.${BOT_SECRET}`).toString("base64url");
    if (signature !== expectedSig) return null;
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf-8"));
    const user = USERS.find((u) => u.username === payload.username);
    return user || null;
  } catch {
    return null;
  }
}

export function getRoleFromCookie(cookie: string): "rep" | "dev" | "admin" | null {
  const user = getUserFromCookie(cookie);
  return user?.role ?? null;
}
