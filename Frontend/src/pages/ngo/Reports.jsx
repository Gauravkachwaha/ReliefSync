import React, { useState } from "react";
import { FileText, Upload, ChevronRight } from "lucide-react";
import { Card, Tabs, Button, FieldGroup, Input, Textarea, Spinner, EmptyState, ErrorState, Modal } from "../../components/ui";
import { useReports, useReport, useSubmitTextReport, useSubmitPdfReport } from "../../hooks/api/useReports";
import { useToast } from "../../context/ToastContext";

const fmt = (d) => (d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "");

export default function Reports() {
  const { data: reports, isLoading, isError, refetch } = useReports();
  const submitText = useSubmitTextReport();
  const submitPdf = useSubmitPdfReport();
  const toast = useToast();

  const [mode, setMode] = useState("text");
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const { data: detail } = useReport(selectedId);

  const handleTextSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !text.trim()) {
      toast.warning("Missing fields", "Title and report text are required.");
      return;
    }
    try {
      await submitText.mutateAsync({ title, content: text });
      toast.success("Report submitted", "AI summary extraction is running.");
      setTitle("");
      setText("");
    } catch (err) {
      toast.error("Submission failed", err.message);
    }
  };

  const handlePdfSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !file) {
      toast.warning("Missing fields", "Title and a PDF file are required.");
      return;
    }
    try {
      await submitPdf.mutateAsync({ title, file });
      toast.success("PDF uploaded", "AI summaries extracted.");
      setTitle("");
      setFile(null);
    } catch (err) {
      toast.error("Upload failed", err.message);
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-up">
      <div>
        <h1 className="text-2xl font-extrabold">Situation Reports</h1>
        <p className="text-text-secondary text-sm mt-1">Submit and review AI-summarized field reports.</p>
      </div>

      <div className="grid lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5">
          <Card title="Submit a Report">
            <Tabs
              value={mode}
              onChange={setMode}
              options={[{ value: "text", label: "Plain Text" }, { value: "pdf", label: "PDF Upload" }]}
            />
            {mode === "text" ? (
              <form onSubmit={handleTextSubmit} className="flex flex-col gap-4 mt-5">
                <FieldGroup label="Title"><Input required value={title} onChange={(e) => setTitle(e.target.value)} /></FieldGroup>
                <FieldGroup label="Report Text"><Textarea rows={6} required value={text} onChange={(e) => setText(e.target.value)} /></FieldGroup>
                <Button type="submit" full loading={submitText.isPending}>Submit Report</Button>
              </form>
            ) : (
              <form onSubmit={handlePdfSubmit} className="flex flex-col gap-4 mt-5">
                <FieldGroup label="Title"><Input required value={title} onChange={(e) => setTitle(e.target.value)} /></FieldGroup>
                <FieldGroup label="PDF File" hint="Max size 5MB.">
                  <label className="flex items-center gap-2 rounded-lg border border-dashed border-border bg-surface-input px-4 py-6 text-sm text-text-dim cursor-pointer hover:border-border-hover justify-center">
                    <Upload size={15} />
                    {file ? file.name : "Choose a .pdf file"}
                    <input type="file" accept=".pdf" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                  </label>
                </FieldGroup>
                <Button type="submit" full loading={submitPdf.isPending}>Upload &amp; Extract</Button>
              </form>
            )}
          </Card>
        </div>

        <div className="lg:col-span-7 flex flex-col gap-3">
          {isLoading ? (
            <Spinner size="lg" />
          ) : isError ? (
            <ErrorState message="Couldn't load reports." onRetry={refetch} />
          ) : !reports?.length ? (
            <EmptyState icon={FileText} title="No reports yet" message="No situation reports have been filed yet." />
          ) : (
            reports.map((r) => (
              <Card key={r._id} hover onClick={() => setSelectedId(r._id)} className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm">{r.title}</h4>
                  <p className="text-[11px] text-text-dim mt-0.5">{fmt(r.createdAt)} · {r.reportType}</p>
                </div>
                <ChevronRight size={16} className="text-text-dim" />
              </Card>
            ))
          )}
        </div>
      </div>

      <Modal isOpen={!!selectedId} onClose={() => setSelectedId(null)} title={detail?.title || "Report"} maxWidth="max-w-2xl">
        {detail && (
          <div className="flex flex-col gap-4">
            <p className="text-[11px] text-text-dim">{fmt(detail.createdAt)} · {detail.reportType}</p>
            <div className="rounded-xl border border-border bg-surface-input p-4">
              <div className="text-[0.65rem] font-bold uppercase text-text-dim mb-1.5">AI Extracted Summary</div>
              <p className="text-sm text-text-secondary leading-relaxed">
                {detail.aiExtractedSummary || "Processing extraction summary…"}
              </p>
            </div>
            {detail.originalText && (
              <div className="rounded-xl border border-border bg-surface-input p-4 max-h-56 overflow-y-auto">
                <div className="text-[0.65rem] font-bold uppercase text-text-dim mb-1.5">Raw Text</div>
                <p className="text-xs font-mono text-text-dim whitespace-pre-wrap">{detail.originalText}</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
