import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Salesperson } from "@shared/schema";

interface AddSalespersonModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingSalesperson?: Salesperson | null;
}

import { ROLES } from "@shared/schema";

const TEAMS = [
  { value: "palmela", label: "Palmela" },
  { value: "vila-do-conde", label: "Vila do Conde" },
];

const ROLE_OPTIONS = ROLES.map(role => ({
  value: role,
  label: role
}));

export default function AddSalespersonModal({ isOpen, onClose, editingSalesperson }: AddSalespersonModalProps) {
  const { toast } = useToast();
  
  // Fetch all NACE codes (including custom ones)
  const { data: naceCodes = [] } = useQuery({
    queryKey: ["/api/nace-codes"],
    staleTime: 0,
    gcTime: 0,
  }) as { data: {code: string, description: string}[] };
  
  // Generate sector options from dynamic NACE codes
  const getSectorOptions = () => {
    return naceCodes
      .filter((code: any) => code.code !== "other")
      .map((code: any) => ({
        value: code.code,
        label: `${code.code} - ${code.description}`,
      }));
  };
  const [formData, setFormData] = useState({
    name: "",
    role: "",
    team: "",
    inboundBestSector: "",
    inboundSecondBestSector: "",
    inboundThirdBestSector: "",
    outboundBestSector: "",
    outboundSecondBestSector: "",
    outboundThirdBestSector: "",
  });
  const [customSectors, setCustomSectors] = useState({
    inboundBest: "",
    inboundSecond: "",
    inboundThird: "",
    outboundBest: "",
    outboundSecond: "",
    outboundThird: "",
  });

  useEffect(() => {
    if (editingSalesperson) {
      setFormData({
        name: editingSalesperson.name,
        role: editingSalesperson.role,
        team: editingSalesperson.team,
        inboundBestSector: editingSalesperson.inboundBestSector,
        inboundSecondBestSector: editingSalesperson.inboundSecondBestSector,
        inboundThirdBestSector: editingSalesperson.inboundThirdBestSector,
        outboundBestSector: editingSalesperson.outboundBestSector,
        outboundSecondBestSector: editingSalesperson.outboundSecondBestSector,
        outboundThirdBestSector: editingSalesperson.outboundThirdBestSector,
      });
      // Check if any sector is a custom NACE code (not in predefined list)
      const predefinedSectors = naceCodes.map((c: any) => c.code).filter((s: any) => s !== "other");
      setCustomSectors({
        inboundBest: !predefinedSectors.includes(editingSalesperson.inboundBestSector) ? editingSalesperson.inboundBestSector : "",
        inboundSecond: !predefinedSectors.includes(editingSalesperson.inboundSecondBestSector) ? editingSalesperson.inboundSecondBestSector : "",
        inboundThird: !predefinedSectors.includes(editingSalesperson.inboundThirdBestSector) ? editingSalesperson.inboundThirdBestSector : "",
        outboundBest: !predefinedSectors.includes(editingSalesperson.outboundBestSector) ? editingSalesperson.outboundBestSector : "",
        outboundSecond: !predefinedSectors.includes(editingSalesperson.outboundSecondBestSector) ? editingSalesperson.outboundSecondBestSector : "",
        outboundThird: !predefinedSectors.includes(editingSalesperson.outboundThirdBestSector) ? editingSalesperson.outboundThirdBestSector : "",
      });
    } else {
      setFormData({
        name: "",
        role: "",
        team: "",
        inboundBestSector: "",
        inboundSecondBestSector: "",
        inboundThirdBestSector: "",
        outboundBestSector: "",
        outboundSecondBestSector: "",
        outboundThirdBestSector: "",
      });
      setCustomSectors({
        inboundBest: "",
        inboundSecond: "",
        inboundThird: "",
        outboundBest: "",
        outboundSecond: "",
        outboundThird: "",
      });
    }
  }, [editingSalesperson, isOpen]);

  const createSalespersonMutation = useMutation({
    mutationFn: async (data: any) => {
      const url = editingSalesperson ? `/api/salespeople/${editingSalesperson.id}` : "/api/salespeople";
      const method = editingSalesperson ? "PUT" : "POST";
      const response = await apiRequest(method, url, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: editingSalesperson ? "Salesperson updated successfully" : "Salesperson added successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/salespeople"] });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save salesperson",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Get final sector values for inbound (use custom if "other" is selected)
    const finalInboundBest = formData.inboundBestSector === "other" ? customSectors.inboundBest : formData.inboundBestSector;
    const finalInboundSecond = formData.inboundSecondBestSector === "other" ? customSectors.inboundSecond : formData.inboundSecondBestSector;
    const finalInboundThird = formData.inboundThirdBestSector === "other" ? customSectors.inboundThird : formData.inboundThirdBestSector;
    
    // Get final sector values for outbound (use custom if "other" is selected)
    const finalOutboundBest = formData.outboundBestSector === "other" ? customSectors.outboundBest : formData.outboundBestSector;
    const finalOutboundSecond = formData.outboundSecondBestSector === "other" ? customSectors.outboundSecond : formData.outboundSecondBestSector;
    const finalOutboundThird = formData.outboundThirdBestSector === "other" ? customSectors.outboundThird : formData.outboundThirdBestSector;
    
    // Validation
    if (!formData.name || !formData.role || !formData.team || 
        !finalInboundBest || !finalInboundSecond || !finalInboundThird ||
        !finalOutboundBest || !finalOutboundSecond || !finalOutboundThird) {
      toast({
        title: "Error",
        description: "Please fill in all fields for both inbound and outbound expertise",
        variant: "destructive",
      });
      return;
    }

    // Check for duplicate sectors within inbound
    const inboundSectors = [finalInboundBest, finalInboundSecond, finalInboundThird];
    if (new Set(inboundSectors).size !== inboundSectors.length) {
      toast({
        title: "Error",
        description: "Please select different sectors for each inbound preference",
        variant: "destructive",
      });
      return;
    }

    // Check for duplicate sectors within outbound
    const outboundSectors = [finalOutboundBest, finalOutboundSecond, finalOutboundThird];
    if (new Set(outboundSectors).size !== outboundSectors.length) {
      toast({
        title: "Error",
        description: "Please select different sectors for each outbound preference",
        variant: "destructive",
      });
      return;
    }

    const submissionData = {
      ...formData,
      inboundBestSector: finalInboundBest,
      inboundSecondBestSector: finalInboundSecond,
      inboundThirdBestSector: finalInboundThird,
      outboundBestSector: finalOutboundBest,
      outboundSecondBestSector: finalOutboundSecond,
      outboundThirdBestSector: finalOutboundThird,
    };

    createSalespersonMutation.mutate(submissionData);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingSalesperson ? "Edit Salesperson" : "Add New Salesperson"}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              placeholder="Enter full name"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select value={formData.role} onValueChange={(value) => handleInputChange("role", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select role..." />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((role) => (
                  <SelectItem key={role.value} value={role.value}>
                    {role.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="team">Team</Label>
            <Select value={formData.team} onValueChange={(value) => handleInputChange("team", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select team..." />
              </SelectTrigger>
              <SelectContent>
                {TEAMS.map((team) => (
                  <SelectItem key={team.value} value={team.value}>
                    {team.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Inbound Sector Expertise */}
          <div className="space-y-3 p-4 border rounded-lg bg-blue-50">
            <h3 className="font-medium text-blue-900">Inbound Lead Expertise</h3>
            
            <div className="space-y-2">
              <Label htmlFor="inboundBestSector">Best Sector</Label>
              <Select value={formData.inboundBestSector} onValueChange={(value) => handleInputChange("inboundBestSector", value)}>
                <SelectTrigger className="text-left">
                  <SelectValue placeholder="Select sector..." />
                </SelectTrigger>
                <SelectContent>
                  {getSectorOptions().map((sector: any) => (
                    <SelectItem key={sector.value} value={sector.value}>
                      {sector.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {formData.inboundBestSector === "other" && (
              <div className="space-y-2">
                <Label htmlFor="customInboundBest">Custom Best Sector NACE Code</Label>
                <Input
                  id="customInboundBest"
                  value={customSectors.inboundBest}
                  onChange={(e) => setCustomSectors(prev => ({ ...prev, inboundBest: e.target.value }))}
                  placeholder="Enter NACE code (e.g., 62010)"
                />
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="inboundSecondBestSector">Second Best Sector</Label>
              <Select value={formData.inboundSecondBestSector} onValueChange={(value) => handleInputChange("inboundSecondBestSector", value)}>
                <SelectTrigger className="text-left">
                  <SelectValue placeholder="Select sector..." />
                </SelectTrigger>
                <SelectContent>
                  {getSectorOptions().map((sector: any) => (
                    <SelectItem key={sector.value} value={sector.value}>
                      {sector.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {formData.inboundSecondBestSector === "other" && (
              <div className="space-y-2">
                <Label htmlFor="customInboundSecond">Custom Second Best Sector NACE Code</Label>
                <Input
                  id="customInboundSecond"
                  value={customSectors.inboundSecond}
                  onChange={(e) => setCustomSectors(prev => ({ ...prev, inboundSecond: e.target.value }))}
                  placeholder="Enter NACE code (e.g., 62010)"
                />
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="inboundThirdBestSector">Third Best Sector</Label>
              <Select value={formData.inboundThirdBestSector} onValueChange={(value) => handleInputChange("inboundThirdBestSector", value)}>
                <SelectTrigger className="text-left">
                  <SelectValue placeholder="Select sector..." />
                </SelectTrigger>
                <SelectContent>
                  {getSectorOptions().map((sector: any) => (
                    <SelectItem key={sector.value} value={sector.value}>
                      {sector.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {formData.inboundThirdBestSector === "other" && (
              <div className="space-y-2">
                <Label htmlFor="customInboundThird">Custom Third Best Sector NACE Code</Label>
                <Input
                  id="customInboundThird"
                  value={customSectors.inboundThird}
                  onChange={(e) => setCustomSectors(prev => ({ ...prev, inboundThird: e.target.value }))}
                  placeholder="Enter NACE code (e.g., 62010)"
                />
              </div>
            )}
          </div>

          {/* Outbound Sector Expertise */}
          <div className="space-y-3 p-4 border rounded-lg bg-green-50">
            <h3 className="font-medium text-green-900">Outbound Lead Expertise</h3>
            
            <div className="space-y-2">
              <Label htmlFor="outboundBestSector">Best Sector</Label>
              <Select value={formData.outboundBestSector} onValueChange={(value) => handleInputChange("outboundBestSector", value)}>
                <SelectTrigger className="text-left">
                  <SelectValue placeholder="Select sector..." />
                </SelectTrigger>
                <SelectContent>
                  {getSectorOptions().map((sector: any) => (
                    <SelectItem key={sector.value} value={sector.value}>
                      {sector.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {formData.outboundBestSector === "other" && (
              <div className="space-y-2">
                <Label htmlFor="customOutboundBest">Custom Best Sector NACE Code</Label>
                <Input
                  id="customOutboundBest"
                  value={customSectors.outboundBest}
                  onChange={(e) => setCustomSectors(prev => ({ ...prev, outboundBest: e.target.value }))}
                  placeholder="Enter NACE code (e.g., 62010)"
                />
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="outboundSecondBestSector">Second Best Sector</Label>
              <Select value={formData.outboundSecondBestSector} onValueChange={(value) => handleInputChange("outboundSecondBestSector", value)}>
                <SelectTrigger className="text-left">
                  <SelectValue placeholder="Select sector..." />
                </SelectTrigger>
                <SelectContent>
                  {getSectorOptions().map((sector: any) => (
                    <SelectItem key={sector.value} value={sector.value}>
                      {sector.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {formData.outboundSecondBestSector === "other" && (
              <div className="space-y-2">
                <Label htmlFor="customOutboundSecond">Custom Second Best Sector NACE Code</Label>
                <Input
                  id="customOutboundSecond"
                  value={customSectors.outboundSecond}
                  onChange={(e) => setCustomSectors(prev => ({ ...prev, outboundSecond: e.target.value }))}
                  placeholder="Enter NACE code (e.g., 62010)"
                />
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="outboundThirdBestSector">Third Best Sector</Label>
              <Select value={formData.outboundThirdBestSector} onValueChange={(value) => handleInputChange("outboundThirdBestSector", value)}>
                <SelectTrigger className="text-left">
                  <SelectValue placeholder="Select sector..." />
                </SelectTrigger>
                <SelectContent>
                  {getSectorOptions().map((sector: any) => (
                    <SelectItem key={sector.value} value={sector.value}>
                      {sector.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {formData.outboundThirdBestSector === "other" && (
              <div className="space-y-2">
                <Label htmlFor="customOutboundThird">Custom Third Best Sector NACE Code</Label>
                <Input
                  id="customOutboundThird"
                  value={customSectors.outboundThird}
                  onChange={(e) => setCustomSectors(prev => ({ ...prev, outboundThird: e.target.value }))}
                  placeholder="Enter NACE code (e.g., 62010)"
                />
              </div>
            )}
          </div>
          
          <div className="flex space-x-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={createSalespersonMutation.isPending}>
              {createSalespersonMutation.isPending ? "Saving..." : (editingSalesperson ? "Update" : "Add")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
