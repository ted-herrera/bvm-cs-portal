const CAMPAIGN_USERS = [
  { username: "Alex Polivka", password: "password", role: "rep" },
  { username: "April Dippolito", password: "password", role: "rep" },
  { username: "Genele Ekinde", password: "password", role: "rep" },
  { username: "Kala McNeely", password: "password", role: "rep" },
  { username: "Karen Guirguis", password: "password", role: "rep" },
  { username: "Samantha Marcus", password: "password", role: "rep" },
  { username: "Ted Herrera", password: "password", role: "admin" },
];

export async function POST(request: Request) {
  const { username, password } = (await request.json()) as {
    username: string;
    password: string;
  };

  const trimmed = username.trim();
  const user = CAMPAIGN_USERS.find(
    (u) => u.username.toLowerCase() === trimmed.toLowerCase() && u.password === password
  );

  if (!user) {
    return Response.json({ success: false, error: "Invalid credentials" });
  }

  const cookieValue = JSON.stringify({ username: user.username, role: user.role });

  return new Response(JSON.stringify({ success: true, role: user.role }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": `campaign_user=${encodeURIComponent(cookieValue)}; Path=/; Max-Age=${60 * 60 * 24 * 30}; SameSite=Lax`,
    },
  });
}
