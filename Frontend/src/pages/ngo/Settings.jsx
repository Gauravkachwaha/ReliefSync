import React, { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { Card, Button, FieldGroup, Input, Spinner, ErrorState } from "../../components/ui";
import { useNgoProfile, useUpdateNgoProfile } from "../../hooks/api/useNgo";
import { useToast } from "../../context/ToastContext";

const CATEGORIES = [
  { v: "MEDICAL_SUPPORT", l: "Medical Support" },
  { v: "FOOD_RELIEF", l: "Food & Water Relief" },
  { v: "SHELTER_SUPPORT", l: "Shelter Support" },
  { v: "DISASTER_RELIEF", l: "Disaster Relief" },
  { v: "WOMEN_CHILD_SAFETY", l: "Women & Child Safety" },
  { v: "CIVIC_GRIEVANCE", l: "Civic Grievance" },
  { v: "GENERAL_SUPPORT", l: "General Support" },
];

export default function Settings() {
  const { data: ngo, isLoading, isError, refetch } = useNgoProfile();
  const update = useUpdateNgoProfile();
  const toast = useToast();

  const [categories, setCategories] = useState([]);
  const [areas, setAreas] = useState("");
  const [maxCases, setMaxCases] = useState(10);
  const [autoDispatch, setAutoDispatch] = useState(false);
  const [sla, setSla] = useState(60);

  useEffect(() => {
    if (ngo) {
      setCategories(ngo.supportedCategories || []);
      setAreas((ngo.serviceAreas || []).join(", "));
      setMaxCases(ngo.capacityConfig?.maxConcurrentCases ?? 10);
      setAutoDispatch(!!ngo.capacityConfig?.autoDispatchEnabled);
      setSla(ngo.responseSlaMinutes ?? 60);
    }
  }, [ngo]);

  const toggleCat = (v) => setCategories((p) => (p.includes(v) ? p.filter((c) => c !== v) : [...p, v]));

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      await update.mutateAsync({
        supportedCategories: categories,
        serviceAreas: areas.split(",").map((a) => a.trim()).filter(Boolean),
        capacityConfig: { maxConcurrentCases: Number(maxCases), autoDispatchEnabled: autoDispatch },
        responseSlaMinutes: Number(sla),
      });
      toast.success("Settings saved", "Your NGO routing configuration was updated.");
    } catch (err) {
      toast.error("Save failed", err.message);
    }
  };

  if (isLoading) return <Spinner size="lg" />;
  if (isError) return <ErrorState message="Couldn't load NGO profile." onRetry={refetch} />;

  return (
    <div className="flex flex-col gap-6 animate-fade-up max-w-2xl">
      <div>
        <h1 className="text-2xl font-extrabold">NGO Settings</h1>
        <p className="text-text-secondary text-sm mt-1">
          Control what kinds of cases get routed to {ngo?.name || "your organization"} and how many you can handle.
        </p>
      </div>

      <Card>
        <form onSubmit={handleSave} className="flex flex-col gap-5">
          <FieldGroup label="Supported Categories">
            <div className="grid sm:grid-cols-2 gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c.v}
                  type="button"
                  onClick={() => toggleCat(c.v)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold border justify-start transition-colors ${
                    categories.includes(c.v)
                      ? "bg-gradient-to-br from-primary to-orange-500 border-transparent text-white"
                      : "bg-white/5 border-border text-text-secondary hover:border-border-hover"
                  }`}
                >
                  <span className="h-4 w-4 rounded border border-white/40 flex items-center justify-center shrink-0">
                    {categories.includes(c.v) && <Check size={11} />}
                  </span>
                  {c.l}
                </button>
              ))}
            </div>
          </FieldGroup>

          <FieldGroup label="Service Areas (comma-separated)">
            <Input value={areas} onChange={(e) => setAreas(e.target.value)} placeholder="e.g. Sector 4, Sector 7" />
          </FieldGroup>

          <div className="grid sm:grid-cols-2 gap-4">
            <FieldGroup label="Max Concurrent Cases">
              <Input type="number" min={1} max={500} value={maxCases} onChange={(e) => setMaxCases(e.target.value)} />
            </FieldGroup>
            <FieldGroup label="Response SLA (minutes)">
              <Input type="number" min={5} max={1440} value={sla} onChange={(e) => setSla(e.target.value)} />
            </FieldGroup>
          </div>

          <label className="flex items-center gap-3 rounded-xl border border-border bg-surface-input px-4 py-3 cursor-pointer">
            <input type="checkbox" checked={autoDispatch} onChange={(e) => setAutoDispatch(e.target.checked)} className="h-4 w-4 accent-primary" />
            <div>
              <div className="text-sm font-semibold">Auto-dispatch enabled</div>
              <div className="text-[11px] text-text-dim">Automatically receive AI-routed case offers without manual review.</div>
            </div>
          </label>

          <Button type="submit" loading={update.isPending} className="self-start">
            Save Changes
          </Button>
        </form>
      </Card>
    </div>
  );
}
