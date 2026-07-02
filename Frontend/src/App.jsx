import React, { useState, useEffect } from "react";
import { api } from "./services/api";
import { Navbar } from "./components/Shared";
import PublicPortal from "./views/PublicPortal";
import LoginPortal from "./views/LoginPortal";
import NgoDashboard from "./views/NgoDashboard";
import VolunteerPortal from "./views/VolunteerPortal";
import SuperAdminDashboard from "./views/SuperAdminDashboard";

export default function App() {
  const [user, setUser] = useState(null);
  const [currentView, setCurrentView] = useState("public");

  // Reload current user state from localStorage
  const loadUser = () => {
    const currentUser = api.auth.getCurrentUser();
    setUser(currentUser);
    
    // Redirect logged in users to their dashboards
    if (currentUser) {
      if (currentUser.role === "admin") {
        setCurrentView("ngo");
      } else if (currentUser.role === "volunteer") {
        setCurrentView("volunteer");
      } else if (currentUser.role === "super_admin") {
        setCurrentView("super-admin");
      }
    } else {
      setCurrentView("public");
    }
  };

  useEffect(() => {
    loadUser();
  }, []);

  const handleLogout = () => {
    api.auth.logout();
    setUser(null);
    setCurrentView("public");
  };

  const handleViewChange = (newView) => {
    // Guards for authenticated views
    if (newView === "ngo" && (!user || user.role !== "admin")) {
      setCurrentView("login");
      return;
    }
    if (newView === "volunteer" && (!user || user.role !== "volunteer")) {
      setCurrentView("login");
      return;
    }
    if (newView === "super-admin" && (!user || user.role !== "super_admin")) {
      setCurrentView("login");
      return;
    }
    setCurrentView(newView);
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Floating Global Navbar */}
      <Navbar 
        user={user} 
        onLogout={handleLogout} 
        currentView={currentView} 
        onViewChange={handleViewChange} 
      />

      {/* Main View Port router */}
      <div className="flex-grow">
        {currentView === "public" && <PublicPortal />}
        
        {currentView === "login" && (
          <LoginPortal onLoginSuccess={loadUser} />
        )}
        
        {currentView === "ngo" && user?.role === "admin" && (
          <NgoDashboard />
        )}
        
        {currentView === "volunteer" && user?.role === "volunteer" && (
          <VolunteerPortal />
        )}
        
        {currentView === "super-admin" && user?.role === "super_admin" && (
          <SuperAdminDashboard />
        )}
      </div>

      {/* Premium Footer */}
      <footer className="py-8 mt-12 border-t border-gray-800/40 text-center text-xs text-gray-500">
        <p>&copy; 2026 ReliefSync AI Coordination Network. All rights reserved.</p>
        <p className="mt-1 text-[10px] text-gray-600">Powering decentralized community emergency response with real-time AI classification triage.</p>
      </footer>
    </div>
  );
}
