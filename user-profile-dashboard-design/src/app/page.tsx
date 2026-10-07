import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  profiles,
  profileSections,
  usageMetrics,
  activityDays,
  toolUsage,
} from "@/db/schema";
import { ensureSeed, PROFILE_ID } from "@/db/seed";
import { MobileNav, Sidebar, StatusBar } from "@/components/chrome";
import { Workspace } from "@/components/workspace";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  await ensureSeed();

  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.id, PROFILE_ID))
    .limit(1);

  const [sections, metrics, tools, days] = await Promise.all([
    db
      .select()
      .from(profileSections)
      .where(eq(profileSections.profileId, PROFILE_ID))
      .orderBy(asc(profileSections.position)),
    db
      .select()
      .from(usageMetrics)
      .where(eq(usageMetrics.profileId, PROFILE_ID))
      .orderBy(asc(usageMetrics.position)),
    db
      .select()
      .from(toolUsage)
      .where(eq(toolUsage.profileId, PROFILE_ID))
      .orderBy(asc(toolUsage.position)),
    db
      .select()
      .from(activityDays)
      .where(eq(activityDays.profileId, PROFILE_ID))
      .orderBy(asc(activityDays.day)),
  ]);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="min-w-0 flex-1">
        <StatusBar owner={profile.name} />
        <MobileNav />
        <main>
          <Workspace
            profile={profile}
            sections={sections}
            metrics={metrics.map((m) => ({
              label: m.label,
              value: m.value,
              delta: m.delta,
              tone: m.tone,
              hint: m.hint,
            }))}
            days={days.map((d) => ({
              day: d.day,
              weekday: d.weekday,
              minutes: d.minutes,
            }))}
            tools={tools.map((t) => ({
              tool: t.tool,
              runs: t.runs,
              share: t.share,
            }))}
          />
        </main>
      </div>
    </div>
  );
}
