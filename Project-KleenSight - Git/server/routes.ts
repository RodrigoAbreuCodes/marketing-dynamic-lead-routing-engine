import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertSalespersonSchema, insertLeadSchema, insertAssignmentParametersSchema, SECTORS, TEAMS, SECTOR_DESCRIPTIONS } from "@shared/schema";
import { previewLeadAssignment, confirmLeadAssignment } from "./assignment-logic";

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Salespeople routes
  app.get("/api/salespeople", async (req, res) => {
    try {
      const salespeople = await storage.getSalespeople();
      res.json(salespeople);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch salespeople" });
    }
  });

  app.get("/api/salespeople/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const salesperson = await storage.getSalesperson(id);
      if (!salesperson) {
        return res.status(404).json({ message: "Salesperson not found" });
      }
      res.json(salesperson);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch salesperson" });
    }
  });

  app.post("/api/salespeople", async (req, res) => {
    try {
      const validatedData = insertSalespersonSchema.parse(req.body);
      const salesperson = await storage.createSalesperson(validatedData);
      res.status(201).json(salesperson);
    } catch (error) {
      res.status(400).json({ message: "Invalid salesperson data", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.put("/api/salespeople/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertSalespersonSchema.partial().parse(req.body);
      const salesperson = await storage.updateSalesperson(id, validatedData);
      if (!salesperson) {
        return res.status(404).json({ message: "Salesperson not found" });
      }
      res.json(salesperson);
    } catch (error) {
      res.status(400).json({ message: "Invalid salesperson data", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.delete("/api/salespeople/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteSalesperson(id);
      if (!deleted) {
        return res.status(404).json({ message: "Salesperson not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete salesperson" });
    }
  });

  // Leads routes
  app.get("/api/leads", async (req, res) => {
    try {
      const leads = await storage.getLeads();
      res.json(leads);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch leads" });
    }
  });

  app.get("/api/leads/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const lead = await storage.getLead(id);
      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }
      res.json(lead);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch lead" });
    }
  });

  app.post("/api/leads", async (req, res) => {
    try {
      const validatedData = insertLeadSchema.parse(req.body);
      const lead = await storage.createLead(validatedData);
      res.status(201).json(lead);
    } catch (error) {
      res.status(400).json({ message: "Invalid lead data", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.put("/api/leads/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertLeadSchema.partial().parse(req.body);
      const lead = await storage.updateLead(id, validatedData);
      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }
      res.json(lead);
    } catch (error) {
      res.status(400).json({ message: "Invalid lead data", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.delete("/api/leads/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteLead(id);
      if (!deleted) {
        return res.status(404).json({ message: "Lead not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete lead" });
    }
  });

  app.get("/api/leads/salesperson/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const leads = await storage.getLeadsBySalesperson(id);
      res.json(leads);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch leads for salesperson" });
    }
  });

  app.post("/api/leads/assign", async (req, res) => {
    try {
      const { name, vat, sector, region, details, type } = req.body;
      
      if (!name || !sector || !region) {
        return res.status(400).json({ message: "Name, sector and region are required" });
      }

      // Check if sector is valid (either predefined or custom)
      const allNaceCodes = await storage.getAllNaceCodes();
      const validSectors = allNaceCodes.map(c => c.code);
      if (!validSectors.includes(sector) && !SECTORS.includes(sector)) {
        return res.status(400).json({ message: "Invalid sector" });
      }

      if (!TEAMS.includes(region)) {
        return res.status(400).json({ message: "Invalid region" });
      }

      const assignment = await previewLeadAssignment(name, vat || null, sector, region, details || "", type || "inbound");
      res.json(assignment);
    } catch (error) {
      res.status(500).json({ message: "Failed to assign lead", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.post("/api/leads/confirm", async (req, res) => {
    try {
      const { name, vat, sector, region, details, type, assignedToId } = req.body;
      
      if (!name || !sector || !region || !assignedToId) {
        return res.status(400).json({ message: "Name, sector, region, and assignedToId are required" });
      }

      const assignment = await confirmLeadAssignment(name, vat || null, sector, region, details || "", type || "inbound", assignedToId);
      res.json({ message: "Assignment confirmed", ...assignment });
    } catch (error) {
      res.status(500).json({ message: "Failed to confirm assignment", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.post("/api/leads/:id/change-salesperson", async (req, res) => {
    try {
      const leadId = parseInt(req.params.id);
      const { newSalespersonId } = req.body;
      
      if (!newSalespersonId) {
        return res.status(400).json({ message: "New salesperson ID is required" });
      }

      const lead = await storage.getLead(leadId);
      const newSalesperson = await storage.getSalesperson(newSalespersonId);
      
      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }
      
      if (!newSalesperson) {
        return res.status(404).json({ message: "Salesperson not found" });
      }

      // Update lead assignment
      const updatedLead = await storage.updateLead(leadId, { assignedTo: newSalespersonId });
      
      if (!updatedLead) {
        return res.status(404).json({ message: "Failed to update lead" });
      }

      // Create assignment history entry
      await storage.createAssignmentHistory({
        leadId,
        salespersonId: newSalespersonId,
        sector: lead.sector,
        region: lead.region,
        assignmentReason: "Manual reassignment",
        bucketUsed: null,
        poolUsed: null,
        assignmentWeight: null
      });

      // Return the assignment data in the same format as the auto-assign endpoint
      const assignmentDetails = {
        totalLeads: (await storage.getLeadsBySalesperson(newSalespersonId)).length,
        sectorLeads: (await storage.getLeadsBySector(lead.sector)).filter(l => l.assignedTo === newSalespersonId).length,
        weight: 0, // Manual assignment doesn't have calculated weight
        bucket: null,
        pool: null
      };

      res.json({
        lead: updatedLead,
        assignedTo: newSalesperson,
        assignmentDetails
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to change salesperson", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Custom NACE Codes routes
  app.get("/api/nace-codes", async (req, res) => {
    try {
      const naceCodes = await storage.getAllNaceCodes();
      res.json(naceCodes);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch NACE codes" });
    }
  });

  app.get("/api/nace-codes/custom", async (req, res) => {
    try {
      const customCodes = await storage.getCustomNaceCodes();
      res.json(customCodes);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch custom NACE codes" });
    }
  });

  app.post("/api/nace-codes", async (req, res) => {
    try {
      const { code, description } = req.body;
      
      if (!code || !description) {
        return res.status(400).json({ message: "Code and description are required" });
      }

      const trimmedCode = code.trim();
      const trimmedDescription = description.trim();

      if (!trimmedCode || !trimmedDescription) {
        return res.status(400).json({ message: "Code and description cannot be empty" });
      }

      // Validate NACE code format (XY.ZK)
      if (!/^[0-9]{2}\.[0-9]{2}$/.test(trimmedCode)) {
        return res.status(400).json({ message: "NACE code must follow format XY.ZK (e.g., 46.64)" });
      }

      // Check if it's already a predefined NACE code
      if (SECTORS.includes(trimmedCode as any)) {
        return res.status(400).json({ message: "This NACE code already exists in the predefined list" });
      }

      // Check if it's already a custom NACE code
      const existingCustomCodes = await storage.getCustomNaceCodes();
      if (existingCustomCodes.some(c => c.code === trimmedCode)) {
        return res.status(400).json({ message: "This custom NACE code already exists" });
      }

      const newCode = await storage.addCustomNaceCode(trimmedCode, trimmedDescription);
      res.status(201).json(newCode);
    } catch (error) {
      res.status(400).json({ message: "Failed to add custom NACE code", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.delete("/api/nace-codes/:code", async (req, res) => {
    try {
      const { code } = req.params;
      
      // Prevent deletion of predefined NACE codes
      if (SECTORS.includes(code as any)) {
        return res.status(400).json({ message: "Cannot delete predefined NACE codes" });
      }

      const deleted = await storage.deleteCustomNaceCode(code);
      if (!deleted) {
        return res.status(404).json({ message: "Custom NACE code not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete custom NACE code" });
    }
  });

  // Assignment Parameters routes
  app.get("/api/assignment-parameters", async (req, res) => {
    try {
      const parameters = await storage.getAssignmentParameters();
      res.json(parameters);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch assignment parameters" });
    }
  });

  app.post("/api/assignment-parameters", async (req, res) => {
    try {
      const validatedData = insertAssignmentParametersSchema.parse(req.body);
      const parameters = await storage.createOrUpdateAssignmentParameters(validatedData);
      res.json(parameters);
    } catch (error) {
      res.status(400).json({ message: "Invalid assignment parameters", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Assignment History routes
  app.get("/api/assignment-history", async (req, res) => {
    try {
      const history = await storage.getAssignmentHistory();
      const salespeople = await storage.getSalespeople();
      const leads = await storage.getLeads();
      
      // Enrich history with lead and salesperson data
      const enrichedHistory = history.map(historyItem => {
        const lead = leads.find(l => l.id === historyItem.leadId);
        const salesperson = salespeople.find(s => s.id === historyItem.salespersonId);
        const sectorDescription = lead?.sector ? SECTOR_DESCRIPTIONS[lead.sector as keyof typeof SECTOR_DESCRIPTIONS] : "Unknown";
        
        return {
          ...historyItem,
          leadName: lead?.name || "Unknown",
          salespersonName: salesperson?.name || "Unknown",
          sector: lead?.sector || "Unknown",
          sectorDescription: sectorDescription || "Unknown",
          region: lead?.region || "Unknown"
        };
      });
      
      res.json(enrichedHistory);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch assignment history" });
    }
  });

  app.get("/api/assignment-history/salesperson/:id", async (req, res) => {
    try {
      const salespersonId = parseInt(req.params.id);
      const history = await storage.getAssignmentHistoryBySalesperson(salespersonId);
      res.json(history);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch assignment history" });
    }
  });

  // Dashboard stats
  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      const salespeople = await storage.getSalespeople();
      const leads = await storage.getLeads();
      const history = await storage.getAssignmentHistory();

      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      
      const weeklyLeads = history.filter(historyItem => {
        const assignedAt = historyItem.createdAt ? new Date(historyItem.createdAt) : new Date();
        return assignedAt >= weekAgo;
      }).length;

      const stats = {
        totalSalespeople: salespeople.length,
        activeLeads: leads.filter(lead => lead.status === "assigned").length,
        weeklyLeads
      };

      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Lead distribution by team
  app.get("/api/dashboard/lead-distribution", async (req, res) => {
    try {
      const salespeople = await storage.getSalespeople();
      const leads = await storage.getLeads();

      const distribution = salespeople.map(salesperson => {
        const salespersonLeads = leads.filter(lead => lead.assignedTo === salesperson.id);
        return {
          id: salesperson.id,
          name: salesperson.name,
          team: salesperson.team,
          leadCount: salespersonLeads.length,
          sectors: salespersonLeads.reduce((acc, lead) => {
            acc[lead.sector] = (acc[lead.sector] || 0) + 1;
            return acc;
          }, {} as Record<string, number>)
        };
      });

      res.json(distribution);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch lead distribution" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
