import React from "react";
import { Outlet } from "react-router-dom";
import { BarChart3, ShieldCheck, ShieldAlert, Siren, ScrollText } from "lucide-react";
import { Sidebar, AppTopbar } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { useNgoQueue, useSpamQueue, useEscalations } from "../hooks/api/useSuperAdmin";

export default function SuperAdminAppLayout() {
  const { user, logout } = useAuth();
  const { data: pendingNgos } = useNgoQueue("PENDING");
  const { data: spam } = useSpamQueue();
  const { data: escalations } = useEscalations("OPEN");

  const items = [
    { to: "/admin", label: "Analytics", icon: BarChart3, end: true },
    { to: "/admin/ngos", label: "NGO Verification", icon: ShieldCheck, count: pendingNgos?.length || 0 },
    { to: "/admin/spam", label: "Spam Review", icon: ShieldAlert, count: spam?.length || 0 },
    { to: "/admin/escalations", label: "Escalations", icon: Siren, count: escalations?.length || 0 },
    { to: "/admin/audit", label: "Audit Logs", icon: ScrollText },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <AppTopbar user={user} onLogout={logout} roleLabel="Super Admin" />
      <div className="flex flex-1">
        <Sidebar eyebrow="Coordinator Console" title="Super Control" items={items} />
        <main className="flex-1 min-w-0 px-6 py-8 md:px-10 md:py-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
