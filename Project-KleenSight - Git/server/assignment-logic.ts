import { storage } from "./storage";
import type { Salesperson, Lead, SectorBucket, TotalLeadPool } from "@shared/schema";

export async function previewLeadAssignment(name: string, vat: string | null, sector: string, region: string, details: string, type: string = "inbound") {
  // Get all salespeople in the specified region
  const allSalespeople = await storage.getSalespeople();
  const regionSalespeople = allSalespeople.filter(sp => sp.team === region);
  
  if (regionSalespeople.length === 0) {
    throw new Error(`No salespeople found in region: ${region}`);
  }

  // Get assignment parameters
  const parameters = await storage.getAssignmentParameters();
  if (!parameters) {
    throw new Error("Assignment parameters not configured");
  }

  // Get all leads to calculate current assignments
  const allLeads = await storage.getLeads();
  
  // Helper function to get sector match level based on lead type
  function getSectorMatchLevel(salesperson: Salesperson, targetSector: string, leadType: string): number {
    // Get the appropriate sector expertise based on lead type
    const bestSector = leadType === "inbound" ? salesperson.inboundBestSector : salesperson.outboundBestSector;
    const secondBestSector = leadType === "inbound" ? salesperson.inboundSecondBestSector : salesperson.outboundSecondBestSector;
    const thirdBestSector = leadType === "inbound" ? salesperson.inboundThirdBestSector : salesperson.outboundThirdBestSector;
    
    // Exact match (highest priority)
    if (bestSector === targetSector) return 3;
    if (secondBestSector === targetSector) return 2;
    if (thirdBestSector === targetSector) return 1;
    
    // Two-digit match (XY from XY.TZ)
    const targetTwoDigit = targetSector.split('.')[0];
    if (bestSector.split('.')[0] === targetTwoDigit) return 0.6;
    if (secondBestSector.split('.')[0] === targetTwoDigit) return 0.5;
    if (thirdBestSector.split('.')[0] === targetTwoDigit) return 0.4;
    
    // No match
    return 0;
  }

  // Filter salespeople by sector expertise with hierarchical matching based on lead type
  const exactSectorSalespeople = regionSalespeople.filter(sp => {
    const bestSector = type === "inbound" ? sp.inboundBestSector : sp.outboundBestSector;
    const secondBestSector = type === "inbound" ? sp.inboundSecondBestSector : sp.outboundSecondBestSector;
    const thirdBestSector = type === "inbound" ? sp.inboundThirdBestSector : sp.outboundThirdBestSector;
    return bestSector === sector || secondBestSector === sector || thirdBestSector === sector;
  });

  // If no exact match, check for two-digit matches
  const twoDigitSector = sector.split('.')[0];
  const twoDigitSectorSalespeople = exactSectorSalespeople.length === 0 ? 
    regionSalespeople.filter(sp => {
      const bestSector = type === "inbound" ? sp.inboundBestSector : sp.outboundBestSector;
      const secondBestSector = type === "inbound" ? sp.inboundSecondBestSector : sp.outboundSecondBestSector;
      const thirdBestSector = type === "inbound" ? sp.inboundThirdBestSector : sp.outboundThirdBestSector;
      const bestTwoDigit = bestSector.split('.')[0];
      const secondTwoDigit = secondBestSector.split('.')[0];
      const thirdTwoDigit = thirdBestSector.split('.')[0];
      return bestTwoDigit === twoDigitSector || 
             secondTwoDigit === twoDigitSector || 
             thirdTwoDigit === twoDigitSector;
    }) : [];

  // Calculate assignment probabilities for ALL regional candidates with hierarchical scoring
  const allCandidatesWithProbabilities = regionSalespeople.map(salesperson => {
    const salespersonLeads = allLeads.filter(lead => lead.assignedTo === salesperson.id && lead.status === "assigned");
    const totalLeads = salespersonLeads.length;
    const sectorLeads = salespersonLeads.filter(lead => lead.sector === sector).length;

    // Calculate what the buckets/pools would be if this person got the lead
    const futureTotal = totalLeads + 1;
    const futureSector = sectorLeads + 1;

    // Determine bucket based on future sector leads (after assignment)
    const futureBucket = getBucket(futureSector, parameters.sectorBuckets as SectorBucket[]);
    
    // Determine pool based on future total leads (after assignment)
    const futurePool = getPool(futureTotal, parameters.totalLeadPools as TotalLeadPool[]);

    // Calculate sector expertise bonus using hierarchical matching based on lead type
    const sectorBonus = getSectorMatchLevel(salesperson, sector, type);

    // Calculate base assignment chance based on bucket and pool weights
    let baseAssignmentChance = 0;
    if (futureBucket && futurePool) {
      // Bucket weight % × Pool weight % = Base assignment chance %
      baseAssignmentChance = (futureBucket.weight * futurePool.weight) / 100;
    }

    // Apply sector expertise multiplier to the base chance
    // Higher sector expertise gets significant advantage
    const sectorMultiplier = sectorBonus > 0 ? (1 + sectorBonus * 2) : 0.1; // Non-experts get very low chance
    const finalAssignmentChance = baseAssignmentChance * sectorMultiplier;

    return {
      salesperson,
      totalLeads,
      sectorLeads,
      futureBucket,
      futurePool,
      assignmentChance: finalAssignmentChance,
      sectorBonus,
      hasExpertise: sectorBonus > 0
    };
  });

  // Determine the matching type for messaging
  const matchingType = exactSectorSalespeople.length > 0 ? 'exact' : 
                       twoDigitSectorSalespeople.length > 0 ? 'twoDigit' : 
                       'random';

  // Filter out candidates with 0 assignment chance and use weighted random selection
  const viableCandidates = allCandidatesWithProbabilities.filter(candidate => candidate.assignmentChance > 0);
  
  if (viableCandidates.length === 0) {
    throw new Error("No suitable salesperson found - all candidates have reached maximum capacity");
  }

  // Use weighted random selection among all viable candidates
  const totalWeight = viableCandidates.reduce((sum, candidate) => sum + candidate.assignmentChance, 0);
  const randomValue = Math.random() * totalWeight;
  let accumulatedWeight = 0;
  
  let selectedCandidate;
  for (const candidate of viableCandidates) {
    accumulatedWeight += candidate.assignmentChance;
    if (randomValue <= accumulatedWeight) {
      selectedCandidate = candidate;
      break;
    }
  }

  if (!selectedCandidate) {
    selectedCandidate = viableCandidates[0];
  }



  // Preview data (no actual lead creation yet)
  const previewLead = {
    name,
    vat,
    sector,
    region,
    details,
    type,
    assignedTo: selectedCandidate.salesperson.id,
    status: "assigned" as const
  };

  // Prepare candidates for display using the new all-candidates approach
  const allCandidatesForDisplay = allCandidatesWithProbabilities.map(candidate => ({
    name: candidate.salesperson.name,
    score: totalWeight > 0 ? (candidate.assignmentChance / totalWeight) * 100 : 0,
    sectorBonus: candidate.sectorBonus,
    totalLeads: candidate.totalLeads,
    sectorLeads: candidate.sectorLeads,
    weight: totalWeight > 0 ? (candidate.assignmentChance / totalWeight) * 100 : 0
  }));

  // Calculate the actual selection probability for the selected candidate
  const actualSelectionProbability = totalWeight > 0 ? (selectedCandidate.assignmentChance / totalWeight) * 100 : 0;

  return {
    lead: previewLead,
    assignedTo: selectedCandidate.salesperson,
    assignmentDetails: {
      totalLeads: selectedCandidate.totalLeads,
      sectorLeads: selectedCandidate.sectorLeads,
      bucket: selectedCandidate.futureBucket,
      pool: selectedCandidate.futurePool,
      weight: actualSelectionProbability,
      sectorBonus: selectedCandidate.sectorBonus,
      finalScore: actualSelectionProbability,
      reasoning: matchingType === 'exact'
        ? `Selected ${selectedCandidate.salesperson.name} with ${actualSelectionProbability.toFixed(1)}% probability (exact sector match). Sector expertise: ${selectedCandidate.sectorBonus}x multiplier, Current workload: ${selectedCandidate.totalLeads} total leads (${selectedCandidate.sectorLeads} in ${sector}), Future placement: ${selectedCandidate.futureBucket?.name || 'N/A'} bucket, ${selectedCandidate.futurePool?.name || 'N/A'} pool.`
        : matchingType === 'twoDigit'
        ? `Selected ${selectedCandidate.salesperson.name} with ${actualSelectionProbability.toFixed(1)}% probability (two-digit sector match: ${twoDigitSector}). Sector expertise: ${selectedCandidate.sectorBonus}x multiplier, Current workload: ${selectedCandidate.totalLeads} total leads (${selectedCandidate.sectorLeads} in ${sector}), Future placement: ${selectedCandidate.futureBucket?.name || 'N/A'} bucket, ${selectedCandidate.futurePool?.name || 'N/A'} pool.`
        : `Randomly assigned to ${selectedCandidate.salesperson.name} with ${actualSelectionProbability.toFixed(1)}% probability based on pool weight (no sector expertise available)`,
      allCandidates: allCandidatesForDisplay.sort((a, b) => b.score - a.score)
    }
  };
}

export async function confirmLeadAssignment(
  name: string, 
  vat: string | null, 
  sector: string, 
  region: string, 
  details: string, 
  type: string = "inbound",
  assignedToId: number
) {
  // Create the lead
  const lead = await storage.createLead({
    name,
    vat,
    sector,
    region,
    details,
    type,
    assignedTo: assignedToId,
    status: "assigned"
  });

  // Get the assigned salesperson
  const assignedSalesperson = await storage.getSalesperson(assignedToId);
  if (!assignedSalesperson) {
    throw new Error("Assigned salesperson not found");
  }

  // Get assignment parameters for history
  const parameters = await storage.getAssignmentParameters();
  if (!parameters) {
    throw new Error("Assignment parameters not configured");
  }

  // Get all leads to calculate current assignments for history
  const allLeads = await storage.getLeads();
  const salespersonLeads = allLeads.filter(l => l.assignedTo === assignedToId && l.status === "assigned");
  const totalLeads = salespersonLeads.length - 1; // Subtract 1 because we just created the lead
  const sectorLeads = salespersonLeads.filter(l => l.sector === sector).length - 1;

  // Calculate buckets and pools for history
  const futureTotal = totalLeads + 1;
  const futureSector = sectorLeads + 1;
  const futureBucket = getBucket(futureSector, parameters.sectorBuckets as SectorBucket[]);
  const futurePool = getPool(futureTotal, parameters.totalLeadPools as TotalLeadPool[]);

  // Calculate assignment weight
  let assignmentWeight = 0;
  if (futureBucket && futurePool) {
    assignmentWeight = (futureBucket.weight * futurePool.weight) / 100;
  }

  // Helper function to get sector match level based on lead type (duplicate from above)
  function getSectorMatchLevel(salesperson: any, targetSector: string, leadType: string): number {
    // Get the appropriate sector expertise based on lead type
    const bestSector = leadType === "inbound" ? salesperson.inboundBestSector : salesperson.outboundBestSector;
    const secondBestSector = leadType === "inbound" ? salesperson.inboundSecondBestSector : salesperson.outboundSecondBestSector;
    const thirdBestSector = leadType === "inbound" ? salesperson.inboundThirdBestSector : salesperson.outboundThirdBestSector;
    
    // Exact match (highest priority)
    if (bestSector === targetSector) return 3;
    if (secondBestSector === targetSector) return 2;
    if (thirdBestSector === targetSector) return 1;
    
    // Two-digit match (XY from XY.TZ)
    const targetTwoDigit = targetSector.split('.')[0];
    if (bestSector.split('.')[0] === targetTwoDigit) return 0.6;
    if (secondBestSector.split('.')[0] === targetTwoDigit) return 0.5;
    if (thirdBestSector.split('.')[0] === targetTwoDigit) return 0.4;
    
    // No match
    return 0;
  }

  // Determine assignment reason with hierarchical matching
  let assignmentReason = "";
  const allSalespeople = await storage.getSalespeople();
  const regionSalespeople = allSalespeople.filter(sp => sp.team === region);
  
  const exactSectorSalespeople = regionSalespeople.filter(sp => {
    const bestSector = type === "inbound" ? sp.inboundBestSector : sp.outboundBestSector;
    const secondBestSector = type === "inbound" ? sp.inboundSecondBestSector : sp.outboundSecondBestSector;
    const thirdBestSector = type === "inbound" ? sp.inboundThirdBestSector : sp.outboundThirdBestSector;
    return bestSector === sector || secondBestSector === sector || thirdBestSector === sector;
  });

  const twoDigitSector = sector.split('.')[0];
  const twoDigitSectorSalespeople = exactSectorSalespeople.length === 0 ? 
    regionSalespeople.filter(sp => {
      const bestSector = type === "inbound" ? sp.inboundBestSector : sp.outboundBestSector;
      const secondBestSector = type === "inbound" ? sp.inboundSecondBestSector : sp.outboundSecondBestSector;
      const thirdBestSector = type === "inbound" ? sp.inboundThirdBestSector : sp.outboundThirdBestSector;
      const bestTwoDigit = bestSector.split('.')[0];
      const secondTwoDigit = secondBestSector.split('.')[0];
      const thirdTwoDigit = thirdBestSector.split('.')[0];
      return bestTwoDigit === twoDigitSector || 
             secondTwoDigit === twoDigitSector || 
             thirdTwoDigit === twoDigitSector;
    }) : [];

  const matchingType = exactSectorSalespeople.length > 0 ? 'exact' : 
                       twoDigitSectorSalespeople.length > 0 ? 'twoDigit' : 
                       'random';

  const sectorBonus = getSectorMatchLevel(assignedSalesperson, sector, type);
  
  if (matchingType === 'exact') {
    assignmentReason = `Assigned with ${assignmentWeight.toFixed(1)}% probability based on ${futureBucket?.name || 'N/A'} bucket and ${futurePool?.name || 'N/A'} pool (exact sector match)`;
  } else if (matchingType === 'twoDigit') {
    assignmentReason = `Assigned with ${assignmentWeight.toFixed(1)}% probability based on ${futureBucket?.name || 'N/A'} bucket and ${futurePool?.name || 'N/A'} pool (two-digit sector match: ${twoDigitSector})`;
  } else {
    assignmentReason = `Randomly assigned with ${assignmentWeight.toFixed(1)}% probability based on ${futurePool?.name || 'N/A'} pool (no sector expertise available)`;
  }

  // Create assignment history record
  await storage.createAssignmentHistory({
    leadId: lead.id,
    salespersonId: assignedToId,
    sector,
    region,
    assignmentReason,
    bucketUsed: futureBucket?.name || null,
    poolUsed: futurePool?.name || null,
    assignmentWeight: assignmentWeight
  });

  return {
    lead,
    assignedTo: assignedSalesperson
  };
}

function getBucket(sectorLeads: number, buckets: SectorBucket[]): SectorBucket | undefined {
  return buckets.find(bucket => {
    if (bucket.maxLeads === null) {
      return sectorLeads >= bucket.minLeads;
    }
    return sectorLeads >= bucket.minLeads && sectorLeads <= bucket.maxLeads;
  });
}

function getPool(totalLeads: number, pools: TotalLeadPool[]): TotalLeadPool | undefined {
  return pools.find(pool => {
    if (pool.maxLeads === null) {
      return totalLeads >= pool.minLeads;
    }
    return totalLeads >= pool.minLeads && totalLeads <= pool.maxLeads;
  });
}

function getAssignmentWeight(bucketId: string, poolId: string, buckets: SectorBucket[], pools: TotalLeadPool[]): number {
  // Find the bucket and pool weights
  const bucket = buckets.find(b => b.id === bucketId);
  const pool = pools.find(p => p.id === poolId);
  
  if (!bucket || !pool) {
    return 1.0; // Default weight
  }
  
  // Calculate weight as bucket weight × pool weight
  // Convert percentages to decimals (e.g., 30% = 0.3)
  const bucketWeight = bucket.weight / 100;
  const poolWeight = pool.weight / 100;
  
  return bucketWeight * poolWeight;
}
