import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Trash2, Edit, Plus, ExternalLink } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import AddSalespersonModal from "@/components/add-salesperson-modal";
import type { Salesperson } from "@shared/schema";

export default function Salespeople() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSalesperson, setEditingSalesperson] = useState<Salesperson | null>(null);

  const { data: salespeople, isLoading } = useQuery<Salesperson[]>({
    queryKey: ["/api/salespeople"],
  });

  const deleteSalespersonMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/salespeople/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Salesperson deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/salespeople"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete salesperson",
        variant: "destructive",
      });
    },
  });

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this salesperson?")) {
      deleteSalespersonMutation.mutate(id);
    }
  };

  const handleEdit = (salesperson: Salesperson) => {
    setEditingSalesperson(salesperson);
    setShowAddModal(true);
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setEditingSalesperson(null);
  };

  // Group salespeople by team and sort alphabetically
  const groupedSalespeople = salespeople?.reduce((acc, salesperson) => {
    const team = salesperson.team;
    if (!acc[team]) {
      acc[team] = [];
    }
    acc[team].push(salesperson);
    return acc;
  }, {} as Record<string, Salesperson[]>) || {};

  // Sort each team's members alphabetically by name
  Object.keys(groupedSalespeople).forEach(team => {
    groupedSalespeople[team].sort((a, b) => a.name.localeCompare(b.name));
  });

  const renderTeamTable = (teamName: string, teamMembers: Salesperson[]) => (
    <Card key={teamName}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Badge 
            variant={teamName === "palmela" ? "default" : "secondary"}
            className={teamName === "vila-do-conde" ? "bg-red-900 text-white border-red-700 hover:bg-red-800" : ""}
          >
            {teamName === "palmela" ? "Palmela" : "Vila do Conde"}
          </Badge>
          <span className="text-sm font-normal text-gray-500">
            ({teamMembers.length} {teamMembers.length === 1 ? 'member' : 'members'})
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Best Sector</TableHead>
                <TableHead>2nd Best</TableHead>
                <TableHead>3rd Best</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teamMembers.map((salesperson) => (
                <TableRow key={salesperson.id}>
                  <TableCell className="font-medium">
                    <Button
                      variant="link"
                      className="p-0 h-auto font-medium text-blue-600 hover:text-blue-800"
                      onClick={() => navigate(`/salespeople/${salesperson.id}`)}
                    >
                      {salesperson.name}
                      <ExternalLink className="w-3 h-3 ml-1" />
                    </Button>
                  </TableCell>
                  <TableCell>{salesperson.role}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {salesperson.bestSector}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {salesperson.secondBestSector}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {salesperson.thirdBestSector}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(salesperson)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(salesperson.id)}
                        disabled={deleteSalespersonMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Sales Team</h3>
          <p className="text-sm text-gray-600">
            Manage your sales team members and their sector expertise
          </p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Salesperson
        </Button>
      </div>

      <div className="space-y-6">
        {isLoading ? (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-gray-500">Loading salespeople...</p>
            </CardContent>
          </Card>
        ) : salespeople?.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-gray-500">No salespeople found</p>
              <p className="text-sm text-gray-400">Add your first team member to get started</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {Object.entries(groupedSalespeople).map(([teamName, teamMembers]) =>
              renderTeamTable(teamName, teamMembers)
            )}
          </>
        )}
      </div>

      <AddSalespersonModal
        isOpen={showAddModal}
        onClose={handleCloseModal}
        editingSalesperson={editingSalesperson}
      />
    </div>
  );
}
