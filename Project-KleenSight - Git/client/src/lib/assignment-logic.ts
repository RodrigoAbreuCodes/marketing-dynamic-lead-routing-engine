import type { Salesperson, SectorBucket, TotalLeadPool } from "@shared/schema";

export interface AssignmentCandidate {
  salesperson: Salesperson;
  totalLeads: number;
  sectorLeads: number;
  bucket: SectorBucket | null;
  pool: TotalLeadPool | null;
  weight: number;
  sectorBonus: number;
  finalScore: number;
}

export function calculateAssignmentScore(
  salesperson: Salesperson,
  sector: string,
  allLeads: any[],
  buckets: SectorBucket[],
  pools: TotalLeadPool[]
): AssignmentCandidate {
  const salespersonLeads = allLeads.filter(lead => 
    lead.assignedTo === salesperson.id && lead.status === "assigned"
  );
  
  const totalLeads = salespersonLeads.length;
  const sectorLeads = salespersonLeads.filter(lead => lead.sector === sector).length;

  // Find appropriate bucket
  const bucket = buckets.find(b => {
    if (b.maxLeads === null) {
      return sectorLeads >= b.minLeads;
    }
    return sectorLeads >= b.minLeads && sectorLeads <= b.maxLeads;
  }) || null;

  // Find appropriate pool
  const pool = pools.find(p => {
    if (p.maxLeads === null) {
      return totalLeads >= p.minLeads;
    }
    return totalLeads >= p.minLeads && totalLeads <= p.maxLeads;
  }) || null;

  // Calculate weight automatically from bucket and pool percentages
  const bucketWeight = bucket ? bucket.weight / 100 : 0.01; // Convert to decimal
  const poolWeight = pool ? pool.weight / 100 : 0.01; // Convert to decimal
  const weight = bucketWeight * poolWeight;

  // Calculate sector expertise bonus with hierarchical matching
  function getSectorMatchLevel(salesperson: Salesperson, targetSector: string): number {
    // Exact match (highest priority)
    if (salesperson.bestSector === targetSector) return 3;
    if (salesperson.secondBestSector === targetSector) return 2;
    if (salesperson.thirdBestSector === targetSector) return 1;
    
    // Two-digit match (XY from XY.TZ)
    const targetTwoDigit = targetSector.split('.')[0];
    if (salesperson.bestSector.split('.')[0] === targetTwoDigit) return 0.6;
    if (salesperson.secondBestSector.split('.')[0] === targetTwoDigit) return 0.5;
    if (salesperson.thirdBestSector.split('.')[0] === targetTwoDigit) return 0.4;
    
    // No match
    return 0;
  }

  const sectorBonus = getSectorMatchLevel(salesperson, sector);

  // Calculate final score with random factor to break ties
  const finalScore = (weight + sectorBonus) * (1 + Math.random() * 0.1);

  return {
    salesperson,
    totalLeads,
    sectorLeads,
    bucket,
    pool,
    weight,
    sectorBonus,
    finalScore
  };
}

export function selectBestCandidate(candidates: AssignmentCandidate[]): AssignmentCandidate | null {
  if (candidates.length === 0) return null;
  
  // Sort by final score (descending) and return the best
  candidates.sort((a, b) => b.finalScore - a.finalScore);
  return candidates[0];
}
