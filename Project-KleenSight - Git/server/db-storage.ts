import { 
  salespeople, 
  leads, 
  assignmentParameters, 
  assignmentHistory,
  naceCustomizations,
  type Salesperson, 
  type InsertSalesperson,
  type Lead,
  type InsertLead,
  type AssignmentParameters,
  type InsertAssignmentParameters,
  type AssignmentHistory,
  type InsertAssignmentHistory,
  type NaceCustomization,
  type InsertNaceCustomization,
  type SectorBucket,
  type TotalLeadPool
} from "@shared/schema";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { eq, desc } from "drizzle-orm";
import type { IStorage } from "./storage";

// Database connection
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is required");
}

const sql = neon(connectionString);
const db = drizzle(sql, { schema: { salespeople, leads, assignmentParameters, assignmentHistory, naceCustomizations } });

export class DatabaseStorage implements IStorage {

  // Salespeople methods
  async getSalespeople(): Promise<Salesperson[]> {
    const result = await db.select().from(salespeople).orderBy(desc(salespeople.createdAt));
    return result;
  }

  async getSalesperson(id: number): Promise<Salesperson | undefined> {
    const result = await db.select().from(salespeople).where(eq(salespeople.id, id)).limit(1);
    return result[0];
  }

  async createSalesperson(salesperson: InsertSalesperson): Promise<Salesperson> {
    const result = await db.insert(salespeople).values(salesperson).returning();
    return result[0];
  }

  async updateSalesperson(id: number, salesperson: Partial<InsertSalesperson>): Promise<Salesperson | undefined> {
    const result = await db.update(salespeople).set(salesperson).where(eq(salespeople.id, id)).returning();
    return result[0];
  }

  async deleteSalesperson(id: number): Promise<boolean> {
    const result = await db.delete(salespeople).where(eq(salespeople.id, id));
    return result.rowCount > 0;
  }

  // Leads methods
  async getLeads(): Promise<Lead[]> {
    const result = await db.select().from(leads).orderBy(desc(leads.createdAt));
    return result;
  }

  async getLead(id: number): Promise<Lead | undefined> {
    const result = await db.select().from(leads).where(eq(leads.id, id)).limit(1);
    return result[0];
  }

  async createLead(lead: InsertLead): Promise<Lead> {
    const result = await db.insert(leads).values(lead).returning();
    return result[0];
  }

  async updateLead(id: number, lead: Partial<InsertLead>): Promise<Lead | undefined> {
    const result = await db.update(leads).set(lead).where(eq(leads.id, id)).returning();
    return result[0];
  }

  async deleteLead(id: number): Promise<boolean> {
    const result = await db.delete(leads).where(eq(leads.id, id));
    return result.rowCount > 0;
  }

  async getLeadsBySalesperson(salespersonId: number): Promise<Lead[]> {
    const result = await db.select().from(leads).where(eq(leads.assignedTo, salespersonId));
    return result;
  }

  async getLeadsBySector(sector: string): Promise<Lead[]> {
    const result = await db.select().from(leads).where(eq(leads.sector, sector));
    return result;
  }

  async getLeadsByRegion(region: string): Promise<Lead[]> {
    const result = await db.select().from(leads).where(eq(leads.region, region));
    return result;
  }

  // Assignment Parameters methods
  async getAssignmentParameters(): Promise<AssignmentParameters | undefined> {
    const result = await db.select().from(assignmentParameters).orderBy(desc(assignmentParameters.updatedAt)).limit(1);
    return result[0];
  }

  async createOrUpdateAssignmentParameters(params: InsertAssignmentParameters): Promise<AssignmentParameters> {
    // Check if parameters exist
    const existing = await this.getAssignmentParameters();
    
    if (existing) {
      // Update existing
      const result = await db.update(assignmentParameters)
        .set({ ...params, updatedAt: new Date() })
        .where(eq(assignmentParameters.id, existing.id))
        .returning();
      return result[0];
    } else {
      // Create new
      const result = await db.insert(assignmentParameters).values(params).returning();
      return result[0];
    }
  }

  // Assignment History methods
  async getAssignmentHistory(): Promise<AssignmentHistory[]> {
    const result = await db.select().from(assignmentHistory).orderBy(desc(assignmentHistory.createdAt));
    return result;
  }

  async createAssignmentHistory(history: InsertAssignmentHistory): Promise<AssignmentHistory> {
    const result = await db.insert(assignmentHistory).values(history).returning();
    return result[0];
  }

  async getAssignmentHistoryByLead(leadId: number): Promise<AssignmentHistory[]> {
    const result = await db.select().from(assignmentHistory).where(eq(assignmentHistory.leadId, leadId));
    return result;
  }

  async getAssignmentHistoryBySalesperson(salespersonId: number): Promise<AssignmentHistory[]> {
    const result = await db.select().from(assignmentHistory).where(eq(assignmentHistory.salespersonId, salespersonId));
    return result;
  }

  // NACE Customizations methods - using database persistence
  async getCustomNaceCodes(): Promise<{ code: string; description: string }[]> {
    const result = await db.select().from(naceCustomizations).where(eq(naceCustomizations.isCustom, true));
    return result.map(customization => ({
      code: customization.code,
      description: customization.description || customization.code
    }));
  }

  async addCustomNaceCode(code: string, description: string): Promise<{ code: string; description: string }> {
    const { SECTORS } = await import("@shared/schema");
    
    // Check if customization already exists
    const existing = await db.select().from(naceCustomizations).where(eq(naceCustomizations.code, code)).limit(1);
    
    if (existing.length > 0) {
      // Update existing customization
      const result = await db.update(naceCustomizations)
        .set({ 
          description, 
          isHidden: false, // Unhide if it was hidden
          updatedAt: new Date()
        })
        .where(eq(naceCustomizations.code, code))
        .returning();
      return { code, description };
    } else {
      // Create new customization
      const isCustom = !SECTORS.includes(code);
      const result = await db.insert(naceCustomizations)
        .values({
          code,
          description,
          isHidden: false,
          isCustom
        })
        .returning();
      return { code, description };
    }
  }

  async deleteCustomNaceCode(code: string): Promise<boolean> {
    const { SECTORS } = await import("@shared/schema");
    
    // Check if customization exists
    const existing = await db.select().from(naceCustomizations).where(eq(naceCustomizations.code, code)).limit(1);
    
    if (existing.length > 0) {
      const customization = existing[0];
      
      if (customization.isCustom) {
        // Delete custom codes completely
        const result = await db.delete(naceCustomizations).where(eq(naceCustomizations.code, code));
        return result.rowCount > 0;
      } else {
        // Hide predefined codes
        const result = await db.update(naceCustomizations)
          .set({ 
            isHidden: true, 
            description: null, // Remove override description
            updatedAt: new Date()
          })
          .where(eq(naceCustomizations.code, code))
          .returning();
        return result.length > 0;
      }
    } else if (SECTORS.includes(code)) {
      // Create hidden entry for predefined code
      const result = await db.insert(naceCustomizations)
        .values({
          code,
          description: null,
          isHidden: true,
          isCustom: false
        })
        .returning();
      return result.length > 0;
    }
    
    return false;
  }

  async getAllNaceCodes(): Promise<{ code: string; description: string }[]> {
    const { SECTORS, SECTOR_DESCRIPTIONS } = await import("@shared/schema");
    
    // Get all customizations from database
    const customizations = await db.select().from(naceCustomizations);
    const customizationMap = new Map(customizations.map(c => [c.code, c]));
    
    // Get predefined NACE codes (excluding "other" and hidden codes)
    const predefinedCodes = SECTORS
      .filter(code => {
        if (code === "other") return false;
        const customization = customizationMap.get(code);
        return !customization?.isHidden;
      })
      .map(code => {
        const customization = customizationMap.get(code);
        return {
          code,
          // Use override description if available, otherwise default
          description: customization?.description || SECTOR_DESCRIPTIONS[code] || code
        };
      });
    
    // Get custom NACE codes (not hidden)
    const customCodes = customizations
      .filter(c => c.isCustom && !c.isHidden)
      .map(c => ({
        code: c.code,
        description: c.description || c.code
      }));
    
    // Combine and sort by code
    const allCodes = [...predefinedCodes, ...customCodes];
    
    // Sort with better numeric handling
    return allCodes.sort((a, b) => {
      const [aNum1, aNum2] = a.code.split('.').map(Number);
      const [bNum1, bNum2] = b.code.split('.').map(Number);
      
      if (aNum1 !== bNum1) return aNum1 - bNum1;
      return aNum2 - bNum2;
    });
  }
}

export const storage = new DatabaseStorage();