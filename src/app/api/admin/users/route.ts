import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, ADMIN_ROLE } from "@/lib/auth/admin";
import { prisma } from "@/lib/db";

const ALLOWED_ROLES = new Set([ADMIN_ROLE, "credit_manager"]);

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  let body: { userId?: string; role?: string };
  try {
    body = (await req.json()) as { userId?: string; role?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.userId || !body.role) {
    return NextResponse.json({ error: "userId and role are required" }, { status: 400 });
  }
  if (!ALLOWED_ROLES.has(body.role)) {
    return NextResponse.json({ error: `Unsupported role "${body.role}"` }, { status: 400 });
  }
  if (body.userId === session.user.id) {
    return NextResponse.json({ error: "You cannot change your own role." }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id: body.userId },
    data: { role: body.role },
    select: { id: true, role: true },
  });

  return NextResponse.json(updated);
}
