import React, { useState } from "react";
import { api } from "../services/api";
import { Card, Spinner } from "../components/Shared";
import { Lock, Mail, Check } from "lucide-react";

export default function LoginPortal({ onLoginSuccess }) {
  const [mode, setMode] = useState("login");

  // Login
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  // Register
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
  const [regBusy, setRegBusy] = useState(false);
  const [regErr, setRegErr] = useState("");

  const categories = [
    { v: "MEDICAL_SUPPORT", l: "Medical Support" },
    { v: "FOOD_RELIEF", l: "Food & Water Relief" },
    { v: "SHELTER_SUPPORT", l: "Shelter Support" },
    { v: "DISASTER_RELIEF", l: "Disaster Relief" },
    { v: "WOMEN_CHILD_SAFETY", l: "Women & Child Safety" },
    { v: "CIVIC_GRIEVANCE", l: "Civic Grievance" },
    { v: "GENERAL_SUPPORT", l: "General Support" },
  ];

  const toggleCat = (v) => setNgoCats(p => p.includes(v) ? p.filter(c => c !== v) : [...p, v]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setBusy(true); setErr("");
    try {
      const res = await api.auth.login(email, password);
      if (res.success) onLoginSuccess();
    } catch (e) { setErr(e.message || "Invalid credentials."); }
    finally { setBusy(false); }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (ngoCats.length === 0) { setRegErr("Select at least one category."); return; }
    setRegBusy(true); setRegErr("");
    try {
      const res = await api.auth.registerNgo(
        {
          name: ngoName, email: ngoEmail, phone: ngoPhone,
          supportedCategories: ngoCats,
          serviceAreas: ngoAreas.split(",").map(a => a.trim()).filter(Boolean),
          capacityConfig: { maxConcurrentCases: ngoMax, autoDispatchEnabled: true },
          responseSlaMinutes: ngoSla,
        },
        { name: admName, email: admEmail, password: admPass, phone: admPhone }
      );
      if (res.success) {
        alert("NGO registered! You can now log in.");
        setMode("login"); setEmail(admEmail);
      }
    } catch (e) { setRegErr(e.message || "Registration failed."); }
    finally { setRegBusy(false); }
  };

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: "48px 24px" }} className="animate-in">
      <div className="text-center" style={{ marginBottom: 32 }}>
        <h2 className="page-title">
          Portal <span className="gradient-text">Authentication</span>
        </h2>
        <p className="text-secondary text-sm" style={{ marginTop: 8 }}>
          {mode === "login"
            ? "Access NGO admin dashboard or volunteer portal."
            : "Register your relief organization."}
        </p>
      </div>

      {mode === "login" ? (
        <Card title="Sign In" subtitle="Enter your registered credentials.">
          <form onSubmit={handleLogin} className="stack stack-md" style={{ marginTop: 12 }}>
            {err && <div className="info-box info-box-danger text-sm">{err}</div>}

            <div className="form-group">
              <label className="form-label">Email</label>
              <div className="relative">
                <Mail size={15} style={{ position: "absolute", left: 12, top: 12, color: "var(--text-dim)" }} />
                <input className="form-input" style={{ paddingLeft: 36 }} type="email" required
                  placeholder="name@domain.com" value={email} onChange={e => setEmail(e.target.value)} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div className="relative">
                <Lock size={15} style={{ position: "absolute", left: 12, top: 12, color: "var(--text-dim)" }} />
                <input className="form-input" style={{ paddingLeft: 36 }} type="password" required
                  placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} />
              </div>
            </div>

            <button type="submit" disabled={busy} className="btn btn-primary btn-full">
              {busy ? <Spinner size="sm" /> : "Sign In"}
            </button>

            <p className="text-center text-sm text-secondary" style={{ marginTop: 8 }}>
              Relief organization?{" "}
              <span className="text-accent pointer" onClick={() => { setMode("register"); setErr(""); }}>
                Register NGO
              </span>
            </p>
          </form>
        </Card>
      ) : (
        <Card title="Register NGO" subtitle="Set up your relief routing capabilities.">
          <form onSubmit={handleRegister} className="stack stack-md" style={{ marginTop: 12 }}>
            {regErr && <div className="info-box info-box-danger text-sm">{regErr}</div>}

            {/* NGO Details */}
            <div className="section-label">Organization Details</div>

            <div className="form-group">
              <label className="form-label">NGO Name</label>
              <input className="form-input" required value={ngoName} onChange={e => setNgoName(e.target.value)} placeholder="e.g. Red Cross Chapter" />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div className="form-group">
                <label className="form-label">NGO Email</label>
                <input className="form-input" type="email" required value={ngoEmail} onChange={e => setNgoEmail(e.target.value)} placeholder="support@ngo.org" />
              </div>
              <div className="form-group">
                <label className="form-label">NGO Phone</label>
                <input className="form-input" type="tel" required value={ngoPhone} onChange={e => setNgoPhone(e.target.value)} placeholder="+91XXXXXXXXXX" />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Service Areas (comma-separated)</label>
              <input className="form-input" required value={ngoAreas} onChange={e => setNgoAreas(e.target.value)} placeholder="e.g. Sector 4, Sector 7" />
            </div>

            <div className="form-group">
              <label className="form-label">Supported Categories</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                {categories.map(c => (
                  <button key={c.v} type="button" onClick={() => toggleCat(c.v)}
                    className={`btn btn-sm ${ngoCats.includes(c.v) ? "btn-primary" : "btn-secondary"}`}
                    style={{ justifyContent: "flex-start" }}>
                    <div style={{ width: 16, height: 16, border: "1px solid var(--border-hover)", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {ngoCats.includes(c.v) && <Check size={11} />}
                    </div>
                    {c.l}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Max Concurrent Cases</label>
                <input className="form-input" type="number" min={1} max={500} value={ngoMax} onChange={e => setNgoMax(+e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Response SLA (min)</label>
                <input className="form-input" type="number" min={5} max={1440} value={ngoSla} onChange={e => setNgoSla(+e.target.value)} />
              </div>
            </div>

            {/* Admin Details */}
            <div className="section-label" style={{ marginTop: 8 }}>Admin Credentials</div>

            <div className="form-group">
              <label className="form-label">Admin Name</label>
              <input className="form-input" required value={admName} onChange={e => setAdmName(e.target.value)} placeholder="Full name" />
            </div>
            <div className="form-group">
              <label className="form-label">Admin Email</label>
              <input className="form-input" type="email" required value={admEmail} onChange={e => setAdmEmail(e.target.value)} placeholder="admin@ngo.org" />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Password</label>
                <input className="form-input" type="password" required value={admPass} onChange={e => setAdmPass(e.target.value)} placeholder="Min 6 chars" />
              </div>
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input className="form-input" type="tel" required value={admPhone} onChange={e => setAdmPhone(e.target.value)} placeholder="+91XXXXXXXXXX" />
              </div>
            </div>

            <button type="submit" disabled={regBusy} className="btn btn-primary btn-full">
              {regBusy ? <Spinner size="sm" /> : "Create NGO & Admin Account"}
            </button>

            <p className="text-center text-sm text-secondary" style={{ marginTop: 8 }}>
              Already registered?{" "}
              <span className="text-accent pointer" onClick={() => { setMode("login"); setRegErr(""); }}>Back to Login</span>
            </p>
          </form>
        </Card>
      )}
    </div>
  );
}
