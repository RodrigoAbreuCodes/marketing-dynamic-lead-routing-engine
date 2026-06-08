import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  TrendingUp, 
  Calendar,
  ExternalLink
} from "lucide-react";
import { useLocation } from "wouter";

interface DashboardStats {
  totalSalespeople: number;
  activeLeads: number;
  weeklyLeads: number;
}

interface LeadDistribution {
  id: number;
  name: string;
  team: string;
  leadCount: number;
  sectors: Record<string, number>;
}

export default function Dashboard() {
  const [, navigate] = useLocation();

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: distribution, isLoading: distributionLoading } = useQuery<LeadDistribution[]>({
    queryKey: ["/api/dashboard/lead-distribution"],
  });

  const { data: history } = useQuery({
    queryKey: ["/api/assignment-history"],
  });



  const recentAssignments = history?.slice(-5).reverse() || [];

  return (
    <div className="space-y-8">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Salespeople</p>
                <p className="text-2xl font-bold text-gray-800">
                  {statsLoading ? "..." : stats?.totalSalespeople || 0}
                </p>
              </div>
              <div className="bg-blue-100 p-3 rounded-full">
                <Users className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Leads</p>
                <p className="text-2xl font-bold text-gray-800">
                  {statsLoading ? "..." : stats?.activeLeads || 0}
                </p>
              </div>
              <div className="bg-green-100 p-3 rounded-full">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">This Week</p>
                <p className="text-2xl font-bold text-gray-800">
                  {statsLoading ? "..." : stats?.weeklyLeads || 0}
                </p>
              </div>
              <div className="bg-amber-100 p-3 rounded-full">
                <Calendar className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Assignments */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Assignments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentAssignments.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No recent assignments</p>
            ) : (
              recentAssignments.map((assignment: any) => (
                <div key={assignment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-medium">
                        {assignment.salespersonName?.charAt(0) || "?"}
                      </span>
                    </div>
                    <div>
                      <Button
                        variant="link"
                        className="p-0 h-auto text-sm font-medium text-blue-600 hover:text-blue-800"
                        onClick={() => navigate(`/salespeople/${assignment.salespersonId}`)}
                      >
                        {assignment.leadName || "Unknown"}
                        <ExternalLink className="w-3 h-3 ml-1" />
                      </Button>
                      <p className="text-xs text-gray-600">
                        {assignment.sector} - {assignment.sectorDescription} • {assignment.region}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">
                      {assignment.createdAt ? new Date(assignment.createdAt).toLocaleString() : "Unknown time"}
                    </p>
                    <Badge variant="secondary" className="text-xs">
                      {assignment.salespersonName}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Lead Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Lead Distribution by Team</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {["palmela", "vila-do-conde"].map((team) => (
              <div key={team} className="p-4 rounded-lg bg-gray-50">
                <div className="flex items-center gap-2 mb-3">
                  <Badge 
                    variant={team === "palmela" ? "default" : "secondary"}
                    className={team === "vila-do-conde" ? "bg-red-900 text-white border-red-700 hover:bg-red-800" : ""}
                  >
                    {team === "palmela" ? "Palmela" : "Vila do Conde"}
                  </Badge>
                  <span className="text-sm font-medium text-gray-700">Team</span>
                </div>
                <div className="space-y-3">
                  {distributionLoading ? (
                    <p className="text-gray-500">Loading...</p>
                  ) : (
                    distribution
                      ?.filter((person) => person.team === team)
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map((person) => (
                        <div key={person.id} className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-6 h-6 bg-blue-500 rounded-full"></div>
                            <Button
                              variant="link"
                              className="p-0 h-auto text-sm text-blue-600 hover:text-blue-800"
                              onClick={() => navigate(`/salespeople/${person.id}`)}
                            >
                              {person.name}
                              <ExternalLink className="w-3 h-3 ml-1" />
                            </Button>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="w-24 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-500 h-2 rounded-full" 
                                style={{ width: `${Math.min(person.leadCount * 5, 100)}%` }}
                              />
                            </div>
                            <span className="text-sm text-gray-600">{person.leadCount} leads</span>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
