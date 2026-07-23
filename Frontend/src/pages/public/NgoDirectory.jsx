import React, { useState } from "react";
import { Award, Users, Search, CheckCircle } from "lucide-react";
import { Card, EmptyState, Spinner, Input, Select } from "../../components/ui";
import { usePublicNgos } from "../../hooks/api/usePublic";

const CATEGORIES = [
  { v: "ALL", l: "All Categories" },
  { v: "MEDICAL_SUPPORT", l: "Medical Support" },
  { v: "FOOD_RELIEF", l: "Food & Water Relief" },
  { v: "SHELTER_SUPPORT", l: "Shelter Support" },
  { v: "DISASTER_RELIEF", l: "Disaster Relief" },
  { v: "WOMEN_CHILD_SAFETY", l: "Women & Child Safety" },
  { v: "CIVIC_GRIEVANCE", l: "Civic Grievance" },
  { v: "GENERAL_SUPPORT", l: "General Support" },
];

export default function NgoDirectory() {
  const { data: ngos, isLoading } = usePublicNgos();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("ALL");

  const list = ngos || [];
  const filtered = list.filter((ngo) => {
    const matchesSearch =
      ngo.name?.toLowerCase().includes(search.toLowerCase()) ||
      ngo.serviceAreas?.some((a) => a.toLowerCase().includes(search.toLowerCase()));
    const matchesCategory = category === "ALL" || ngo.supportedCategories?.includes(category);
    return matchesSearch && matchesCategory;
  });
  const ranked = [...list].sort((a, b) => (b.impactScore || 0) - (a.impactScore || 0));

  if (isLoading) return <div className="flex-1 py-20"><Spinner size="lg" /></div>;

  return (
    <div className="flex-1 px-6 py-12 max-w-6xl mx-auto w-full grid lg:grid-cols-12 gap-8">
      <div className="lg:col-span-5 flex flex-col gap-5">
        <div>
          <h2 className="text-2xl font-extrabold flex items-center gap-2">
            <Award size={22} className="text-accent" /> NGO Impact Board
          </h2>
          <p className="text-text-dim text-xs mt-1">
            Top responders ranked by verified completed cases, citizen feedback, and speed.
          </p>
        </div>
        {ranked.length === 0 ? (
          <EmptyState icon={Users} title="No verified NGOs yet" message="Check back once organizations join the network." />
        ) : (
          ranked.map((ngo, idx) => (
            <div key={ngo._id} className="glass p-5 relative border-l-4 border-l-accent/40">
              <div className="absolute right-4 top-4 text-[10px] text-text-dim font-extrabold">RANK #{idx + 1}</div>
              <div className="pr-16">
                <h4 className="font-extrabold flex items-center gap-1.5">
                  {ngo.name} <CheckCircle size={14} className="text-accent" />
                </h4>
                <p className="text-[10px] text-text-dim mt-0.5">
                  Joined {new Date(ngo.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="mt-3">
                <span className="font-display text-2xl font-black text-accent">{ngo.impactScore || 0}</span>
                <span className="text-[9px] text-text-dim uppercase tracking-widest font-bold ml-2">Impact Index</span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-[11px] text-text-secondary border-t border-border pt-3 mt-3">
                <div>Resolved: <span className="font-bold text-text">{ngo.resolvedCasesCount || 0}</span></div>
                <div>SLA: <span className="font-bold text-text">{ngo.responseSlaMinutes}m</span></div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="lg:col-span-7 flex flex-col gap-5">
        <div>
          <h2 className="text-2xl font-extrabold flex items-center gap-2">
            <Users size={22} className="text-primary" /> Verified NGO Directory
          </h2>
          <p className="text-text-dim text-xs mt-1">Explore capabilities and areas served by response organizations.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Input icon={Search} placeholder="Search NGOs by name or service area…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <Select value={category} onChange={(e) => setCategory(e.target.value)} className="sm:max-w-[220px]">
            {CATEGORIES.map((c) => (
              <option key={c.v} value={c.v}>{c.l}</option>
            ))}
          </Select>
        </div>
        {filtered.length === 0 ? (
          <EmptyState icon={Users} title="No matches" message="Try a different search term or category." />
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {filtered.map((ngo) => (
              <div key={ngo._id} className="glass p-5 border-l-4 border-l-primary/40">
                <h4 className="font-extrabold">{ngo.name}</h4>
                <span className="text-[10px] text-text-dim block mt-0.5">
                  {ngo.email} · {ngo.phone || "No phone"}
                </span>
                <div className="flex flex-col gap-2 text-xs text-text-secondary mt-3 pt-3 border-t border-border">
                  <div>
                    <span className="text-text-dim font-bold uppercase text-[9px] block mb-1">Sectors</span>
                    <div className="flex flex-wrap gap-1">
                      {ngo.supportedCategories?.map((c, i) => (
                        <span key={i} className="bg-primary/10 text-primary-200 text-[9px] px-1.5 py-0.5 rounded border border-primary/10">
                          {c.replace(/_/g, " ")}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="text-text-dim font-bold uppercase text-[9px] block mb-1">Service Areas</span>
                    <span className="text-text-secondary text-[11px]">{ngo.serviceAreas?.join(", ") || "General dispatch area"}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
