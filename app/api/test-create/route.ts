import { prisma } from "../../../lib/db";
import { randomUUID } from "crypto";

export async function GET() {
  try {
    const uid = randomUUID().slice(0, 8);

    const user = await prisma.user.create({
      data: {
        email: `test+${uid}@masallarlabuyu.com`,
      },
    });

    const story = await prisma.story.create({
      data: {
        storyId: `demo-${uid}`,
        userId: user.id,
        storyText: "Bu bir test masalıdır.",
        imageUrls: [],
      },
    });

    return Response.json({ success: true, uid, user, story });
  } catch (error: any) {
    console.error("TEST-CREATE ERROR:", error);
    return Response.json(
      { success: false, message: error?.message || "unknown error" },
      { status: 500 }
    );
  }
}
