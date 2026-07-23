import React from "react";
import { Outlet } from "react-router-dom";
import {
  LayoutDashboard,
  Inbox,
  Compass,
  Users,
  ClipboardCheck,
  FileText,
  Settings,
} from "lucide-react";
import { Sidebar, AppTopbar } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { useCaseOffers } from "../hooks/api/useCaseOffers";

export default function NgoAppLayout() {
  const { user, logout } = useAuth();
  const { data: offers } = useCaseOffers("PENDING");

  const items = [
    { to: "/ngo", label: "Overview", icon: LayoutDashboard, end: true },
    { to: "/ngo/case-offers", label: "Case Offers", icon: Inbox, count: offers?.length || 0 },
    { to: "/ngo/needs", label: "Needs & Matching", icon: Compass },
    { to: "/ngo/volunteers", label: "Volunteers", icon: Users },
    { to: "/ngo/assignments", label: "Task Allocations", icon: ClipboardCheck },
    { to: "/ngo/reports", label: "Situation Reports", icon: FileText },
    { to: "/ngo/settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <AppTopbar user={user} onLogout={logout} roleLabel="NGO Admin" />
      <div className="flex flex-1">
        <Sidebar eyebrow="NGO Control Panel" title={user?.name?.split(" ")[0] || "Admin"} items={items} />
        <main className="flex-1 min-w-0 px-6 py-8 md:px-10 md:py-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
