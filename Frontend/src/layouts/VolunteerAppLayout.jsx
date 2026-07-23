import React from "react";
import { Outlet } from "react-router-dom";
import { Home, Inbox, ClipboardList } from "lucide-react";
import { Sidebar, AppTopbar } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { useMyVolunteerOffers } from "../hooks/api/useVolunteerOffers";

export default function VolunteerAppLayout() {
  const { user, logout } = useAuth();
  const { data: offers } = useMyVolunteerOffers("PENDING");

  const items = [
    { to: "/volunteer", label: "Home", icon: Home, end: true },
    { to: "/volunteer/offers", label: "Case Offers", icon: Inbox, count: offers?.length || 0 },
    { to: "/volunteer/tasks", label: "Active Tasks", icon: ClipboardList },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <AppTopbar user={user} onLogout={logout} roleLabel="Volunteer" />
      <div className="flex flex-1">
        <Sidebar eyebrow="Volunteer Portal" title={user?.name?.split(" ")[0] || "Responder"} items={items} />
        <main className="flex-1 min-w-0 px-6 py-8 md:px-10 md:py-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
