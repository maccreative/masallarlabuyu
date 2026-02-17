import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

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

    const items = await prisma.story.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        storyId: true,
        title: true,
        storyText: true,
        createdAt: true,
        childProfileId: true,
        voiceProfileId: true,
        audioUrl: true,
        imageUrls: true,
        childProfile: { select: { id: true, childName: true } },
      },
    });

    return NextResponse.json({ success: true, items });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: "Failed", details: err?.message || "Unknown" },
      { status: 500 }
    );
  }
}
