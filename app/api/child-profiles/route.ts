import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

const CreateSchema = z.object({
  userId: z.number().int().positive(),
  childName: z.string().trim().min(1).max(40),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userIdRaw = searchParams.get("userId");
    const userId = userIdRaw ? Number(userIdRaw) : NaN;

    if (!Number.isFinite(userId) || userId <= 0) {
      return NextResponse.json(
        { success: false, message: "Missing or invalid userId" },
        { status: 400 }
      );
    }

    const items = await prisma.childProfile.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: { id: true, childName: true, createdAt: true },
    });

    return NextResponse.json({ success: true, items });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: "Failed", details: err?.message || "Unknown" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = CreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { userId, childName } = parsed.data;

    // user doğrula (opsiyonel ama sağlam)
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    // aynı isim varsa geri döndür
    const existing = await prisma.childProfile.findFirst({
      where: { userId, childName },
      select: { id: true, childName: true, createdAt: true },
    });

    if (existing) {
      return NextResponse.json({ success: true, item: existing, created: false });
    }

    const created = await prisma.childProfile.create({
      data: { userId, childName },
      select: { id: true, childName: true, createdAt: true },
    });

    return NextResponse.json({ success: true, item: created, created: true }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: "Failed", details: err?.message || "Unknown" },
      { status: 500 }
    );
  }
}
