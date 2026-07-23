import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Mail, Lock } from "lucide-react";
import { Card, FieldGroup, Input, Button } from "../../components/ui";
import { useAuth, ROLE_HOME } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";

const DEMOS = [
  { label: "Demo NGO Admin", email: "ngo@reliefsync.local", password: "ngo12345" },
  { label: "Demo Volunteer", email: "volunteer@reliefsync.local", password: "volunteer12345" },
  { label: "Demo Super Admin", email: "superadmin@reliefsync.local", password: "ChangeThisPassword_123!" },
];

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const user = await login(email, password);
      navigate(ROLE_HOME[user.role] || "/");
    } catch (err) {
      toast.error("Login failed", err.message || "Invalid credentials.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-16">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-semibold mb-2">
          Portal <span className="gradient-text">Authentication</span>
        </h1>
        <p className="text-text-secondary text-sm">Access your NGO, volunteer, or coordinator dashboard.</p>
      </div>

      <Card title="Sign In" subtitle="Enter your registered credentials." className="w-full max-w-md">
        <div className="flex flex-wrap gap-2 justify-center mb-5 p-2 bg-black/[0.03] rounded-xl border border-border">
          {DEMOS.map((d) => (
            <button
              key={d.label}
              type="button"
              onClick={() => {
                setEmail(d.email);
                setPassword(d.password);
              }}
              className="text-[11px] font-semibold px-3 py-1.5 rounded-lg bg-black/5 border border-border text-text-secondary hover:text-text hover:border-border-hover transition-colors"
            >
              {d.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <FieldGroup label="Email">
            <Input icon={Mail} type="email" required placeholder="name@domain.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          </FieldGroup>
          <FieldGroup label="Password">
            <Input icon={Lock} type="password" required placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
          </FieldGroup>
          <Button type="submit" full loading={busy}>
            Sign In
          </Button>
          <p className="text-center text-sm text-text-secondary">
            Relief organization?{" "}
            <Link to="/register-ngo" className="text-accent font-semibold hover:underline">
              Register NGO
            </Link>
          </p>
        </form>
      </Card>
    </div>
  );
}
