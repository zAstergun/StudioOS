import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { ensureSeed, PROFILE_ID } from "@/db/seed";

export const dynamic = "force-dynamic";

const TEXT_FIELDS = [
  "name",
  "username",
  "email",
  "role",
  "bio",
  "location",
  "website",
  "pronouns",
  "avatar",
  "cover",
] as const;

const BOOL_FIELDS = ["isPublic", "showStats", "allowMessages"] as const;

export async function GET() {
  await ensureSeed();
  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.id, PROFILE_ID))
    .limit(1);
  return NextResponse.json({ profile });
}

export async function PUT(request: Request) {
  await ensureSeed();
  const body = (await request.json()) as Record<string, unknown>;

  const patch: Record<string, unknown> = {};
  for (const field of TEXT_FIELDS) {
    const value = body[field];
    if (typeof value === "string") {
      if (field === "avatar" && value.startsWith("data:") && value.length > 2_600_000) {
        return NextResponse.json(
          { error: "A imagem precisa ter menos de 2 MB." },
          { status: 413 },
        );
      }
      patch[field] = value.slice(0, field === "bio" ? 400 : 240);
    }
  }
  for (const field of BOOL_FIELDS) {
    if (typeof body[field] === "boolean") patch[field] = body[field];
  }

  if (typeof patch.name === "string" && patch.name.trim().length < 2) {
    return NextResponse.json(
      { error: "O nome precisa ter pelo menos 2 caracteres." },
      { status: 422 },
    );
  }
  if (typeof patch.username === "string" && !/^[a-z0-9._]{3,24}$/i.test(patch.username)) {
    return NextResponse.json(
      { error: "Usuário: use de 3 a 24 caracteres, apenas letras, números, ponto e _." },
      { status: 422 },
    );
  }

  patch.updatedAt = new Date();

  const [updated] = await db
    .update(profiles)
    .set(patch)
    .where(eq(profiles.id, PROFILE_ID))
    .returning();

  return NextResponse.json({ profile: updated });
}
