import { pgTable, text, serial, integer, date, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const trackingRecords = pgTable("tracking_records", {
  id: serial("id").primaryKey(),
  date: date("date").notNull(),
  scheduledCustomers: integer("scheduled_customers").notNull().default(0),
  reportedCustomers: integer("reported_customers").notNull().default(0),
  closedCustomers: integer("closed_customers").notNull().default(0),
  paymentStatus: text("payment_status", { enum: ["chưa pay", "đã pay"] }).notNull().default("chưa pay"),
});

export const customerReports = pgTable("customer_reports", {
  id: serial("id").primaryKey(),
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email"),
  customerPhone: text("customer_phone"),
  appointmentTime: text("appointment_time"), // Thời gian hẹn
  reportSent: boolean("report_sent").notNull().default(false),
  reportReceivedDate: date("report_received_date"),
  customerDate: date("customer_date").notNull(),
  trackingRecordId: integer("tracking_record_id").references(() => trackingRecords.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const stripePayments = pgTable("stripe_payments", {
  id: serial("id").primaryKey(),
  stripePaymentIntentId: text("stripe_payment_intent_id").notNull().unique(),
  customerEmail: text("customer_email"),
  customerName: text("customer_name"),
  amount: integer("amount").notNull(),
  currency: text("currency").notNull().default("usd"),
  paymentDate: timestamp("payment_date").notNull(),
  isFirstTimePayment: boolean("is_first_time_payment").notNull().default(true),
  trackingRecordId: integer("tracking_record_id").references(() => trackingRecords.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTrackingRecordSchema = createInsertSchema(trackingRecords).omit({
  id: true,
});

export const insertCustomerReportSchema = createInsertSchema(customerReports).omit({
  id: true,
  createdAt: true,
});

export const insertSettingSchema = createInsertSchema(settings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertStripePaymentSchema = createInsertSchema(stripePayments).omit({
  id: true,
  createdAt: true,
});

export type InsertTrackingRecord = z.infer<typeof insertTrackingRecordSchema>;
export type TrackingRecord = typeof trackingRecords.$inferSelect;
export type InsertCustomerReport = z.infer<typeof insertCustomerReportSchema>;
export type CustomerReport = typeof customerReports.$inferSelect;
export type InsertSetting = z.infer<typeof insertSettingSchema>;
export type Setting = typeof settings.$inferSelect;
export type InsertStripePayment = z.infer<typeof insertStripePaymentSchema>;
export type StripePayment = typeof stripePayments.$inferSelect;

// Bonus calculation utilities
export const BONUS_TIERS = {
  TIER_1: { threshold: 30, rate: 200000, label: "Trung bình", icon: "star", color: "yellow" },
  TIER_2: { threshold: 50, rate: 300000, label: "Khá", icon: "award", color: "orange" },
  TIER_3: { threshold: 70, rate: 400000, label: "Cao", icon: "gem", color: "green" },
} as const;

export function calculateBonus(scheduled: number, reported: number): {
  percentage: number;
  bonusRate: number;
  totalBonus: number;
  tier: keyof typeof BONUS_TIERS | null;
} {
  const percentage = scheduled > 0 ? (reported / scheduled) * 100 : 0;
  
  let bonusRate = 0;
  let tier: keyof typeof BONUS_TIERS | null = null;
  
  if (percentage >= BONUS_TIERS.TIER_3.threshold) {
    bonusRate = BONUS_TIERS.TIER_3.rate;
    tier = "TIER_3";
  } else if (percentage >= BONUS_TIERS.TIER_2.threshold) {
    bonusRate = BONUS_TIERS.TIER_2.rate;
    tier = "TIER_2";
  } else if (percentage >= BONUS_TIERS.TIER_1.threshold) {
    bonusRate = BONUS_TIERS.TIER_1.rate;
    tier = "TIER_1";
  }
  
  const totalBonus = bonusRate * reported;
  
  return { percentage, bonusRate, totalBonus, tier };
}
