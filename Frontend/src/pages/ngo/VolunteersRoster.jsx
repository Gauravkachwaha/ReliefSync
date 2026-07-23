import React, { useState } from "react";
import { Search, UserPlus, Users } from "lucide-react";
import { Card, Badge, Button, Spinner, EmptyState, ErrorState, Modal, FieldGroup, Input } from "../../components/ui";
import { useVolunteers, useCreateVolunteer, useCreateVolunteerAccount } from "../../hooks/api/useVolunteers";
import { useToast } from "../../context/ToastContext";

const emptyForm = {
  name: "", email: "", phone: "", location: "", preferredAreas: "", skills: "",
  maxActiveAssignments: 3, reliabilityScore: 50, password: "",
};

export default function VolunteersRoster() {
  const { data: volunteers, isLoading, isError, refetch } = useVolunteers();
  const createVolunteer = useCreateVolunteer();
  const createAccount = useCreateVolunteerAccount();
  const toast = useToast();

  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const list = volunteers || [];
  const filtered = list.filter((v) =>
    [v.name, v.email, ...(v.skills || [])].join(" ").toLowerCase().includes(search.toLowerCase())
  );

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await createVolunteer.mutateAsync({
        name: form.name,
        email: form.email,
        phone: form.phone,
        location: form.location,
        preferredAreas: form.preferredAreas.split(",").map((s) => s.trim()).filter(Boolean),
        skills: form.skills.split(",").map((s) => s.trim()).filter(Boolean),
        maxActiveAssignments: Number(form.maxActiveAssignments),
        reliabilityScore: Number(form.reliabilityScore),
      });
      if (res.success && form.password) {
        await createAccount.mutateAsync({ id: res.data._id, password: form.password });
      }
      toast.success("Volunteer registered", "They've been added to your roster.");
      setModalOpen(false);
      setForm(emptyForm);
    } catch (err) {
      toast.error("Registration failed", err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-up">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">Volunteers Roster</h1>
          <p className="text-text-secondary text-sm mt-1">Search, review, and register field responders.</p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <UserPlus size={15} /> Register Volunteer
        </Button>
      </div>

      <Input icon={Search} placeholder="Search by name, email, or skill…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-md" />

      {isLoading ? (
        <Spinner size="lg" />
      ) : isError ? (
        <ErrorState message="Couldn't load volunteers." onRetry={refetch} />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Users} title="No volunteers found" message="No volunteers match your search criteria." />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((v) => (
            <Card key={v._id}>
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-bold text-sm">{v.name}</h4>
                <Badge status={v.availability} />
              </div>
              <p className="text-[11px] text-text-dim mb-3">{v.email} · {v.phone}</p>
              <div className="flex justify-between text-xs mb-3">
                <span className="text-text-secondary">Reliability</span>
                <span className="font-bold">{v.reliabilityScore}/100</span>
              </div>
              <div className="flex justify-between text-xs mb-3">
                <span className="text-text-secondary">Workload</span>
                <span className="font-bold">{v.currentActiveAssignments}/{v.maxActiveAssignments}</span>
              </div>
              <p className="text-[11px] text-text-dim mb-2">{v.location}</p>
              <div className="flex flex-wrap gap-1.5">
                {v.skills?.map((s, i) => (
                  <span key={i} className="bg-white/5 px-1.5 py-0.5 rounded border border-border text-[10px] text-text-dim">{s}</span>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Register Volunteer">
        <form onSubmit={handleCreate} className="flex flex-col gap-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <FieldGroup label="Name"><Input required value={form.name} onChange={set("name")} /></FieldGroup>
            <FieldGroup label="Email"><Input type="email" required value={form.email} onChange={set("email")} /></FieldGroup>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <FieldGroup label="Phone"><Input required value={form.phone} onChange={set("phone")} /></FieldGroup>
            <FieldGroup label="Location"><Input required value={form.location} onChange={set("location")} /></FieldGroup>
          </div>
          <FieldGroup label="Preferred Dispatch Sectors (comma-separated)">
            <Input value={form.preferredAreas} onChange={set("preferredAreas")} placeholder="e.g. Sector 4, Sector 7" />
          </FieldGroup>
          <FieldGroup label="Skills (comma-separated)" hint="e.g. First Aid, Search & Rescue, Food Distribution">
            <Input value={form.skills} onChange={set("skills")} placeholder="First Aid, Search & Rescue" />
          </FieldGroup>
          <div className="grid sm:grid-cols-2 gap-4">
            <FieldGroup label="Max Workload"><Input type="number" min={1} max={10} value={form.maxActiveAssignments} onChange={set("maxActiveAssignments")} /></FieldGroup>
            <FieldGroup label="Starting Reliability"><Input type="number" min={1} max={100} value={form.reliabilityScore} onChange={set("reliabilityScore")} /></FieldGroup>
          </div>
          <FieldGroup label="Login Password (optional)" hint="Leave blank to skip creating a login account now.">
            <Input type="password" value={form.password} onChange={set("password")} />
          </FieldGroup>
          <Button type="submit" full loading={submitting}>Register Volunteer</Button>
        </form>
      </Modal>
    </div>
  );
}
