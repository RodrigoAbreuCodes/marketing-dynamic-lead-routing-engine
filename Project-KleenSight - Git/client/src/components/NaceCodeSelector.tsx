import { useState, useEffect } from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface NaceCode {
  code: string;
  description: string;
}

interface NaceCodeSelectorProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
}

export function NaceCodeSelector({ value, onValueChange, placeholder = "Select NACE code..." }: NaceCodeSelectorProps) {
  const [open, setOpen] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [searchValue, setSearchValue] = useState("");
  const { toast } = useToast();

  const { data: naceCodes = [] } = useQuery<NaceCode[]>({
    queryKey: ["/api/nace-codes"],
  });

  const addNaceCodeMutation = useMutation({
    mutationFn: async (data: { code: string; description: string }) => {
      const response = await apiRequest("POST", "/api/nace-codes", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/nace-codes"] });
      toast({
        title: "Success",
        description: "New NACE code added successfully!",
      });
      setShowAddDialog(false);
      setNewCode("");
      setNewDescription("");
      // Auto-select the newly added code
      onValueChange(newCode);
      setOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add NACE code",
        variant: "destructive",
      });
    },
  });

  const handleAddNewCode = () => {
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

  const filteredCodes = naceCodes.filter((code) =>
    code.code.toLowerCase().includes(searchValue.toLowerCase()) ||
    code.description.toLowerCase().includes(searchValue.toLowerCase())
  );

  const selectedCode = naceCodes.find((code) => code.code === value);

  // Check if search value looks like a NACE code that doesn't exist
  const isNewCodeCandidate = searchValue.length > 0 && 
    !naceCodes.some(code => code.code.toLowerCase() === searchValue.toLowerCase()) &&
    /^[0-9]{2}\.[0-9]{2}$/.test(searchValue); // NACE code format: XY.ZK

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            {selectedCode ? (
              <span className="truncate">
                {selectedCode.code} - {selectedCode.description}
              </span>
            ) : (
              placeholder
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0">
          <Command>
            <CommandInput 
              placeholder="Search NACE codes or enter new code..." 
              value={searchValue}
              onValueChange={setSearchValue}
            />
            <CommandList>
              <CommandEmpty>
                <div className="py-2 text-center text-sm">
                  No NACE codes found.
                  {isNewCodeCandidate && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2 w-full"
                      onClick={() => {
                        setNewCode(searchValue);
                        setShowAddDialog(true);
                      }}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add "{searchValue}" as new NACE code
                    </Button>
                  )}
                </div>
              </CommandEmpty>
              <CommandGroup>
                {filteredCodes.map((code) => (
                  <CommandItem
                    key={code.code}
                    value={code.code}
                    onSelect={(currentValue) => {
                      onValueChange(currentValue === value ? "" : currentValue);
                      setOpen(false);
                      setSearchValue("");
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === code.code ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col">
                      <span className="font-medium">{code.code}</span>
                      <span className="text-xs text-muted-foreground">
                        {code.description}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
              {searchValue.length > 0 && !isNewCodeCandidate && (
                <CommandGroup>
                  <CommandItem
                    onSelect={() => {
                      setNewCode(searchValue);
                      setShowAddDialog(true);
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add "{searchValue}" as new NACE code
                  </CommandItem>
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New NACE Code</DialogTitle>
            <DialogDescription>
              Add a new NACE code that will be available for future lead assignments.
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
              onClick={handleAddNewCode}
              disabled={addNaceCodeMutation.isPending}
            >
              {addNaceCodeMutation.isPending ? "Adding..." : "Add NACE Code"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}