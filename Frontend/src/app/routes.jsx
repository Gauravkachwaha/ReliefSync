import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import RequireRole from "./RequireRole";

import PublicLayout from "../layouts/PublicLayout";
import Landing from "../pages/public/Landing";
import ReportComplaint from "../pages/public/ReportComplaint";
import TrackComplaint from "../pages/public/TrackComplaint";
import NgoDirectory from "../pages/public/NgoDirectory";
import Login from "../pages/public/Login";
import RegisterNgo from "../pages/public/RegisterNgo";

import NgoAppLayout from "../layouts/NgoAppLayout";
import Overview from "../pages/ngo/Overview";
import CaseOffers from "../pages/ngo/CaseOffers";
import NeedsMatching from "../pages/ngo/NeedsMatching";
import VolunteersRoster from "../pages/ngo/VolunteersRoster";
import Assignments from "../pages/ngo/Assignments";
import Reports from "../pages/ngo/Reports";
import NgoSettings from "../pages/ngo/Settings";

import VolunteerAppLayout from "../layouts/VolunteerAppLayout";
import VolunteerHome from "../pages/volunteer/Home";
import VolunteerOffers from "../pages/volunteer/Offers";
import VolunteerTasks from "../pages/volunteer/Tasks";

import SuperAdminAppLayout from "../layouts/SuperAdminAppLayout";
import Analytics from "../pages/admin/Analytics";
import NgoVerification from "../pages/admin/NgoVerification";
import SpamQueue from "../pages/admin/SpamQueue";
import Escalations from "../pages/admin/Escalations";
import AuditLogs from "../pages/admin/AuditLogs";

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Landing />} />
        <Route path="/report" element={<ReportComplaint />} />
        <Route path="/track" element={<TrackComplaint />} />
        <Route path="/ngos" element={<NgoDirectory />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register-ngo" element={<RegisterNgo />} />
      </Route>

      <Route element={<RequireRole role="admin" />}>
        <Route element={<NgoAppLayout />}>
          <Route path="/ngo" element={<Overview />} />
          <Route path="/ngo/case-offers" element={<CaseOffers />} />
          <Route path="/ngo/needs" element={<NeedsMatching />} />
          <Route path="/ngo/volunteers" element={<VolunteersRoster />} />
          <Route path="/ngo/assignments" element={<Assignments />} />
          <Route path="/ngo/reports" element={<Reports />} />
          <Route path="/ngo/settings" element={<NgoSettings />} />
        </Route>
      </Route>

      <Route element={<RequireRole role="volunteer" />}>
        <Route element={<VolunteerAppLayout />}>
          <Route path="/volunteer" element={<VolunteerHome />} />
          <Route path="/volunteer/offers" element={<VolunteerOffers />} />
          <Route path="/volunteer/tasks" element={<VolunteerTasks />} />
        </Route>
      </Route>

      <Route element={<RequireRole role="super_admin" />}>
        <Route element={<SuperAdminAppLayout />}>
          <Route path="/admin" element={<Analytics />} />
          <Route path="/admin/ngos" element={<NgoVerification />} />
          <Route path="/admin/spam" element={<SpamQueue />} />
          <Route path="/admin/escalations" element={<Escalations />} />
          <Route path="/admin/audit" element={<AuditLogs />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
