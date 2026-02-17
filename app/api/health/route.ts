import { prisma } from "@/lib/db";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json({ status: "OK", db: "connected" });
  } catch (error) {
    console.error(error);
    return Response.json(
      { status: "ERROR", db: "disconnected" },
      { status: 500 }
    );
  }
}
