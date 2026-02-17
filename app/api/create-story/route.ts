import { splitTitleAndBody } from "@/lib/storyText";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

const CreateStorySchema = z.object({
  userId: z.number().int().positive(),
  theme: z.string().optional(),
  age: z.number().int().min(1).max(18).optional().default(5),
  language: z.enum(["tr", "en"]).optional().default("tr"),
  lengthSec: z.number().int().min(30).max(300).optional().default(110),
  childProfileId: z.number().int().positive().nullable().optional(),
  childName: z.string().min(1).max(40).optional(),
});

type CreateStoryInput = z.infer<typeof CreateStorySchema>;

async function generateStory(
  input: CreateStoryInput,
  childName?: string
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");

  const model = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";

  const { theme, age, language, lengthSec } = input;
  const estimatedWords = Math.floor((lengthSec / 60) * 130);

  const characterName =
    childName ?? (language === "tr" ? "Minik Kahraman" : "Little Hero");

  const prompt =
    language === "tr"
      ? `Başlık dahil ${estimatedWords} kelimelik kısa uyku masalı yaz.
Tema: ${theme || "rahatlatıcı"}
Yaş: ${age}
Karakter Adı: ${characterName}

Kurallar:
- Yumuşak, sade dil kullan
- Yaklaşık 90–120 saniyede okunacak uzunlukta tut
- Pozitif, huzurlu son
- İlk satır başlık olsun

Sadece masalı yaz; ek açıklama yapma.`
      : `Write a ${estimatedWords}-word bedtime story (including title).
Theme: ${theme || "soothing"}
Age: ${age}
Character Name: ${characterName}

Rules:
- Calm, simple tone
- Keep it ~90–120 seconds read-aloud
- Positive, peaceful ending
- First line should be the title

Output only the story; no extra text.`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 650,
      temperature: 0.7,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  const raw = await response.text();

  if (!response.ok) {
    throw new Error(
      `Claude API failed: ${response.status} | ${raw.slice(0, 500)}`
    );
  }

  const data: any = JSON.parse(raw);
  const textBlock = Array.isArray(data?.content)
    ? data.content.find((c: any) => c?.type === "text")
    : null;

  const text = textBlock?.text?.trim();
  if (!text) throw new Error("Claude returned empty text");

  return text;
}

export async function POST(request: NextRequest) {
  let storyRowId: number | null = null;

  try {
    const body = await request.json();
    const parsed = CreateStorySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const input = parsed.data;

    const user = await prisma.user.findUnique({ where: { id: input.userId } });
    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    let childProfileId: number | null = input.childProfileId ?? null;
    let childName: string | undefined = undefined;

    if (childProfileId) {
      const child = await prisma.childProfile.findFirst({
        where: { id: childProfileId, userId: input.userId },
        select: { id: true, childName: true },
      });

      if (!child) {
        return NextResponse.json(
          { success: false, message: "Child profile not found" },
          { status: 400 }
        );
      }

      childName = child.childName ?? undefined;
    }

    if (!childProfileId && input.childName) {
      const existing = await prisma.childProfile.findFirst({
        where: { userId: input.userId, childName: input.childName },
        select: { id: true, childName: true },
      });

      if (existing) {
        childProfileId = existing.id;
        childName = existing.childName ?? undefined;
      } else {
        const created = await prisma.childProfile.create({
          data: { userId: input.userId, childName: input.childName },
          select: { id: true, childName: true },
        });

        childProfileId = created.id;
        childName = created.childName ?? undefined;
      }
    }

    const story = await prisma.story.create({
      data: {
        storyId: "st-" + randomUUID().slice(0, 12),
        userId: input.userId,
        childProfileId,
        voiceProfileId: null,
        title: "GENERATING...",
        storyText: "GENERATING...",
        audioUrl: null,
        imageUrls: [],
      },
    });

    storyRowId = story.id;

    const generatedText = await generateStory(input, childName);

    const { title, storyText } = splitTitleAndBody(generatedText);

    const updated = await prisma.story.update({
      where: { id: story.id },
      data: { title, storyText },
    });

    return NextResponse.json({
      success: true,
      story: {
        id: updated.id,
        storyId: updated.storyId,
        userId: updated.userId,
        childProfileId: updated.childProfileId,
        voiceProfileId: updated.voiceProfileId,
        title: updated.title,
        storyText: updated.storyText,
        audioUrl: updated.audioUrl,
        imageUrls: updated.imageUrls,
        createdAt: updated.createdAt,
      },
    });
  } catch (err: any) {
    if (storyRowId) {
      await prisma.story
        .update({
          where: { id: storyRowId },
          data: { storyText: "FAILED: generation error" },
        })
        .catch(() => {});
    }

    return NextResponse.json(
      { success: false, message: "Story generation failed", details: err?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
