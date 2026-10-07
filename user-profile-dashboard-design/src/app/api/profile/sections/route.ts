import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { profileSections } from "@/db/schema";
import { ensureSeed, PROFILE_ID } from "@/db/seed";

export const dynamic = "force-dynamic";

type IncomingSection = {
  key?: unknown;
  visible?: unknown;
};

export async function PATCH(request: Request) {
  await ensureSeed();
  const body = (await request.json()) as { order?: IncomingSection[] };

  if (!Array.isArray(body.order) || body.order.length === 0) {
    return NextResponse.json({ error: "Ordem inválida." }, { status: 422 });
  }

  const keys = body.order
    .map((s) => (typeof s?.key === "string" ? s.key : ""))
    .filter(Boolean);

  const existing = await db
    .select()
    .from(profileSections)
    .where(eq(profileSections.profileId, PROFILE_ID));
  const known = new Set(existing.map((s) => s.key));
  const clean = keys.filter((k) => known.has(k));

  // Reconstroi a lista completa: a ordem recebida primeiro, quaisquer seções
  // ausentes da requisição preservadas na ordem original ao final.
  const ordered = [
    ...clean,
    ...existing
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((s) => s.key)
      .filter((k) => !clean.includes(k)),
  ];

  await db.transaction(async (tx) => {
    await tx
      .delete(profileSections)
      .where(eq(profileSections.profileId, PROFILE_ID));

    const rows = ordered.map((key, index) => {
      const incoming = body.order!.find((s) => s.key === key);
      const original = existing.find((s) => s.key === key)!;
      return {
        profileId: PROFILE_ID,
        key,
        label: original.label,
        hint: original.hint,
        position: index,
        visible:
          typeof incoming?.visible === "boolean" ? incoming.visible : original.visible,
      };
    });

    if (rows.length) await tx.insert(profileSections).values(rows);
  });

  const order = await db
    .select()
    .from(profileSections)
    .where(eq(profileSections.profileId, PROFILE_ID))
    .orderBy(profileSections.position);

  return NextResponse.json({ sections: order });
}
