import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Check } from "lucide-react";
import { Card, FieldGroup, Input, Button } from "../../components/ui";
import { useRegisterNgo } from "../../hooks/api/useAuthApi";
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

export default function RegisterNgo() {
  const [ngoName, setNgoName] = useState("");
  const [ngoEmail, setNgoEmail] = useState("");
  const [ngoPhone, setNgoPhone] = useState("");
  const [ngoAreas, setNgoAreas] = useState("");
  const [ngoCats, setNgoCats] = useState([]);
  const [ngoMax, setNgoMax] = useState(5);
  const [ngoSla, setNgoSla] = useState(60);
  const [admName, setAdmName] = useState("");
  const [admEmail, setAdmEmail] = useState("");
  const [admPass, setAdmPass] = useState("");
  const [admPhone, setAdmPhone] = useState("");

  const register = useRegisterNgo();
  const toast = useToast();
  const navigate = useNavigate();

  const toggleCat = (v) => setNgoCats((p) => (p.includes(v) ? p.filter((c) => c !== v) : [...p, v]));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (ngoCats.length === 0) {
      toast.warning("Select a category", "Choose at least one supported category.");
      return;
    }
    try {
      const res = await register.mutateAsync({
        ngo: {
          name: ngoName,
          email: ngoEmail,
          phone: ngoPhone,
          supportedCategories: ngoCats,
          serviceAreas: ngoAreas.split(",").map((a) => a.trim()).filter(Boolean),
          capacityConfig: { maxConcurrentCases: ngoMax, autoDispatchEnabled: true },
          responseSlaMinutes: ngoSla,
        },
        admin: { name: admName, email: admEmail, password: admPass, phone: admPhone },
      });
      if (res.success) {
        toast.success("NGO registered!", "You can now log in.");
        navigate("/login");
      }
    } catch (err) {
      toast.error("Registration failed", err.message);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center px-6 py-16">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-extrabold mb-2">
          Register Your <span className="gradient-text">Organization</span>
        </h1>
        <p className="text-text-secondary text-sm">Set up your relief routing capabilities.</p>
      </div>

      <Card className="w-full max-w-xl">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="text-[0.68rem] font-bold uppercase tracking-wide text-accent">Organization Details</div>

          <FieldGroup label="NGO Name">
            <Input required value={ngoName} onChange={(e) => setNgoName(e.target.value)} placeholder="e.g. Red Cross Chapter" />
          </FieldGroup>
          <div className="grid sm:grid-cols-2 gap-4">
            <FieldGroup label="NGO Email">
              <Input type="email" required value={ngoEmail} onChange={(e) => setNgoEmail(e.target.value)} placeholder="support@ngo.org" />
            </FieldGroup>
            <FieldGroup label="NGO Phone">
              <Input type="tel" required value={ngoPhone} onChange={(e) => setNgoPhone(e.target.value)} placeholder="+91XXXXXXXXXX" />
            </FieldGroup>
          </div>
          <FieldGroup label="Service Areas (comma-separated)">
            <Input required value={ngoAreas} onChange={(e) => setNgoAreas(e.target.value)} placeholder="e.g. Sector 4, Sector 7" />
          </FieldGroup>
          <FieldGroup label="Supported Categories">
            <div className="grid sm:grid-cols-2 gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c.v}
                  type="button"
                  onClick={() => toggleCat(c.v)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold border justify-start transition-colors ${
                    ngoCats.includes(c.v)
                      ? "bg-gradient-to-br from-primary to-orange-500 border-transparent text-white"
                      : "bg-white/5 border-border text-text-secondary hover:border-border-hover"
                  }`}
                >
                  <span className="h-4 w-4 rounded border border-white/40 flex items-center justify-center shrink-0">
                    {ngoCats.includes(c.v) && <Check size={11} />}
                  </span>
                  {c.l}
                </button>
              ))}
            </div>
          </FieldGroup>
          <div className="grid sm:grid-cols-2 gap-4">
            <FieldGroup label="Max Concurrent Cases">
              <Input type="number" min={1} max={500} value={ngoMax} onChange={(e) => setNgoMax(+e.target.value)} />
            </FieldGroup>
            <FieldGroup label="Response SLA (min)">
              <Input type="number" min={5} max={1440} value={ngoSla} onChange={(e) => setNgoSla(+e.target.value)} />
            </FieldGroup>
          </div>

          <div className="text-[0.68rem] font-bold uppercase tracking-wide text-accent mt-2">Admin Credentials</div>
          <FieldGroup label="Admin Name">
            <Input required value={admName} onChange={(e) => setAdmName(e.target.value)} placeholder="Full name" />
          </FieldGroup>
          <FieldGroup label="Admin Email">
            <Input type="email" required value={admEmail} onChange={(e) => setAdmEmail(e.target.value)} placeholder="admin@ngo.org" />
          </FieldGroup>
          <div className="grid sm:grid-cols-2 gap-4">
            <FieldGroup label="Password">
              <Input type="password" required value={admPass} onChange={(e) => setAdmPass(e.target.value)} placeholder="Min 6 chars" />
            </FieldGroup>
            <FieldGroup label="Phone">
              <Input type="tel" required value={admPhone} onChange={(e) => setAdmPhone(e.target.value)} placeholder="+91XXXXXXXXXX" />
            </FieldGroup>
          </div>

          <Button type="submit" full loading={register.isPending}>
            Create NGO &amp; Admin Account
          </Button>
          <p className="text-center text-sm text-text-secondary">
            Already registered?{" "}
            <Link to="/login" className="text-accent font-semibold hover:underline">
              Back to Login
            </Link>
          </p>
        </form>
      </Card>
    </div>
  );
}
