import * as fs from "fs";
import * as path from "path";
import { storage } from "./db-storage";

async function migrateData() {
  console.log("Starting data migration from data.json to PostgreSQL...");
  
  try {
    const dataFilePath = path.join(process.cwd(), "data.json");
    
    if (!fs.existsSync(dataFilePath)) {
      console.log("No data.json file found. Nothing to migrate.");
      return;
    }

    const rawData = fs.readFileSync(dataFilePath, 'utf-8');
    const data = JSON.parse(rawData);
    
    console.log("Loading data from data.json...");

    // 1. Migrate Assignment Parameters
    if (data.assignmentParameters) {
      console.log("Migrating assignment parameters...");
      await storage.createOrUpdateAssignmentParameters({
        sectorBuckets: data.assignmentParameters.sectorBuckets,
        totalLeadPools: data.assignmentParameters.totalLeadPools
      });
      console.log("✓ Assignment parameters migrated");
    }

    // 2. Migrate Salespeople
    if (data.salespeople && data.salespeople.length > 0) {
      console.log(`Migrating ${data.salespeople.length} salespeople...`);
      
      for (const [id, salesperson] of data.salespeople) {
        await storage.createSalesperson({
          name: salesperson.name,
          role: salesperson.role,
          team: salesperson.team,
          inboundBestSector: salesperson.inboundBestSector,
          inboundSecondBestSector: salesperson.inboundSecondBestSector,
          inboundThirdBestSector: salesperson.inboundThirdBestSector,
          outboundBestSector: salesperson.outboundBestSector,
          outboundSecondBestSector: salesperson.outboundSecondBestSector,
          outboundThirdBestSector: salesperson.outboundThirdBestSector,
        });
      }
      console.log("✓ Salespeople migrated");
    }

    // 3. Migrate Leads
    if (data.leads && data.leads.length > 0) {
      console.log(`Migrating ${data.leads.length} leads...`);
      
      for (const [id, lead] of data.leads) {
        await storage.createLead({
          name: lead.name,
          vat: lead.vat,
          sector: lead.sector,
          region: lead.region,
          details: lead.details,
          type: lead.type || 'inbound',
          assignedTo: lead.assignedTo,
          status: lead.status || 'assigned'
        });
      }
      console.log("✓ Leads migrated");
    }

    // 4. Migrate Assignment History
    if (data.assignmentHistory && data.assignmentHistory.length > 0) {
      console.log(`Migrating ${data.assignmentHistory.length} assignment history records...`);
      
      for (const [id, history] of data.assignmentHistory) {
        await storage.createAssignmentHistory({
          leadId: history.leadId,
          salespersonId: history.salespersonId,
          sector: history.sector,
          region: history.region,
          assignmentReason: history.assignmentReason,
          bucketUsed: history.bucketUsed,
          poolUsed: history.poolUsed,
          assignmentWeight: history.assignmentWeight
        });
      }
      console.log("✓ Assignment history migrated");
    }

    // 5. Migrate NACE Customizations
    let naceCustomizationsCount = 0;
    
    // Migrate custom NACE codes
    if (data.customNaceCodes && data.customNaceCodes.length > 0) {
      console.log(`Migrating ${data.customNaceCodes.length} custom NACE codes...`);
      for (const [code, description] of data.customNaceCodes) {
        await storage.addCustomNaceCode(code, description);
        naceCustomizationsCount++;
      }
    }
    
    // Migrate hidden NACE codes
    if (data.hiddenNaceCodes && data.hiddenNaceCodes.length > 0) {
      console.log(`Migrating ${data.hiddenNaceCodes.length} hidden NACE codes...`);
      for (const code of data.hiddenNaceCodes) {
        await storage.deleteCustomNaceCode(code); // This will hide predefined codes
        naceCustomizationsCount++;
      }
    }
    
    // Migrate overridden descriptions
    if (data.overriddenDescriptions && data.overriddenDescriptions.length > 0) {
      console.log(`Migrating ${data.overriddenDescriptions.length} overridden NACE descriptions...`);
      for (const [code, description] of data.overriddenDescriptions) {
        await storage.addCustomNaceCode(code, description); // This will override predefined descriptions
        naceCustomizationsCount++;
      }
    }
    
    if (naceCustomizationsCount > 0) {
      console.log("✓ NACE customizations migrated");
    }

    console.log("🎉 Data migration completed successfully!");
    console.log("You can now delete data.json as all data is stored in PostgreSQL.");
    
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

// Run migration if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateData().then(() => {
    console.log("Migration finished.");
    process.exit(0);
  });
}

export { migrateData };