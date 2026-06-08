import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Edit2, Trash2, Plus } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface NaceCode {
  code: string;
  description: string;
}

export default function NaceList() {
  const [editingCode, setEditingCode] = useState<NaceCode | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const { toast } = useToast();

  const { data: naceCodes = [], isLoading } = useQuery<NaceCode[]>({
    queryKey: ["/api/nace-codes"],
  });

  const { data: customCodes = [] } = useQuery<NaceCode[]>({
    queryKey: ["/api/nace-codes/custom"],
  });

  const addNaceCodeMutation = useMutation({
    mutationFn: async (data: { code: string; description: string }) => {
      const response = await apiRequest("POST", "/api/nace-codes", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/nace-codes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/nace-codes/custom"] });
      toast({
        title: "Success",
        description: "NACE code added successfully!",
      });
      setShowAddDialog(false);
      setNewCode("");
      setNewDescription("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add NACE code",
        variant: "destructive",
      });
    },
  });

  const updateNaceCodeMutation = useMutation({
    mutationFn: async (data: { code: string; description: string }) => {
      // For custom codes, delete and recreate. For predefined codes, create override
      if (isCustomCode(data.code)) {
        await apiRequest("DELETE", `/api/nace-codes/${data.code}`);
      }
      const response = await apiRequest("POST", "/api/nace-codes", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/nace-codes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/nace-codes/custom"] });
      toast({
        title: "Success",
        description: "NACE code updated successfully!",
      });
      setEditingCode(null);
      setEditDescription("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update NACE code",
        variant: "destructive",
      });
    },
  });

  const deleteNaceCodeMutation = useMutation({
    mutationFn: async (code: string) => {
      const response = await apiRequest("DELETE", `/api/nace-codes/${code}`);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/nace-codes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/nace-codes/custom"] });
      toast({
        title: "Success",
        description: "NACE code deleted successfully!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete NACE code",
        variant: "destructive",
      });
    },
  });

  const handleAddCode = () => {
    const trimmedCode = newCode.trim();
    const trimmedDescription = newDescription.trim();
    
    if (!trimmedCode || !trimmedDescription) {
      toast({
        title: "Error",
        description: "Both code and description are required",
        variant: "destructive",
      });
      return;
    }
    
    // Validate NACE code format (XY.ZK)
    if (!/^[0-9]{2}\.[0-9]{2}$/.test(trimmedCode)) {
      toast({
        title: "Error",
        description: "NACE code must follow format XY.ZK (e.g., 46.64)",
        variant: "destructive",
      });
      return;
    }
    
    addNaceCodeMutation.mutate({
      code: trimmedCode,
      description: trimmedDescription,
    });
  };

  const handleEditCode = (code: NaceCode) => {
    setEditingCode(code);
    setEditDescription(code.description);
  };

  const handleUpdateCode = () => {
    if (!editingCode || !editDescription.trim()) {
      toast({
        title: "Error",
        description: "Description is required",
        variant: "destructive",
      });
      return;
    }

    updateNaceCodeMutation.mutate({
      code: editingCode.code,
      description: editDescription.trim(),
    });
  };

  const handleDeleteCode = (code: string) => {
    const isCustom = isCustomCode(code);
    const message = isCustom 
      ? `Are you sure you want to delete custom NACE code ${code}?`
      : `Are you sure you want to delete predefined NACE code ${code}? This will hide it from the system.`;
    
    if (confirm(message)) {
      deleteNaceCodeMutation.mutate(code);
    }
  };

  const isCustomCode = (code: string) => {
    return customCodes.some(c => c.code === code);
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Loading NACE codes...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">NACE Code List</h3>
          <p className="text-sm text-gray-600">
            Manage all NACE codes in the system (predefined and custom)
          </p>
        </div>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add NACE Code
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All NACE Codes ({naceCodes.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {naceCodes.map((code) => (
                <TableRow key={code.code}>
                  <TableCell className="font-mono font-medium">
                    {code.code}
                  </TableCell>
                  <TableCell>{code.description}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditCode(code)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteCode(code.code)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add NACE Code Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New NACE Code</DialogTitle>
            <DialogDescription>
              Add a new custom NACE code to the system.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="code">NACE Code</Label>
              <Input
                id="code"
                value={newCode}
                onChange={(e) => setNewCode(e.target.value)}
                placeholder="e.g., 46.64 (format: XY.ZK)"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="e.g., Computer programming activities"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAddCode}
              disabled={addNaceCodeMutation.isPending}
            >
              {addNaceCodeMutation.isPending ? "Adding..." : "Add NACE Code"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit NACE Code Dialog */}
      <Dialog open={!!editingCode} onOpenChange={() => setEditingCode(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit NACE Code</DialogTitle>
            <DialogDescription>
              Update the description for NACE code {editingCode?.code}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-code">NACE Code</Label>
              <Input
                id="edit-code"
                value={editingCode?.code || ""}
                disabled
                className="bg-gray-50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Input
                id="edit-description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Enter description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingCode(null)}>
              Cancel
            </Button>
            <Button 
              onClick={handleUpdateCode}
              disabled={updateNaceCodeMutation.isPending}
            >
              {updateNaceCodeMutation.isPending ? "Updating..." : "Update"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}