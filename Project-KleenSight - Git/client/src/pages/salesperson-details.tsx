import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ArrowLeft, Trash2, Edit3, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Lead, Salesperson, SECTOR_DESCRIPTIONS, SECTORS } from "@shared/schema";
import { format } from "date-fns";
import { useState } from "react";

export default function SalespersonDetails() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  // State for editing sector expertise
  const [isEditingExpertise, setIsEditingExpertise] = useState(false);
  const [editingInboundBest, setEditingInboundBest] = useState("");
  const [editingInboundSecond, setEditingInboundSecond] = useState("");
  const [editingInboundThird, setEditingInboundThird] = useState("");
  const [editingOutboundBest, setEditingOutboundBest] = useState("");
  const [editingOutboundSecond, setEditingOutboundSecond] = useState("");
  const [editingOutboundThird, setEditingOutboundThird] = useState("");

  const { data: salesperson, isLoading: isLoadingSalesperson } = useQuery({
    queryKey: ["/api/salespeople", id],
    queryFn: async () => {
      const response = await fetch(`/api/salespeople/${id}`);
      if (!response.ok) throw new Error("Failed to fetch salesperson");
      return response.json() as Promise<Salesperson>;
    },
    enabled: !!id,
  });

  const { data: leads = [], isLoading: isLoadingLeads } = useQuery({
    queryKey: ["/api/leads/salesperson", id],
    queryFn: async () => {
      const response = await fetch(`/api/leads/salesperson/${id}`);
      if (!response.ok) throw new Error("Failed to fetch leads");
      return response.json() as Promise<Lead[]>;
    },
    enabled: !!id,
  });

  // Fetch all NACE codes (including custom ones)
  const { data: naceCodes = [], isLoading: isLoadingNaceCodes, error: naceError } = useQuery({
    queryKey: ["/api/nace-codes"],
    staleTime: 0, // Don't use cache, always fetch fresh data
    gcTime: 0, // Don't cache the result (TanStack Query v5)
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  }) as { data: {code: string, description: string}[], isLoading: boolean, error: any };


  const updateLeadStatusMutation = useMutation({
    mutationFn: async ({ leadId, status }: { leadId: number; status: string }) => {
      return apiRequest("PUT", `/api/leads/${leadId}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads/salesperson", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/lead-distribution"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Success",
        description: "Lead status updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update lead status",
        variant: "destructive",
      });
    },
  });

  const deleteLeadMutation = useMutation({
    mutationFn: async (leadId: number) => {
      return apiRequest("DELETE", `/api/leads/${leadId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads/salesperson", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/lead-distribution"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({
        title: "Success",
        description: "Lead deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete lead",
        variant: "destructive",
      });
    },
  });

  const updateSectorExpertiseMutation = useMutation({
    mutationFn: async ({ 
      inboundBestSector, 
      inboundSecondBestSector, 
      inboundThirdBestSector,
      outboundBestSector, 
      outboundSecondBestSector, 
      outboundThirdBestSector 
    }: {
      inboundBestSector: string;
      inboundSecondBestSector: string;
      inboundThirdBestSector: string;
      outboundBestSector: string;
      outboundSecondBestSector: string;
      outboundThirdBestSector: string;
    }) => {
      return apiRequest("PUT", `/api/salespeople/${id}`, {
        inboundBestSector,
        inboundSecondBestSector,
        inboundThirdBestSector,
        outboundBestSector,
        outboundSecondBestSector,
        outboundThirdBestSector,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/salespeople", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/salespeople"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/lead-distribution"] });
      setIsEditingExpertise(false);
      toast({
        title: "Success",
        description: "Sector expertise updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update sector expertise",
        variant: "destructive",
      });
    },
  });

  const handleStatusChange = (leadId: number, newStatus: string) => {
    updateLeadStatusMutation.mutate({ leadId, status: newStatus });
  };

  const handleDeleteLead = (leadId: number) => {
    deleteLeadMutation.mutate(leadId);
  };

  const handleStartEditingExpertise = () => {
    if (salesperson) {
      // Force refresh NACE codes when starting to edit
      queryClient.invalidateQueries({ queryKey: ["/api/nace-codes"] });
      
      setEditingInboundBest(salesperson.inboundBestSector);
      setEditingInboundSecond(salesperson.inboundSecondBestSector);
      setEditingInboundThird(salesperson.inboundThirdBestSector);
      setEditingOutboundBest(salesperson.outboundBestSector);
      setEditingOutboundSecond(salesperson.outboundSecondBestSector);
      setEditingOutboundThird(salesperson.outboundThirdBestSector);
      setIsEditingExpertise(true);
    }
  };

  const handleCancelEditingExpertise = () => {
    setIsEditingExpertise(false);
    setEditingInboundBest("");
    setEditingInboundSecond("");
    setEditingInboundThird("");
    setEditingOutboundBest("");
    setEditingOutboundSecond("");
    setEditingOutboundThird("");
  };

  const handleSaveExpertise = () => {
    if (editingInboundBest && editingInboundSecond && editingInboundThird &&
        editingOutboundBest && editingOutboundSecond && editingOutboundThird) {
      updateSectorExpertiseMutation.mutate({
        inboundBestSector: editingInboundBest,
        inboundSecondBestSector: editingInboundSecond,
        inboundThirdBestSector: editingInboundThird,
        outboundBestSector: editingOutboundBest,
        outboundSecondBestSector: editingOutboundSecond,
        outboundThirdBestSector: editingOutboundThird,
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "assigned":
        return "bg-blue-100 text-blue-800";
      case "completed":
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getSectorDescription = (sector: string) => {
    // First check if it's in the dynamic NACE codes list
    const naceCode = naceCodes.find((code: any) => code.code === sector);
    if (naceCode) {
      return naceCode.description;
    }
    // Fallback to static descriptions for backward compatibility
    return SECTOR_DESCRIPTIONS[sector as keyof typeof SECTOR_DESCRIPTIONS] || sector;
  };

  const getSectorOptions = () => {
    // Use dynamic NACE codes instead of static SECTORS
    return naceCodes
      .filter((code: any) => code.code !== "other")
      .map((code: any) => ({
        value: code.code,
        label: `${code.code} - ${code.description}`,
      }));
  };

  if (isLoadingSalesperson || isLoadingLeads || isLoadingNaceCodes) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-32 bg-gray-200 rounded mb-6"></div>
          <div className="space-y-4">
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!salesperson) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Salesperson not found</h2>
          <Button onClick={() => navigate("/salespeople")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Salespeople
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <Button 
          variant="ghost" 
          onClick={() => navigate("/salespeople")}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Salespeople
        </Button>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{salesperson.name}</h1>
            <p className="text-gray-600 mt-1">
              {salesperson.role} • {salesperson.team === "palmela" ? "Palmela" : "Vila do Conde"}
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-blue-600">{leads.length}</p>
            <p className="text-gray-600">Active Leads</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Inbound Sector Expertise */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-blue-700">Inbound Expertise</CardTitle>
              {!isEditingExpertise ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleStartEditingExpertise}
                >
                  <Edit3 className="h-4 w-4" />
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleSaveExpertise}
                    disabled={updateSectorExpertiseMutation.isPending}
                  >
                    <Save className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCancelEditingExpertise}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!isEditingExpertise ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Best:</span>
                  <Badge variant="secondary">{salesperson.inboundBestSector}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Second:</span>
                  <Badge variant="outline">{salesperson.inboundSecondBestSector}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Third:</span>
                  <Badge variant="outline">{salesperson.inboundThirdBestSector}</Badge>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Best Sector:</label>
                  <Select value={editingInboundBest} onValueChange={setEditingInboundBest}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select best sector..." />
                    </SelectTrigger>
                    <SelectContent>
                      {getSectorOptions().map((option: any) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Second Best Sector:</label>
                  <Select value={editingInboundSecond} onValueChange={setEditingInboundSecond}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select second best sector..." />
                    </SelectTrigger>
                    <SelectContent>
                      {getSectorOptions().map((option: any) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Third Best Sector:</label>
                  <Select value={editingInboundThird} onValueChange={setEditingInboundThird}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select third best sector..." />
                    </SelectTrigger>
                    <SelectContent>
                      {getSectorOptions().map((option: any) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Outbound Sector Expertise */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-green-700">Outbound Expertise</CardTitle>
              {!isEditingExpertise ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleStartEditingExpertise}
                >
                  <Edit3 className="h-4 w-4" />
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleSaveExpertise}
                    disabled={updateSectorExpertiseMutation.isPending}
                  >
                    <Save className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCancelEditingExpertise}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!isEditingExpertise ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Best:</span>
                  <Badge variant="secondary">{salesperson.outboundBestSector}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Second:</span>
                  <Badge variant="outline">{salesperson.outboundSecondBestSector}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Third:</span>
                  <Badge variant="outline">{salesperson.outboundThirdBestSector}</Badge>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Best Sector:</label>
                  <Select value={editingOutboundBest} onValueChange={setEditingOutboundBest}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select best sector..." />
                    </SelectTrigger>
                    <SelectContent>
                      {getSectorOptions().map((option: any) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Second Best Sector:</label>
                  <Select value={editingOutboundSecond} onValueChange={setEditingOutboundSecond}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select second best sector..." />
                    </SelectTrigger>
                    <SelectContent>
                      {getSectorOptions().map((option: any) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Third Best Sector:</label>
                  <Select value={editingOutboundThird} onValueChange={setEditingOutboundThird}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select third best sector..." />
                    </SelectTrigger>
                    <SelectContent>
                      {getSectorOptions().map((option: any) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Lead Statistics */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Lead Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Active:</span>
                <span className="font-semibold text-blue-600">
                  {leads.filter(l => l.status === "assigned").length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Completed:</span>
                <span className="font-semibold text-green-600">
                  {leads.filter(l => l.status === "completed").length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Cancelled:</span>
                <span className="font-semibold text-red-600">
                  {leads.filter(l => l.status === "cancelled").length}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lead Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Lead Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Inbound:</span>
                <span className="font-semibold text-blue-600">
                  {leads.filter(l => l.type === "inbound").length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Outbound:</span>
                <span className="font-semibold text-green-600">
                  {leads.filter(l => l.type === "outbound").length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Total:</span>
                <span className="font-semibold text-gray-600">
                  {leads.length}
                </span>
              </div>
              {leads.length === 0 && (
                <p className="text-sm text-gray-500">No leads assigned yet</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Assigned Leads</CardTitle>
        </CardHeader>
        <CardContent>
          {leads.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No leads assigned yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {leads.map((lead) => (
                <div key={lead.id} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold">{lead.name}</h3>
                        <Badge className={getStatusColor(lead.status)}>
                          {lead.status}
                        </Badge>
                        <Badge variant="outline">{lead.sector}</Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">Sector:</p>
                          <p className="font-medium">{getSectorDescription(lead.sector)}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Region:</p>
                          <p className="font-medium capitalize">{lead.region}</p>
                        </div>
                        {lead.vat && (
                          <div>
                            <p className="text-gray-600">VAT:</p>
                            <p className="font-medium">{lead.vat}</p>
                          </div>
                        )}
                        <div>
                          <p className="text-gray-600">Created:</p>
                          <p className="font-medium">{lead.createdAt ? format(new Date(lead.createdAt), "PPP") : "N/A"}</p>
                        </div>
                        <div className="md:col-span-2">
                          <p className="text-gray-600">Details:</p>
                          <p className="font-medium">{lead.details || "No details provided"}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 ml-4">
                      <Select
                        value={lead.status}
                        onValueChange={(value) => handleStatusChange(lead.id, value)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="assigned">Active</SelectItem>
                          <SelectItem value="completed">Resolved</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Lead</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this lead? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteLead(lead.id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}