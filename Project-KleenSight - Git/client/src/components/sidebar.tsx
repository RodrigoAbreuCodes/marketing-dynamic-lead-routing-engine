import { Link, useLocation } from "wouter";
import { 
  BarChart3, 
  Users, 
  Settings, 
  Plus, 
  History,
  List
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/", icon: BarChart3 },
  { name: "Salespeople", href: "/salespeople", icon: Users },
  { name: "Parameters", href: "/parameters", icon: Settings },
  { name: "Lead Assignment", href: "/lead-assignment", icon: Plus },
  { name: "Assignment History", href: "/assignment-history", icon: History },
  { name: "NACE List", href: "/nace-list", icon: List },
];

export default function Sidebar() {
  const [location] = useLocation();

  return (
    <div className="w-64 bg-white shadow-lg border-r border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-xl font-bold text-gray-800">Lead Assignment</h1>
        <p className="text-sm text-gray-600">Management System</p>
      </div>
      
      <nav className="mt-6">
        <div className="px-4 space-y-2">
          {navigation.map((item) => {
            const isActive = location === item.href;
            const Icon = item.icon;
            
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  isActive
                    ? "text-primary bg-blue-50"
                    : "text-gray-700 hover:text-primary hover:bg-gray-50"
                }`}
              >
                <Icon className="w-5 h-5 mr-3" />
                {item.name}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
