import { 
  salespeople, 
  leads, 
  assignmentParameters, 
  assignmentHistory,
  type Salesperson, 
  type InsertSalesperson,
  type Lead,
  type InsertLead,
  type AssignmentParameters,
  type InsertAssignmentParameters,
  type AssignmentHistory,
  type InsertAssignmentHistory,
  type SectorBucket,
  type TotalLeadPool
} from "@shared/schema";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { eq, desc } from "drizzle-orm";
import * as fs from "fs";
import * as path from "path";

// Database connection
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is required");
}

const sql = neon(connectionString);
const db = drizzle(sql, { schema: { salespeople, leads, assignmentParameters, assignmentHistory } });

export interface IStorage {
  // Salespeople
  getSalespeople(): Promise<Salesperson[]>;
  getSalesperson(id: number): Promise<Salesperson | undefined>;
  createSalesperson(salesperson: InsertSalesperson): Promise<Salesperson>;
  updateSalesperson(id: number, salesperson: Partial<InsertSalesperson>): Promise<Salesperson | undefined>;
  deleteSalesperson(id: number): Promise<boolean>;

  // Leads
  getLeads(): Promise<Lead[]>;
  getLead(id: number): Promise<Lead | undefined>;
  createLead(lead: InsertLead): Promise<Lead>;
  updateLead(id: number, lead: Partial<InsertLead>): Promise<Lead | undefined>;
  deleteLead(id: number): Promise<boolean>;
  getLeadsBySalesperson(salespersonId: number): Promise<Lead[]>;
  getLeadsBySector(sector: string): Promise<Lead[]>;
  getLeadsByRegion(region: string): Promise<Lead[]>;

  // Assignment Parameters
  getAssignmentParameters(): Promise<AssignmentParameters | undefined>;
  createOrUpdateAssignmentParameters(params: InsertAssignmentParameters): Promise<AssignmentParameters>;

  // Assignment History
  getAssignmentHistory(): Promise<AssignmentHistory[]>;
  createAssignmentHistory(history: InsertAssignmentHistory): Promise<AssignmentHistory>;
  getAssignmentHistoryByLead(leadId: number): Promise<AssignmentHistory[]>;
  getAssignmentHistoryBySalesperson(salespersonId: number): Promise<AssignmentHistory[]>;

  // Custom NACE Codes
  getCustomNaceCodes(): Promise<{ code: string; description: string }[]>;
  addCustomNaceCode(code: string, description: string): Promise<{ code: string; description: string }>;
  deleteCustomNaceCode(code: string): Promise<boolean>;
  getAllNaceCodes(): Promise<{ code: string; description: string }[]>;
}

interface StorageData {
  salespeople: Map<number, Salesperson>;
  leads: Map<number, Lead>;
  assignmentParameters: AssignmentParameters | undefined;
  assignmentHistory: Map<number, AssignmentHistory>;
  customNaceCodes: Map<string, string>; // code -> description
  hiddenNaceCodes: Set<string>; // Hidden predefined codes
  overriddenDescriptions: Map<string, string>; // Overridden descriptions for predefined codes
  currentSalespersonId: number;
  currentLeadId: number;
  currentParameterId: number;
  currentHistoryId: number;
}

export class MemStorage implements IStorage {
  private salespeople: Map<number, Salesperson>;
  private leads: Map<number, Lead>;
  private assignmentParameters: AssignmentParameters | undefined;
  private assignmentHistory: Map<number, AssignmentHistory>;
  private customNaceCodes: Map<string, string>; // code -> description
  private hiddenNaceCodes: Set<string>; // Hidden predefined codes
  private overriddenDescriptions: Map<string, string>; // Overridden descriptions for predefined codes
  private currentSalespersonId: number;
  private currentLeadId: number;
  private currentParameterId: number;
  private currentHistoryId: number;
  private dataFilePath: string;

  constructor() {
    this.dataFilePath = path.join(process.cwd(), "data.json");
    this.salespeople = new Map();
    this.leads = new Map();
    this.assignmentHistory = new Map();
    this.customNaceCodes = new Map();
    this.hiddenNaceCodes = new Set();
    this.overriddenDescriptions = new Map();
    this.currentSalespersonId = 1;
    this.currentLeadId = 1;
    this.currentParameterId = 1;
    this.currentHistoryId = 1;
    
    // Load existing data or initialize with defaults
    this.loadData();
  }

  private loadData() {
    try {
      if (fs.existsSync(this.dataFilePath)) {
        const rawData = fs.readFileSync(this.dataFilePath, 'utf-8');
        const data = JSON.parse(rawData);
        
        // Restore Maps from serialized data with proper date parsing
        this.salespeople = new Map((data.salespeople || []).map(([id, salesperson]: [number, any]) => [
          id, 
          { 
            ...salesperson, 
            createdAt: new Date(salesperson.createdAt),
            // Migrate old schema to new inbound/outbound schema
            inboundBestSector: salesperson.inboundBestSector || salesperson.bestSector || "22.11",
            inboundSecondBestSector: salesperson.inboundSecondBestSector || salesperson.secondBestSector || "28.13",
            inboundThirdBestSector: salesperson.inboundThirdBestSector || salesperson.thirdBestSector || "25.12",
            outboundBestSector: salesperson.outboundBestSector || salesperson.bestSector || "22.11",
            outboundSecondBestSector: salesperson.outboundSecondBestSector || salesperson.secondBestSector || "28.13",
            outboundThirdBestSector: salesperson.outboundThirdBestSector || salesperson.thirdBestSector || "25.12"
          }
        ]));
        
        this.leads = new Map((data.leads || []).map(([id, lead]: [number, any]) => [
          id, 
          { ...lead, createdAt: new Date(lead.createdAt), type: lead.type || 'inbound' }
        ]));
        
        this.assignmentHistory = new Map((data.assignmentHistory || []).map(([id, history]: [number, any]) => [
          id, 
          { ...history, createdAt: new Date(history.createdAt) }
        ]));
        
        this.customNaceCodes = new Map(data.customNaceCodes || []);
        this.hiddenNaceCodes = new Set(data.hiddenNaceCodes || []);
        this.overriddenDescriptions = new Map(data.overriddenDescriptions || []);
        
        this.assignmentParameters = data.assignmentParameters ? {
          ...data.assignmentParameters,
          updatedAt: new Date(data.assignmentParameters.updatedAt)
        } : undefined;
        
        this.currentSalespersonId = data.currentSalespersonId || 1;
        this.currentLeadId = data.currentLeadId || 1;
        this.currentParameterId = data.currentParameterId || 1;
        this.currentHistoryId = data.currentHistoryId || 1;
        
        console.log(`Loaded ${this.salespeople.size} salespeople from persistent storage`);
      } else {
        // Initialize with defaults only if no data exists
        this.initializeDefaultParameters();
        this.initializeSampleData();
        this.saveData();
      }
    } catch (error) {
      console.error('Error loading data:', error);
      // Fallback to defaults if loading fails
      this.initializeDefaultParameters();
      this.initializeSampleData();
      this.saveData();
    }
  }

  private saveData() {
    try {
      const data = {
        salespeople: Array.from(this.salespeople.entries()),
        leads: Array.from(this.leads.entries()),
        assignmentHistory: Array.from(this.assignmentHistory.entries()),
        assignmentParameters: this.assignmentParameters,
        customNaceCodes: Array.from(this.customNaceCodes.entries()),
        hiddenNaceCodes: Array.from(this.hiddenNaceCodes),
        overriddenDescriptions: Array.from(this.overriddenDescriptions.entries()),
        currentSalespersonId: this.currentSalespersonId,
        currentLeadId: this.currentLeadId,
        currentParameterId: this.currentParameterId,
        currentHistoryId: this.currentHistoryId
      };
      
      fs.writeFileSync(this.dataFilePath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Error saving data:', error);
    }
  }

  private initializeDefaultParameters() {
    const defaultSectorBuckets: SectorBucket[] = [
      { id: "bucket1", name: "Bucket 1", minLeads: 1, maxLeads: 3, weight: 70 },
      { id: "bucket2", name: "Bucket 2", minLeads: 4, maxLeads: 5, weight: 50 },
      { id: "bucket3", name: "Bucket 3", minLeads: 6, maxLeads: 7, weight: 30 },
      { id: "bucket4", name: "Bucket 4", minLeads: 8, maxLeads: 9, weight: 20 },
      { id: "bucket5", name: "Bucket 5", minLeads: 10, maxLeads: null, weight: 0 }
    ];

    const defaultTotalLeadPools: TotalLeadPool[] = [
      { id: "pool1", name: "Pool 1", minLeads: 0, maxLeads: 4, weight: 80 },
      { id: "pool2", name: "Pool 2", minLeads: 5, maxLeads: 7, weight: 60 },
      { id: "pool3", name: "Pool 3", minLeads: 8, maxLeads: 10, weight: 40 },
      { id: "pool4", name: "Pool 4", minLeads: 11, maxLeads: 13, weight: 20 },
      { id: "pool5", name: "Pool 5", minLeads: 14, maxLeads: null, weight: 0 }
    ];

    this.assignmentParameters = {
      id: this.currentParameterId++,
      sectorBuckets: defaultSectorBuckets,
      totalLeadPools: defaultTotalLeadPools,
      updatedAt: new Date()
    };
  }

  private initializeSampleData() {
    // Add sample salespeople with separate inbound/outbound expertise
    const sampleSalespeople = [
      { 
        name: "Edgar Tinoco", role: "PCE", team: "palmela",
        inboundBestSector: "22.11", inboundSecondBestSector: "28.13", inboundThirdBestSector: "25.12",
        outboundBestSector: "22.11", outboundSecondBestSector: "25.12", outboundThirdBestSector: "28.13"
      },
      { 
        name: "Jorge Duarte", role: "PCE", team: "palmela",
        inboundBestSector: "24.10", inboundSecondBestSector: "28.21", inboundThirdBestSector: "33.11",
        outboundBestSector: "28.21", outboundSecondBestSector: "24.10", outboundThirdBestSector: "33.11"
      },
      { 
        name: "João Ferreira", role: "PCE", team: "vila-do-conde",
        inboundBestSector: "45.11", inboundSecondBestSector: "29.10", inboundThirdBestSector: "49.31",
        outboundBestSector: "29.10", outboundSecondBestSector: "45.11", outboundThirdBestSector: "49.31"
      },
      { 
        name: "Pedro Luís", role: "PCE", team: "palmela",
        inboundBestSector: "33.12", inboundSecondBestSector: "28.95", inboundThirdBestSector: "24.45",
        outboundBestSector: "28.95", outboundSecondBestSector: "33.12", outboundThirdBestSector: "24.45"
      },
      { 
        name: "Ricardo Bento", role: "PCE", team: "vila-do-conde",
        inboundBestSector: "22.21", inboundSecondBestSector: "25.61", inboundThirdBestSector: "28.49",
        outboundBestSector: "25.61", outboundSecondBestSector: "22.21", outboundThirdBestSector: "28.49"
      },
      { 
        name: "Ricardo Pinela", role: "PCE", team: "palmela",
        inboundBestSector: "49.32", inboundSecondBestSector: "45.20", inboundThirdBestSector: "29.20",
        outboundBestSector: "45.20", outboundSecondBestSector: "49.32", outboundThirdBestSector: "29.20"
      },
      { 
        name: "Tiago Samora", role: "PCE", team: "vila-do-conde",
        inboundBestSector: "24.31", inboundSecondBestSector: "28.41", inboundThirdBestSector: "25.99",
        outboundBestSector: "28.41", outboundSecondBestSector: "24.31", outboundThirdBestSector: "25.99"
      },
      { 
        name: "Valdo Amado", role: "PCE", team: "palmela",
        inboundBestSector: "33.15", inboundSecondBestSector: "28.11", inboundThirdBestSector: "24.53",
        outboundBestSector: "28.11", outboundSecondBestSector: "33.15", outboundThirdBestSector: "24.53"
      },
      { 
        name: "Filipe Rocha", role: "PCE", team: "vila-do-conde",
        inboundBestSector: "45.31", inboundSecondBestSector: "49.41", inboundThirdBestSector: "29.31",
        outboundBestSector: "49.41", outboundSecondBestSector: "45.31", outboundThirdBestSector: "29.31"
      }
    ];

    sampleSalespeople.forEach(personData => {
      const id = this.currentSalespersonId++;
      const salesperson: Salesperson = {
        id,
        name: personData.name,
        role: personData.role as any,
        team: personData.team as any,
        inboundBestSector: personData.inboundBestSector as any,
        inboundSecondBestSector: personData.inboundSecondBestSector as any,
        inboundThirdBestSector: personData.inboundThirdBestSector as any,
        outboundBestSector: personData.outboundBestSector as any,
        outboundSecondBestSector: personData.outboundSecondBestSector as any,
        outboundThirdBestSector: personData.outboundThirdBestSector as any,
        createdAt: new Date()
      };
      this.salespeople.set(id, salesperson);
    });
  }

  // Salespeople methods
  async getSalespeople(): Promise<Salesperson[]> {
    return Array.from(this.salespeople.values());
  }

  async getSalesperson(id: number): Promise<Salesperson | undefined> {
    return this.salespeople.get(id);
  }

  async createSalesperson(insertSalesperson: InsertSalesperson): Promise<Salesperson> {
    const id = this.currentSalespersonId++;
    const salesperson: Salesperson = {
      ...insertSalesperson,
      id,
      createdAt: new Date()
    };
    this.salespeople.set(id, salesperson);
    this.saveData();
    return salesperson;
  }

  async updateSalesperson(id: number, updateData: Partial<InsertSalesperson>): Promise<Salesperson | undefined> {
    const existing = this.salespeople.get(id);
    if (!existing) return undefined;
    
    const updated: Salesperson = { ...existing, ...updateData };
    this.salespeople.set(id, updated);
    this.saveData();
    return updated;
  }

  async deleteSalesperson(id: number): Promise<boolean> {
    const result = this.salespeople.delete(id);
    if (result) {
      this.saveData();
    }
    return result;
  }

  // Leads methods
  async getLeads(): Promise<Lead[]> {
    return Array.from(this.leads.values());
  }

  async getLead(id: number): Promise<Lead | undefined> {
    return this.leads.get(id);
  }

  async createLead(insertLead: InsertLead): Promise<Lead> {
    const id = this.currentLeadId++;
    const lead: Lead = {
      name: insertLead.name,
      vat: insertLead.vat || null,
      sector: insertLead.sector,
      region: insertLead.region,
      details: insertLead.details || null,
      type: insertLead.type || "inbound",
      status: insertLead.status || "assigned",
      assignedTo: insertLead.assignedTo || null,
      id,
      createdAt: new Date()
    };
    this.leads.set(id, lead);
    this.saveData();
    return lead;
  }

  async updateLead(id: number, updateData: Partial<InsertLead>): Promise<Lead | undefined> {
    const existing = this.leads.get(id);
    if (!existing) return undefined;
    
    const updated: Lead = { ...existing, ...updateData };
    this.leads.set(id, updated);
    this.saveData();
    return updated;
  }

  async deleteLead(id: number): Promise<boolean> {
    const exists = this.leads.has(id);
    if (!exists) return false;
    
    this.leads.delete(id);
    this.saveData();
    return true;
  }

  async getLeadsBySalesperson(salespersonId: number): Promise<Lead[]> {
    return Array.from(this.leads.values()).filter(lead => lead.assignedTo === salespersonId);
  }

  async getLeadsBySector(sector: string): Promise<Lead[]> {
    return Array.from(this.leads.values()).filter(lead => lead.sector === sector);
  }

  async getLeadsByRegion(region: string): Promise<Lead[]> {
    return Array.from(this.leads.values()).filter(lead => lead.region === region);
  }

  // Assignment Parameters methods
  async getAssignmentParameters(): Promise<AssignmentParameters | undefined> {
    return this.assignmentParameters;
  }

  async createOrUpdateAssignmentParameters(params: InsertAssignmentParameters): Promise<AssignmentParameters> {
    if (this.assignmentParameters) {
      this.assignmentParameters = {
        ...this.assignmentParameters,
        ...params,
        updatedAt: new Date()
      };
    } else {
      this.assignmentParameters = {
        ...params,
        id: this.currentParameterId++,
        updatedAt: new Date()
      };
    }
    this.saveData();
    return this.assignmentParameters;
  }

  // Assignment History methods
  async getAssignmentHistory(): Promise<AssignmentHistory[]> {
    return Array.from(this.assignmentHistory.values());
  }

  async createAssignmentHistory(insertHistory: InsertAssignmentHistory): Promise<AssignmentHistory> {
    const id = this.currentHistoryId++;
    const history: AssignmentHistory = {
      ...insertHistory,
      id,
      leadId: insertHistory.leadId || null,
      salespersonId: insertHistory.salespersonId || null,
      assignmentReason: insertHistory.assignmentReason || null,
      bucketUsed: insertHistory.bucketUsed || null,
      poolUsed: insertHistory.poolUsed || null,
      assignmentWeight: insertHistory.assignmentWeight || null,
      createdAt: new Date()
    };
    this.assignmentHistory.set(id, history);
    this.saveData();
    return history;
  }

  async getAssignmentHistoryByLead(leadId: number): Promise<AssignmentHistory[]> {
    return Array.from(this.assignmentHistory.values()).filter(history => history.leadId === leadId);
  }

  async getAssignmentHistoryBySalesperson(salespersonId: number): Promise<AssignmentHistory[]> {
    return Array.from(this.assignmentHistory.values()).filter(history => history.salespersonId === salespersonId);
  }

  // Custom NACE Codes methods
  async getCustomNaceCodes(): Promise<{ code: string; description: string }[]> {
    return Array.from(this.customNaceCodes.entries()).map(([code, description]) => ({ code, description }));
  }

  async addCustomNaceCode(code: string, description: string): Promise<{ code: string; description: string }> {
    const { SECTORS } = await import("@shared/schema");
    
    // If it's a predefined code, set as override (and unhide if hidden)
    if (SECTORS.includes(code)) {
      this.overriddenDescriptions.set(code, description);
      this.hiddenNaceCodes.delete(code); // Unhide if it was hidden
    } else {
      // Custom code
      this.customNaceCodes.set(code, description);
    }
    
    this.saveData();
    return { code, description };
  }

  async deleteCustomNaceCode(code: string): Promise<boolean> {
    const { SECTORS } = await import("@shared/schema");
    
    // If it's a custom code, delete it
    if (this.customNaceCodes.has(code)) {
      const result = this.customNaceCodes.delete(code);
      if (result) {
        this.saveData();
      }
      return result;
    }
    
    // If it's a predefined code, hide it
    if (SECTORS.includes(code)) {
      this.hiddenNaceCodes.add(code);
      this.overriddenDescriptions.delete(code); // Remove any override
      this.saveData();
      return true;
    }
    
    return false;
  }

  async getAllNaceCodes(): Promise<{ code: string; description: string }[]> {
    const { SECTORS, SECTOR_DESCRIPTIONS } = await import("@shared/schema");
    
    // Get predefined NACE codes (excluding "other" and hidden codes)
    const predefinedCodes = SECTORS
      .filter(code => code !== "other" && !this.hiddenNaceCodes.has(code))
      .map(code => ({
        code,
        // Use overridden description if available, otherwise default
        description: this.overriddenDescriptions.get(code) || SECTOR_DESCRIPTIONS[code] || code
      }));
    
    // Get custom NACE codes
    const customCodes = await this.getCustomNaceCodes();
    
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

// Import the new database storage
import { storage as dbStorage } from "./db-storage";

export const storage = dbStorage;
