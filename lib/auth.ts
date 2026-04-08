export interface User {
  username: string;
  password: string;
  role: "rep" | "dev";
  name: string;
}

export const USERS: User[] = [
  { username: "ted", password: "password", role: "rep", name: "Ted Herrera" },
  { username: "sal", password: "password", role: "rep", name: "Sal" },
  { username: "alex", password: "password", role: "rep", name: "Alex" },
  { username: "jacquelyn", password: "password", role: "rep", name: "Jacquelyn" },
  { username: "dev", password: "password", role: "dev", name: "Dev Team" },
  { username: "dev1", password: "password", role: "dev", name: "Dev 1" },
  { username: "dev2", password: "password", role: "dev", name: "Dev 2" },
  { username: "demo", password: "demo", role: "rep", name: "Demo Rep" },
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

export function getRoleFromCookie(cookie: string): "rep" | "dev" | null {
  const user = getUserFromCookie(cookie);
  return user?.role ?? null;
}
