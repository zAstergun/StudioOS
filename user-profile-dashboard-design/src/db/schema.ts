import {
  pgTable,
  text,
  boolean,
  integer,
  serial,
  timestamp,
} from "drizzle-orm/pg-core";

export const profiles = pgTable("profiles", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  username: text("username").notNull(),
  email: text("email").notNull(),
  role: text("role").notNull(),
  bio: text("bio").notNull().default(""),
  location: text("location").notNull().default(""),
  website: text("website").notNull().default(""),
  pronouns: text("pronouns").notNull().default(""),
  avatar: text("avatar").notNull().default(""),
  cover: text("cover").notNull().default(""),
  plan: text("plan").notNull().default("Studio Pro"),
  memberSince: text("member_since").notNull().default(""),
  isPublic: boolean("is_public").notNull().default(true),
  showStats: boolean("show_stats").notNull().default(true),
  allowMessages: boolean("allow_messages").notNull().default(true),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const profileSections = pgTable("profile_sections", {
  id: serial("id").primaryKey(),
  profileId: text("profile_id").notNull(),
  key: text("key").notNull(),
  label: text("label").notNull(),
  hint: text("hint").notNull().default(""),
  position: integer("position").notNull(),
  visible: boolean("visible").notNull().default(true),
});

export const usageMetrics = pgTable("usage_metrics", {
  id: serial("id").primaryKey(),
  profileId: text("profile_id").notNull(),
  label: text("label").notNull(),
  value: text("value").notNull(),
  delta: text("delta").notNull(),
  tone: text("tone").notNull(),
  hint: text("hint").notNull().default(""),
  position: integer("position").notNull(),
});

export const activityDays = pgTable("activity_days", {
  id: serial("id").primaryKey(),
  profileId: text("profile_id").notNull(),
  day: text("day").notNull(),
  weekday: integer("weekday").notNull(),
  minutes: integer("minutes").notNull(),
});

export const toolUsage = pgTable("tool_usage", {
  id: serial("id").primaryKey(),
  profileId: text("profile_id").notNull(),
  tool: text("tool").notNull(),
  runs: integer("runs").notNull(),
  share: integer("share").notNull(),
  position: integer("position").notNull(),
});

export type Profile = typeof profiles.$inferSelect;
export type ProfileSection = typeof profileSections.$inferSelect;
export type UsageMetric = typeof usageMetrics.$inferSelect;
export type ActivityDay = typeof activityDays.$inferSelect;
export type ToolUsage = typeof toolUsage.$inferSelect;
