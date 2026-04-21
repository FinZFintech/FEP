import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "20");
  const skip = (page - 1) * limit;

  const [assessments, total] = await Promise.all([
    prisma.assessment.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: { createdBy: { select: { name: true, email: true } } },
    }),
    prisma.assessment.count(),
  ]);

  return NextResponse.json({ assessments, total, page, limit });
}
