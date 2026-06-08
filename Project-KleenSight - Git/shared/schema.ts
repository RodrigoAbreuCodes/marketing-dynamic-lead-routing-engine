import { pgTable, text, serial, integer, boolean, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const salespeople = pgTable("salespeople", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  role: text("role").notNull(),
  team: text("team").notNull(), // 'palmela' or 'vila-do-conde'
  // Inbound sector expertise
  inboundBestSector: text("inbound_best_sector").notNull(),
  inboundSecondBestSector: text("inbound_second_best_sector").notNull(),
  inboundThirdBestSector: text("inbound_third_best_sector").notNull(),
  // Outbound sector expertise
  outboundBestSector: text("outbound_best_sector").notNull(),
  outboundSecondBestSector: text("outbound_second_best_sector").notNull(),
  outboundThirdBestSector: text("outbound_third_best_sector").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const leads = pgTable("leads", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  vat: text("vat"),
  sector: text("sector").notNull(),
  region: text("region").notNull(), // 'palmela' or 'vila-do-conde'
  details: text("details"),
  type: text("type").notNull().default("inbound"), // 'inbound' or 'outbound'
  assignedTo: integer("assigned_to").references(() => salespeople.id),
  status: text("status").notNull().default("assigned"), // 'assigned', 'completed', 'cancelled'
  createdAt: timestamp("created_at").defaultNow(),
});

export const assignmentParameters = pgTable("assignment_parameters", {
  id: serial("id").primaryKey(),
  sectorBuckets: json("sector_buckets").notNull(), // Array of bucket configurations
  totalLeadPools: json("total_lead_pools").notNull(), // Array of pool configurations
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const assignmentHistory = pgTable("assignment_history", {
  id: serial("id").primaryKey(),
  leadId: integer("lead_id").references(() => leads.id),
  salespersonId: integer("salesperson_id").references(() => salespeople.id),
  sector: text("sector").notNull(),
  region: text("region").notNull(),
  assignmentReason: text("assignment_reason"), // Explanation of why this person was chosen
  bucketUsed: text("bucket_used"),
  poolUsed: text("pool_used"),
  assignmentWeight: integer("assignment_weight"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const naceCustomizations = pgTable("nace_customizations", {
  code: text("code").primaryKey(),
  description: text("description"), // Custom description for custom codes, or override for predefined codes
  isHidden: boolean("is_hidden").notNull().default(false), // Whether to hide a predefined code
  isCustom: boolean("is_custom").notNull().default(false), // Whether this is a custom code vs predefined
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Insert schemas
export const insertSalespersonSchema = createInsertSchema(salespeople).omit({
  id: true,
  createdAt: true,
});

export const insertLeadSchema = createInsertSchema(leads).omit({
  id: true,
  createdAt: true,
});

export const insertAssignmentParametersSchema = createInsertSchema(assignmentParameters).omit({
  id: true,
  updatedAt: true,
});

export const insertAssignmentHistorySchema = createInsertSchema(assignmentHistory).omit({
  id: true,
  createdAt: true,
});

export const insertNaceCustomizationSchema = createInsertSchema(naceCustomizations).omit({
  createdAt: true,
  updatedAt: true,
});

// Types
export type Salesperson = typeof salespeople.$inferSelect;
export type InsertSalesperson = z.infer<typeof insertSalespersonSchema>;
export type Lead = typeof leads.$inferSelect;
export type InsertLead = z.infer<typeof insertLeadSchema>;
export type AssignmentParameters = typeof assignmentParameters.$inferSelect;
export type InsertAssignmentParameters = z.infer<typeof insertAssignmentParametersSchema>;
export type AssignmentHistory = typeof assignmentHistory.$inferSelect;
export type InsertAssignmentHistory = z.infer<typeof insertAssignmentHistorySchema>;
export type NaceCustomization = typeof naceCustomizations.$inferSelect;
export type InsertNaceCustomization = z.infer<typeof insertNaceCustomizationSchema>;

// NACE codes for validation - in numerical order
export const SECTORS = [
  "13.30", "15.20", "16.23", "18.11", "18.12", "18.13", "18.14", "20.41", "21.10", "21.20", "22.11", "22.19", "22.21", "22.22", "22.23", "22.29", "23.11", "23.12", "23.13", "23.14", "23.19", "23.20", "23.31", "23.32", "23.41", "23.42", "23.51", "23.61", "23.63", "23.69", "23.99", "24.10", "24.20", "24.31", "24.32", "24.33", "24.34", "24.41", "24.42", "24.43", "24.44", "24.45", "24.46", "24.51", "24.52", "24.53", "24.54", "25.11", "25.12", "25.21", "25.29", "25.30", "25.40", "25.50", "25.61", "25.62", "25.71", "25.72", "25.73", "25.91", "25.92", "25.93", "25.94", "25.99", "26.11", "26.51", "26.52", "27.11", "27.12", "27.20", "27.32", "27.40", "27.51", "27.90", "28.11", "28.12", "28.13", "28.14", "28.15", "28.21", "28.22", "28.23", "28.24", "28.25", "28.29", "28.30", "28.41", "28.49", "28.91", "28.92", "28.93", "28.94", "28.95", "28.96", "28.99", "29.10", "29.20", "29.31", "29.32", "30.11", "30.12", "30.20", "30.30", "30.91", "30.92", "30.99", "31.01", "31.02", "31.09", "32.30", "32.50", "32.99", "33.11", "33.12", "33.13", "33.14", "33.15", "33.16", "33.17", "33.19", "33.20", "38.31", "41.20", "42.11", "43.21", "43.32", "45.11", "45.19", "45.20", "45.31", "45.32", "45.40", "46.14", "46.43", "46.64", "46.69", "47.59", "49.31", "49.32", "49.39", "49.41", "49.42", "52.24", "55.10", "56.10", "68.10", "71.12", "73.11", "77.32", "84.11", "84.25", "91.04", "other"
] as const;

// NACE code descriptions for display purposes
export const SECTOR_DESCRIPTIONS = {
  "13.30": "Finishing of textiles",
  "15.20": "Manufacture of footwear",
  "16.23": "Manufacture of other builders' carpentry and joinery",
  "18.11": "PRINTING",
  "18.12": "PRINTING", 
  "18.13": "PRINTING",
  "18.14": "PRINTING",
  "20.41": "Manufacture of soap and detergents, cleaning and polishing preparations",
  "21.10": "Manufacture of basic pharmaceutical products",
  "21.20": "OTHER",
  "22.11": "RUBBER & PLASTICS",
  "22.19": "RUBBER & PLASTICS",
  "22.21": "RUBBER & PLASTICS",
  "22.22": "RUBBER & PLASTICS",
  "22.23": "RUBBER & PLASTICS",
  "22.29": "RUBBER & PLASTICS",
  "23.11": "OTHER",
  "23.12": "OTHER",
  "23.13": "OTHER",
  "23.14": "Manufacture of glass fibres",
  "23.19": "OTHER",
  "23.20": "OTHER",
  "23.31": "OTHER",
  "23.32": "OTHER",
  "23.41": "Manufacture of ceramic household and ornamental articles",
  "23.42": "Manufacture of ceramic sanitary fixtures",
  "23.51": "OTHER",
  "23.61": "OTHER",
  "23.63": "OTHER",
  "23.69": "OTHER",
  "23.99": "OTHER",
  "24.10": "METALWORKING",
  "24.20": "METALWORKING",
  "24.31": "METALWORKING",
  "24.32": "METALWORKING",
  "24.33": "METALWORKING",
  "24.34": "METALWORKING",
  "24.41": "METALWORKING",
  "24.42": "METALWORKING",
  "24.43": "METALWORKING",
  "24.44": "METALWORKING",
  "24.45": "METALWORKING",
  "24.46": "METALWORKING",
  "24.51": "METALWORKING",
  "24.52": "METALWORKING",
  "24.53": "METALWORKING",
  "24.54": "METALWORKING",
  "25.11": "Manufacture of metal structures and parts of structures",
  "25.12": "Manufacture of doors and windows of metal",
  "25.21": "METALWORKING",
  "25.29": "METALWORKING",
  "25.30": "METALWORKING",
  "25.40": "METALWORKING",
  "25.50": "METALWORKING",
  "25.61": "METALWORKING",
  "25.62": "Machining",
  "25.71": "METALWORKING",
  "25.72": "Manufacture of locks and hinges",
  "25.73": "METALWORKING",
  "25.91": "METALWORKING",
  "25.92": "METALWORKING",
  "25.93": "METALWORKING",
  "25.94": "METALWORKING",
  "25.99": "METALWORKING",
  "26.11": "OTHER",
  "26.51": "Manufacture of instruments and appliances for measuring, testing and navigation",
  "26.52": "Manufacture of watches and clocks",
  "27.11": "OTHER",
  "27.12": "OTHER",
  "27.20": "OTHER",
  "27.32": "OTHER",
  "27.40": "OTHER",
  "27.51": "OTHER",
  "27.90": "OTHER",
  "28.11": "MANUFACTURE OF MACHINERY AND EQUIPMENT N.E.C.",
  "28.12": "MANUFACTURE OF MACHINERY AND EQUIPMENT N.E.C.",
  "28.13": "MANUFACTURE OF MACHINERY AND EQUIPMENT N.E.C.",
  "28.14": "MANUFACTURE OF MACHINERY AND EQUIPMENT N.E.C.",
  "28.15": "MANUFACTURE OF MACHINERY AND EQUIPMENT N.E.C.",
  "28.21": "MANUFACTURE OF MACHINERY AND EQUIPMENT N.E.C.",
  "28.22": "MANUFACTURE OF MACHINERY AND EQUIPMENT N.E.C.",
  "28.23": "MANUFACTURE OF MACHINERY AND EQUIPMENT N.E.C.",
  "28.24": "MANUFACTURE OF MACHINERY AND EQUIPMENT N.E.C.",
  "28.25": "MANUFACTURE OF MACHINERY AND EQUIPMENT N.E.C.",
  "28.29": "MANUFACTURE OF MACHINERY AND EQUIPMENT N.E.C.",
  "28.30": "MANUFACTURE OF MACHINERY AND EQUIPMENT N.E.C.",
  "28.41": "MANUFACTURE OF MACHINERY AND EQUIPMENT N.E.C.",
  "28.49": "MANUFACTURE OF MACHINERY AND EQUIPMENT N.E.C.",
  "28.91": "MANUFACTURE OF MACHINERY AND EQUIPMENT N.E.C.",
  "28.92": "MANUFACTURE OF MACHINERY AND EQUIPMENT N.E.C.",
  "28.93": "Manufacture of machinery for food, beverage and tobacco processing",
  "28.94": "MANUFACTURE OF MACHINERY AND EQUIPMENT N.E.C.",
  "28.95": "MANUFACTURE OF MACHINERY AND EQUIPMENT N.E.C.",
  "28.96": "MANUFACTURE OF MACHINERY AND EQUIPMENT N.E.C.",
  "28.99": "MANUFACTURE OF MACHINERY AND EQUIPMENT N.E.C.",
  "29.10": "MANUFACTURE OF AUTO PARTS",
  "29.20": "Manufacture of bodies (coachwork) for motor vehicles; manufacture of trailers and semi-trailers",
  "29.31": "MANUFACTURE OF AUTO PARTS",
  "29.32": "MANUFACTURE OF AUTO PARTS",
  "30.11": "Building of ships and floating structures",
  "30.12": "OTHER",
  "30.20": "OTHER",
  "30.30": "OTHER",
  "30.91": "OTHER",
  "30.92": "OTHER",
  "30.99": "OTHER",
  "31.01": "OTHER",
  "31.02": "OTHER",
  "31.09": "OTHER",
  "32.30": "OTHER",
  "32.50": "Manufacture of medical and dental instruments and supplies",
  "32.99": "OTHER",
  "33.11": "REPAIR & INSTALLATION OF MACHINERY",
  "33.12": "REPAIR & INSTALLATION OF MACHINERY",
  "33.13": "REPAIR & INSTALLATION OF MACHINERY",
  "33.14": "REPAIR & INSTALLATION OF MACHINERY",
  "33.15": "REPAIR & INSTALLATION OF MACHINERY",
  "33.16": "REPAIR & INSTALLATION OF MACHINERY",
  "33.17": "REPAIR & INSTALLATION OF MACHINERY",
  "33.19": "REPAIR & INSTALLATION OF MACHINERY",
  "33.20": "Installation of industrial machinery and equipment",
  "38.31": "Dismantling of wrecks",
  "41.20": "Construction of residential and non-residential buildings",
  "42.11": "Construction of roads and motorways",
  "43.21": "Electrical installation",
  "43.32": "Joinery installation",
  "45.11": "AUTO MRO",
  "45.19": "AUTO MRO",
  "45.20": "AUTO MRO",
  "45.31": "AUTO MRO",
  "45.32": "AUTO MRO",
  "45.40": "AUTO MRO",
  "46.14": "Agents involved in the sale of machinery, industrial equipment, ships and aircraft",
  "46.43": "Wholesale of electrical household appliances",
  "46.64": "Wholesale of machinery for the textile industry and of sewing and knitting machines",
  "46.69": "Wholesale of other machinery and equipment",
  "47.59": "Retail sale of furniture, lighting equipment and other household articles in specialised stores",
  "49.31": "AUTO MRO",
  "49.32": "AUTO MRO",
  "49.39": "AUTO MRO",
  "49.41": "Freight transport by road",
  "49.42": "AUTO MRO",
  "52.24": "Cargo handling",
  "55.10": "Hotels and similar accommodation",
  "56.10": "Restaurants and mobile food service activities",
  "68.10": "Buying and selling of own real estate",
  "71.12": "Engineering activities and related technical consultancy",
  "73.11": "Advertising agencies",
  "77.32": "Rental and leasing of construction and civil engineering machinery and equipment",
  "84.11": "General public administration activities",
  "84.25": "Fire service activities",
  "91.04": "Botanical and zoological gardens and nature reserves activities",
  "other": "Other (Custom NACE)"
} as const;

export const TEAMS = ["palmela", "vila-do-conde"] as const;

export const ROLES = ["PCE", "RAM", "SSR"] as const;

export const LEAD_STATUS = ["assigned", "completed", "cancelled"] as const;

export type Sector = typeof SECTORS[number];
export type Team = typeof TEAMS[number];
export type Role = typeof ROLES[number];
export type LeadStatus = typeof LEAD_STATUS[number];

// Default assignment parameters structure
export interface SectorBucket {
  id: string;
  name: string;
  minLeads: number;
  maxLeads: number | null;
  weight: number;
}

export interface TotalLeadPool {
  id: string;
  name: string;
  minLeads: number;
  maxLeads: number | null;
  weight: number;
}


