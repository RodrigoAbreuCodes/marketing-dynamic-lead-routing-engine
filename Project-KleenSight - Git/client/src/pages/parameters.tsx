import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useEffect } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { AssignmentParameters, SectorBucket, TotalLeadPool } from "@shared/schema";

export default function Parameters() {
  const { toast } = useToast();
  const [sectorBuckets, setSectorBuckets] = useState<SectorBucket[]>([]);
  const [totalLeadPools, setTotalLeadPools] = useState<TotalLeadPool[]>([]);


  const { data: parameters, isLoading } = useQuery<AssignmentParameters>({
    queryKey: ["/api/assignment-parameters"],
  });

  useEffect(() => {
    if (parameters) {
      setSectorBuckets(parameters.sectorBuckets as SectorBucket[]);
      setTotalLeadPools(parameters.totalLeadPools as TotalLeadPool[]);
    }
  }, [parameters]);

  const updateParametersMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/assignment-parameters", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Parameters updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/assignment-parameters"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update parameters",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    updateParametersMutation.mutate({
      sectorBuckets,
      totalLeadPools,
    });
  };

  const updateBucket = (index: number, field: keyof SectorBucket, value: any) => {
    const updated = [...sectorBuckets];
    updated[index] = { ...updated[index], [field]: value };
    setSectorBuckets(updated);
  };

  const updatePool = (index: number, field: keyof TotalLeadPool, value: any) => {
    const updated = [...totalLeadPools];
    updated[index] = { ...updated[index], [field]: value };
    setTotalLeadPools(updated);
  };



  const getBucketColor = (index: number) => {
    const colors = ["bucket-orange", "bucket-red", "bucket-teal", "bucket-purple", "bucket-gray"];
    return colors[index % colors.length];
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Loading parameters...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Assignment Parameters</h3>
          <p className="text-sm text-gray-600">
            Configure the buckets and pools for automatic lead assignment. Assignment weights are automatically calculated by multiplying bucket and pool percentages.
          </p>
        </div>
        <Button onClick={handleSave} disabled={updateParametersMutation.isPending}>
          {updateParametersMutation.isPending ? "Saving..." : "Save Parameters"}
        </Button>
      </div>

      <Tabs defaultValue="buckets" className="space-y-4">
        <TabsList>
          <TabsTrigger value="buckets">Sector Buckets</TabsTrigger>
          <TabsTrigger value="pools">Total Lead Pools</TabsTrigger>
        </TabsList>

        <TabsContent value="buckets">
          <Card>
            <CardHeader>
              <CardTitle>Sector Lead Buckets</CardTitle>
              <p className="text-sm text-gray-600">
                Configure how leads are grouped based on sector expertise
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {sectorBuckets.map((bucket, index) => (
                  <div key={bucket.id} className={`p-4 rounded-lg ${getBucketColor(index)}`}>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <Label htmlFor={`bucket-name-${index}`}>Name</Label>
                        <Input
                          id={`bucket-name-${index}`}
                          value={bucket.name}
                          onChange={(e) => updateBucket(index, "name", e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`bucket-min-${index}`}>Min Leads</Label>
                        <Input
                          id={`bucket-min-${index}`}
                          type="number"
                          value={bucket.minLeads}
                          onChange={(e) => updateBucket(index, "minLeads", parseInt(e.target.value))}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`bucket-max-${index}`}>Max Leads</Label>
                        <Input
                          id={`bucket-max-${index}`}
                          type="number"
                          value={bucket.maxLeads || ""}
                          onChange={(e) => updateBucket(index, "maxLeads", e.target.value ? parseInt(e.target.value) : null)}
                          placeholder="No limit"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`bucket-weight-${index}`}>Weight (%)</Label>
                        <Input
                          id={`bucket-weight-${index}`}
                          type="number"
                          value={bucket.weight}
                          onChange={(e) => updateBucket(index, "weight", parseInt(e.target.value))}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pools">
          <Card>
            <CardHeader>
              <CardTitle>Total Lead Pools</CardTitle>
              <p className="text-sm text-gray-600">
                Configure how leads are grouped based on total lead count
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {totalLeadPools.map((pool, index) => (
                  <div key={pool.id} className={`p-4 rounded-lg ${getBucketColor(index)}`}>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <Label htmlFor={`pool-name-${index}`}>Name</Label>
                        <Input
                          id={`pool-name-${index}`}
                          value={pool.name}
                          onChange={(e) => updatePool(index, "name", e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`pool-min-${index}`}>Min Leads</Label>
                        <Input
                          id={`pool-min-${index}`}
                          type="number"
                          value={pool.minLeads}
                          onChange={(e) => updatePool(index, "minLeads", parseInt(e.target.value))}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`pool-max-${index}`}>Max Leads</Label>
                        <Input
                          id={`pool-max-${index}`}
                          type="number"
                          value={pool.maxLeads || ""}
                          onChange={(e) => updatePool(index, "maxLeads", e.target.value ? parseInt(e.target.value) : null)}
                          placeholder="No limit"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`pool-weight-${index}`}>Weight</Label>
                        <Input
                          id={`pool-weight-${index}`}
                          type="number"
                          value={pool.weight || 0}
                          onChange={(e) => updatePool(index, "weight", parseInt(e.target.value) || 0)}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>


      </Tabs>
    </div>
  );
}
