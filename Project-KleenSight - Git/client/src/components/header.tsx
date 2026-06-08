import { Search, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocation } from "wouter";

const pageInfo = {
  "/": { title: "Dashboard", description: "Lead assignment overview and management" },
  "/salespeople": { title: "Salespeople", description: "Manage your sales team" },
  "/parameters": { title: "Parameters", description: "Configure assignment parameters" },
  "/lead-assignment": { title: "Lead Assignment", description: "Assign new leads to salespeople" },
  "/assignment-history": { title: "Assignment History", description: "View assignment history and analytics" },
  "/nace-list": { title: "NACE List", description: "Manage NACE codes in the system" },
};

export default function Header() {
  const [location] = useLocation();
  const currentPage = pageInfo[location as keyof typeof pageInfo] || pageInfo["/"];

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">{currentPage.title}</h2>
          <p className="text-sm text-gray-600">{currentPage.description}</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Input
              type="text"
              placeholder="Search..."
              className="pl-10 pr-4 py-2 w-64"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          </div>
          {location === "/lead-assignment" && (
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Lead
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
