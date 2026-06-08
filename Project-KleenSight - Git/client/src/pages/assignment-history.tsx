import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import type { AssignmentHistory } from "@shared/schema";

export default function AssignmentHistory() {
  const { data: history, isLoading } = useQuery<AssignmentHistory[]>({
    queryKey: ["/api/assignment-history"],
  });

  const { data: salespeople } = useQuery({
    queryKey: ["/api/salespeople"],
  });

  const getSalespersonName = (id: number) => {
    const salesperson = salespeople?.find((s: any) => s.id === id);
    return salesperson?.name || "Unknown";
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Loading assignment history...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Assignment History</h3>
        <p className="text-sm text-gray-600">
          Complete history of all lead assignments and their reasoning
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Assignments</CardTitle>
        </CardHeader>
        <CardContent>
          {history?.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No assignment history found</p>
              <p className="text-sm text-gray-400">Assignments will appear here once leads are assigned</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Lead Name</TableHead>
                  <TableHead>Salesperson</TableHead>
                  <TableHead>Sector</TableHead>
                  <TableHead>Region</TableHead>
                  <TableHead>Bucket</TableHead>
                  <TableHead>Pool</TableHead>
                  <TableHead>Weight</TableHead>
                  <TableHead>Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history?.map((assignment) => (
                  <TableRow key={assignment.id}>
                    <TableCell>
                      {format(new Date(assignment.createdAt!), "MMM d, yyyy HH:mm")}
                    </TableCell>
                    <TableCell className="font-medium">
                      {assignment.leadName || "N/A"}
                    </TableCell>
                    <TableCell className="font-medium">
                      {getSalespersonName(assignment.salespersonId!)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {assignment.sector}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={assignment.region === "palmela" ? "default" : "secondary"}>
                        {assignment.region === "palmela" ? "Palmela" : "Vila do Conde"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-medium">
                        {assignment.bucketUsed || "N/A"}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-medium">
                        {assignment.poolUsed || "N/A"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {assignment.assignmentWeight}%
                      </Badge>
                    </TableCell>
                    <TableCell className="min-w-[300px]">
                      <p className="text-sm text-gray-600 whitespace-normal">
                        {assignment.assignmentReason || "No reason provided"}
                      </p>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
