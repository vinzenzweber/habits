import { signOut } from "@/lib/auth";

export const runtime = 'nodejs';

export async function POST() {
  await signOut({ redirect: false });
  return Response.json({ success: true });
}
