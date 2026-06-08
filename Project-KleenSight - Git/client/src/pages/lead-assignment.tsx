import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sparkles, User, Target, TrendingUp, Check, UserX, ExternalLink } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

import { SECTORS, SECTOR_DESCRIPTIONS } from "@shared/schema";
import { NaceCodeSelector } from "@/components/NaceCodeSelector";

const SECTOR_OPTIONS = SECTORS.map(code => ({
  value: code,
  label: code === "other" ? "Other (Custom NACE)" : `${code} - ${SECTOR_DESCRIPTIONS[code]}`
}));

const REGIONS = [
  { value: "palmela", label: "Palmela" },
  { value: "vila-do-conde", label: "Vila do Conde" },
];

const LEAD_TYPES = [
  { value: "inbound", label: "Inbound" },
  { value: "outbound", label: "Outbound" },
];

export default function LeadAssignment() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [leadName, setLeadName] = useState("");
  const [vat, setVat] = useState("");
  const [sector, setSector] = useState("");
  const [region, setRegion] = useState("");
  const [details, setDetails] = useState("");
  const [leadType, setLeadType] = useState("inbound");
  const [lastAssignment, setLastAssignment] = useState<any>(null);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [showSalespersonSelector, setShowSalespersonSelector] = useState(false);
  const [selectedSalesperson, setSelectedSalesperson] = useState("");
  const [showAllCandidates, setShowAllCandidates] = useState(false);

  const { data: distribution } = useQuery({
    queryKey: ["/api/dashboard/lead-distribution"],
  });

  const { data: salespeople } = useQuery({
    queryKey: ["/api/salespeople"],
  });

  const assignLeadMutation = useMutation({
    mutationFn: async (data: { name: string; vat?: string; sector: string; region: string; details: string; type: string }) => {
      const response = await apiRequest("POST", "/api/leads/assign", data);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Assignment Proposed",
        description: `Lead suggested for ${data.assignedTo.name}. Please confirm or change salesperson.`,
      });
      setLastAssignment(data);
      setIsConfirmed(false);
      setShowSalespersonSelector(false);
      setLeadName("");
      setVat("");
      setSector("");
      setRegion("");
      setDetails("");
      setLeadType("inbound");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to assign lead",
        variant: "destructive",
      });
    },
  });

  const confirmAssignmentMutation = useMutation({
    mutationFn: async (assignmentData: any) => {
      const response = await apiRequest("POST", "/api/leads/confirm", assignmentData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Assignment Confirmed",
        description: "Lead has been successfully assigned!",
      });
      setIsConfirmed(true);
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/lead-distribution"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/assignment-history"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to confirm assignment",
        variant: "destructive",
      });
    },
  });

  const changeSalespersonMutation = useMutation({
    mutationFn: async (data: { newSalespersonId: number }) => {
      // Get the new salesperson's data
      const newSalesperson = await apiRequest("GET", `/api/salespeople/${data.newSalespersonId}`);
      const salespersonData = await newSalesperson.json();
      
      return salespersonData;
    },
    onSuccess: (salespersonData) => {
      if (lastAssignment) {
        // Update the preview assignment with the new salesperson
        const updatedAssignment = {
          ...lastAssignment,
          lead: {
            ...lastAssignment.lead,
            assignedTo: salespersonData.id
          },
          assignedTo: salespersonData
        };
        
        setLastAssignment(updatedAssignment);
        
        toast({
          title: "Salesperson Changed",
          description: `Lead reassigned to ${salespersonData.name}!`,
        });
      }
      setShowSalespersonSelector(false);
      setSelectedSalesperson("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to change salesperson",
        variant: "destructive",
      });
    },
  });

  const handleAssignLead = (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadName || !sector || !region) {
      toast({
        title: "Error",
        description: "Please fill in lead name, sector and region",
        variant: "destructive",
      });
      return;
    }
    assignLeadMutation.mutate({ name: leadName, vat, sector, region, details, type: leadType });
  };

  const handleConfirmAssignment = () => {
    if (lastAssignment?.lead) {
      confirmAssignmentMutation.mutate({
        name: lastAssignment.lead.name,
        vat: lastAssignment.lead.vat,
        sector: lastAssignment.lead.sector,
        region: lastAssignment.lead.region,
        details: lastAssignment.lead.details,
        type: lastAssignment.lead.type,
        assignedToId: lastAssignment.lead.assignedTo
      });
    }
  };

  const handleChangeSalesperson = () => {
    if (selectedSalesperson) {
      changeSalespersonMutation.mutate({
        newSalespersonId: parseInt(selectedSalesperson),
      });
    }
  };

  const handleShowSalespersonSelector = () => {
    setShowSalespersonSelector(true);
    setSelectedSalesperson("");
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lead Assignment Form */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>New Lead Assignment</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAssignLead} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="leadName">Lead Name *</Label>
                    <Input
                      id="leadName"
                      value={leadName}
                      onChange={(e) => setLeadName(e.target.value)}
                      placeholder="Enter lead company name..."
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="vat">VAT Number</Label>
                    <Input
                      id="vat"
                      value={vat}
                      onChange={(e) => setVat(e.target.value)}
                      placeholder="Enter VAT number (optional)..."
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="sector">Lead Sector</Label>
                    <NaceCodeSelector
                      value={sector}
                      onValueChange={setSector}
                      placeholder="Search NACE codes or enter new code..."
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="region">Region</Label>
                    <Select value={region} onValueChange={setRegion}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select region..." />
                      </SelectTrigger>
                      <SelectContent>
                        {REGIONS.map((r) => (
                          <SelectItem key={r.value} value={r.value}>
                            {r.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="leadType">Lead Type</Label>
                    <Select value={leadType} onValueChange={setLeadType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select lead type..." />
                      </SelectTrigger>
                      <SelectContent>
                        {LEAD_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="details">Lead Details</Label>
                  <Textarea
                    id="details"
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    placeholder="Enter lead details, company information, contact details..."
                    rows={4}
                  />
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={assignLeadMutation.isPending}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  {assignLeadMutation.isPending ? "Assigning..." : "Auto-Assign Lead"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Assignment Result */}
        <div>
          {lastAssignment && (
            <Card>
              <CardHeader>
                <CardTitle>Assignment Result</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <Button
                        variant="link"
                        className="p-0 h-auto font-medium text-blue-600 hover:text-blue-800"
                        onClick={() => navigate(`/salespeople/${lastAssignment.assignedTo.id}`)}
                      >
                        {lastAssignment.assignedTo.name}
                        <ExternalLink className="w-3 h-3 ml-1" />
                      </Button>
                      <p className="text-sm text-gray-600">{lastAssignment.assignedTo.role}</p>
                    </div>
                    {!isConfirmed && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleShowSalespersonSelector}
                        disabled={changeSalespersonMutation.isPending}
                      >
                        <UserX className="w-4 h-4 mr-1" />
                        Change
                      </Button>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Team</span>
                      <Badge 
                        variant="outline" 
                        className={`capitalize ${lastAssignment.assignedTo.team === 'vila-do-conde' ? 'bg-red-900 text-white' : ''}`}
                      >
                        {lastAssignment.assignedTo.team.replace("-", " ")}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Total Leads</span>
                      <Badge variant="secondary">
                        {lastAssignment.assignmentDetails.totalLeads}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Sector Leads</span>
                      <Badge variant="secondary">
                        {lastAssignment.assignmentDetails.sectorLeads}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Assignment Weight</span>
                      <Badge variant="outline">
                        {lastAssignment.assignmentDetails.weight.toFixed(2)}%
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="pt-3 border-t">
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium text-gray-700">Assignment Logic:</h4>
                      <div className="bg-blue-50 p-3 rounded-md">
                        <p className="text-sm text-gray-700 mb-2">
                          <strong>Selected:</strong> {lastAssignment.assignedTo.name} ({lastAssignment.assignmentDetails.finalScore.toFixed(1)} pts)
                        </p>
                        <div className="space-y-1 text-xs text-gray-600">
                          <div>• <strong>Assignment Probability:</strong> {lastAssignment.assignmentDetails.weight.toFixed(2)}%</div>
                          <div>• <strong>Sector Expertise:</strong> {lastAssignment.assignmentDetails.sectorBonus}x multiplier</div>
                          <div>• <strong>Current Load:</strong> {lastAssignment.assignmentDetails.totalLeads} total, {lastAssignment.assignmentDetails.sectorLeads} in sector</div>
                          <div>• <strong>Future Bucket:</strong> {lastAssignment.assignmentDetails.bucket?.name || "N/A"}</div>
                          <div>• <strong>Future Pool:</strong> {lastAssignment.assignmentDetails.pool?.name || "N/A"}</div>
                        </div>
                      </div>
                      
                      {lastAssignment.assignmentDetails.allCandidates && (
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <h5 className="text-xs font-medium text-gray-700">Top Candidates:</h5>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="outline" size="sm" className="text-xs">
                                  Show All ({lastAssignment.assignmentDetails.allCandidates.length})
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                  <DialogTitle>All Assignment Candidates</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-2 max-h-96 overflow-y-auto">
                                  {lastAssignment.assignmentDetails.allCandidates.map((candidate: any, index: number) => {
                                    const isSelected = candidate.name === lastAssignment.assignedTo.name;
                                    return (
                                      <div key={index} className={`flex items-center justify-between p-3 rounded text-sm ${
                                        isSelected ? 'bg-green-50 border border-green-200' : 'bg-gray-50'
                                      }`}>
                                        <div className="flex items-center gap-2">
                                          <span className={`font-medium ${isSelected ? 'text-green-700' : 'text-gray-700'}`}>
                                            {index + 1}. {candidate.name}
                                          </span>
                                          {isSelected && (
                                            <Badge variant="default" className="text-[10px] px-1.5 py-0 font-medium bg-green-600 text-white">SEL</Badge>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-4 text-gray-600">
                                          <span>{candidate.score.toFixed(1)}% chance</span>
                                          <span>{candidate.sectorBonus}x sector</span>
                                          <span>{candidate.totalLeads} leads</span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </DialogContent>
                            </Dialog>
                          </div>
                          <div className="space-y-1">
                            {lastAssignment.assignmentDetails.allCandidates.slice(0, 3).map((candidate: any, index: number) => {
                              const isSelected = candidate.name === lastAssignment.assignedTo.name;
                              return (
                                <div key={index} className={`flex items-center justify-between p-2 rounded text-xs ${
                                  isSelected ? 'bg-green-50 border border-green-200' : 'bg-gray-50'
                                }`}>
                                  <div className="flex items-center gap-2">
                                    <span className={`font-medium ${isSelected ? 'text-green-700' : 'text-gray-700'}`}>
                                      {index + 1}. {candidate.name}
                                    </span>
                                    {isSelected && (
                                      <Badge variant="default" className="text-[10px] px-1.5 py-0 font-medium bg-green-600 text-white">SEL</Badge>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-3 text-gray-600">
                                    <span>{candidate.score.toFixed(1)}% chance</span>
                                    <span>{candidate.sectorBonus}x sector</span>
                                    <span>{candidate.totalLeads} leads</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {showSalespersonSelector && (
                    <div className="pt-3 border-t space-y-3">
                      <div className="space-y-2">
                        <Label htmlFor="salesperson-select">Select New Salesperson</Label>
                        <Select value={selectedSalesperson} onValueChange={setSelectedSalesperson}>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose salesperson..." />
                          </SelectTrigger>
                          <SelectContent>
                            {(salespeople as any[] || [])
                              .filter((person: any) => person.team === lastAssignment.assignedTo.team)
                              .map((person: any) => (
                                <SelectItem key={person.id} value={person.id.toString()}>
                                  {person.name} ({person.role})
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={handleChangeSalesperson}
                          disabled={!selectedSalesperson || changeSalespersonMutation.isPending}
                        >
                          {changeSalespersonMutation.isPending ? "Changing..." : "Change Salesperson"}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowSalespersonSelector(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}

                  {!isConfirmed && !showSalespersonSelector && (
                    <div className="pt-3 border-t">
                      <Button
                        className="w-full"
                        onClick={handleConfirmAssignment}
                        disabled={confirmAssignmentMutation.isPending}
                      >
                        <Check className="w-4 h-4 mr-2" />
                        {confirmAssignmentMutation.isPending ? "Confirming..." : "Confirm Assignment"}
                      </Button>
                    </div>
                  )}

                  {isConfirmed && (
                    <div className="pt-3 border-t">
                      <Badge variant="default" className="bg-green-500">
                        <Check className="w-4 h-4 mr-1" />
                        Assignment Confirmed
                      </Badge>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Current Team Load */}
      <Card>
        <CardHeader>
          <CardTitle>Current Team Load</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {["palmela", "vila-do-conde"].map((team) => (
              <div key={team}>
                <h4 className="text-md font-medium text-gray-700 mb-3 capitalize">
                  {team.replace("-", " ")} Team
                </h4>
                <div className="space-y-3">
                  {(distribution as any[] || [])
                    .filter((person: any) => person.team === team)
                    .map((person: any) => (
                      <div key={person.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-sm font-medium">
                              {person.name.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium">{person.name}</p>
                            <p className="text-xs text-gray-500">
                              {Object.entries(person.sectors).length} sectors
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-20 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-500 h-2 rounded-full" 
                              style={{ width: `${Math.min(person.leadCount * 8, 100)}%` }}
                            />
                          </div>
                          <span className="text-sm text-gray-600 min-w-[3rem]">
                            {person.leadCount} leads
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
