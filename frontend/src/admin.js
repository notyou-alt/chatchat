/* src/admin.js */
import React, { useEffect, useState, useCallback, useRef } from "react";
import * as XLSX from "xlsx";
import "./admin.css";

const API = "http://localhost:3001";

const EMOTIONS = ["neutral","happy","serious","cheerful","shy","angry"];

const TABS = [
  { id: "dashboard", label: "Dashboard",  icon: "◈" },
  { id: "training",  label: "Training",   icon: "◉" },
  { id: "logs",      label: "Chat Logs",  icon: "☰" },
  { id: "data",      label: "Data",       icon: "⇅" },
];

/* ── Toast ── */
function Toast({ toasts }) {
  return (
    <div className="toast-wrap" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          <span>{t.type === "success" ? "✓" : "✕"}</span>
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}

/* ── Modal ── */
function Modal({ open, title, onClose, onSubmit, children }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <h3 className="modal-title">{title}</h3>
        <div className="modal-body">{children}</div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Batal</button>
          <button className="btn btn-primary" onClick={onSubmit}>Simpan</button>
        </div>
      </div>
    </div>
  );
}

/* ── Confirm Dialog ── */
function ConfirmModal({ open, message, onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 360 }}>
        <h3 className="modal-title">Konfirmasi</h3>
        <div className="modal-body">
          <p style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", lineHeight: "var(--leading-normal)" }}>
            {message}
          </p>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onCancel}>Batal</button>
          <button className="btn btn-danger" onClick={onConfirm}>Hapus</button>
        </div>
      </div>
    </div>
  );
}

/* ── FormGroup helper ── */
function FG({ label, children }) {
  return (
    <div className="form-group">
      <label className="label">{label}</label>
      {children}
    </div>
  );
}

export default function Admin({ onLogout, theme, toggleTheme }) {
  const [activeTab, setActiveTab]         = useState("dashboard");
  const [sidebarOpen, setSidebarOpen]     = useState(true);
  const [categories, setCategories]       = useState([]);
  const [intents, setIntents]             = useState([]);
  const [questions, setQuestions]         = useState([]);
  const [logs, setLogs]                   = useState([]);
  const [expandedCats, setExpandedCats]   = useState({});
  const [expandedIntents, setExpandedIntents] = useState({});
  const [modal, setModal]                 = useState({ open: false, type: null, mode: null, data: null });
  const [confirmModal, setConfirmModal]   = useState({ open: false, message: "", onConfirm: null });
  const [formCat, setFormCat]             = useState({ name: "" });
  const [formIntent, setFormIntent]       = useState({ category_id: "", name: "", response: "", emotion: "neutral" });
  const [formQuestion, setFormQuestion]   = useState({ intent_id: "", question: "" });
  const [importing, setImporting]         = useState(false);
  const [importProgress, setImportProgress] = useState("");
  const [toasts, setToasts]               = useState([]);
  const [loading, setLoading]             = useState(false);
  const toastIdRef                        = useRef(0);

  const showToast = useCallback((message, type = "success") => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

  const confirm = useCallback((message, onConfirm) => {
    setConfirmModal({ open: true, message, onConfirm });
  }, []);

  const closeConfirm = useCallback(() => {
    setConfirmModal({ open: false, message: "", onConfirm: null });
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [lRes, cRes, iRes, qRes] = await Promise.all([
        fetch(`${API}/admin/logs`),
        fetch(`${API}/admin/categories`),
        fetch(`${API}/admin/intents`),
        fetch(`${API}/admin/questions`),
      ]);
      const [l, c, i, q] = await Promise.all([lRes.json(), cRes.json(), iRes.json(), qRes.json()]);
      setLogs(Array.isArray(l) ? l : []);
      setCategories(Array.isArray(c) ? c : []);
      setIntents(Array.isArray(i) ? i : []);
      setQuestions(Array.isArray(q) ? q : []);
    } catch {
      showToast("Gagal mengambil data", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const closeModal = useCallback(() => {
    setModal({ open: false, type: null, mode: null, data: null });
  }, []);

  /* ── CATEGORY CRUD ── */
  const addCategory = async (name) => {
    if (!name.trim()) return showToast("Nama kategori kosong", "error");
    try {
      const r = await fetch(`${API}/admin/categories`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
      if (!r.ok) { const e = await r.json(); throw new Error(e.error); }
      showToast("Kategori ditambahkan");
      fetchAll();
    } catch (e) { showToast(e.message, "error"); }
  };

  const updateCategory = async (id, name) => {
    if (!name.trim()) return showToast("Nama kosong", "error");
    try {
      const r = await fetch(`${API}/admin/categories/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
      if (!r.ok) { const e = await r.json(); throw new Error(e.error); }
      showToast("Kategori diperbarui");
      fetchAll();
    } catch (e) { showToast(e.message, "error"); }
  };

  const deleteCategory = (id) => {
    const cat = categories.find((c) => c.id === id);
    if (Number(cat?.question_count) > 0) return showToast("Hapus questions-nya dulu", "error");
    confirm("Hapus kategori ini? Aksi ini tidak dapat dibatalkan.", async () => {
      closeConfirm();
      try {
        const r = await fetch(`${API}/admin/categories/${id}`, { method: "DELETE" });
        if (!r.ok) { const e = await r.json(); throw new Error(e.error); }
        showToast("Kategori dihapus");
        fetchAll();
      } catch (e) { showToast(e.message, "error"); }
    });
  };

  /* ── INTENT CRUD ── */
  const addIntent = async (intent) => {
    if (!intent.name.trim()) return showToast("Nama intent kosong", "error");
    if (!intent.category_id) return showToast("Pilih kategori", "error");
    try {
      const r = await fetch(`${API}/admin/intents`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(intent) });
      if (!r.ok) { const e = await r.json(); throw new Error(e.error); }
      showToast("Intent ditambahkan");
      fetchAll();
    } catch (e) { showToast(e.message, "error"); }
  };

  const updateIntent = async (id, updates) => {
    if (!updates.name?.trim()) return showToast("Nama intent kosong", "error");
    try {
      const r = await fetch(`${API}/admin/intents/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updates) });
      if (!r.ok) { const e = await r.json(); throw new Error(e.error); }
      showToast("Intent diperbarui");
      fetchAll();
    } catch (e) { showToast(e.message, "error"); }
  };

  const deleteIntent = (id) => {
    const intent = intents.find((i) => i.id === id);
    if (Number(intent?.question_count) > 0) return showToast("Hapus questions-nya dulu", "error");
    confirm("Hapus intent ini?", async () => {
      closeConfirm();
      try {
        const r = await fetch(`${API}/admin/intents/${id}`, { method: "DELETE" });
        if (!r.ok) { const e = await r.json(); throw new Error(e.error); }
        showToast("Intent dihapus");
        fetchAll();
      } catch (e) { showToast(e.message, "error"); }
    });
  };

  /* ── QUESTION CRUD ── */
  const addQuestion = async (q) => {
    if (!q.question.trim()) return showToast("Pertanyaan kosong", "error");
    if (!q.intent_id) return showToast("Pilih intent", "error");
    try {
      const r = await fetch(`${API}/admin/questions`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(q) });
      if (!r.ok) { const e = await r.json(); throw new Error(e.error); }
      showToast("Pertanyaan ditambahkan");
      fetchAll();
    } catch (e) { showToast(e.message, "error"); }
  };

  const updateQuestion = async (id, intent_id, question) => {
    if (!question.trim()) return showToast("Pertanyaan kosong", "error");
    try {
      const r = await fetch(`${API}/admin/questions/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question, intent_id }) });
      if (!r.ok) { const e = await r.json(); throw new Error(e.error); }
      showToast("Pertanyaan diperbarui");
      fetchAll();
    } catch (e) { showToast(e.message, "error"); }
  };

  const deleteQuestion = (id) => {
    confirm("Hapus pertanyaan ini?", async () => {
      closeConfirm();
      try {
        const r = await fetch(`${API}/admin/questions/${id}`, { method: "DELETE" });
        if (!r.ok) { const e = await r.json(); throw new Error(e.error); }
        showToast("Pertanyaan dihapus");
        fetchAll();
      } catch (e) { showToast(e.message, "error"); }
    });
  };

  /* ── LOGS ── */
  const validate = async (id, status) => {
    try {
      const r = await fetch(`${API}/admin/logs/validate`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, is_correct: status }) });
      if (!r.ok) throw new Error("Gagal validasi");
      showToast(`Log ditandai ${status === 1 ? "benar" : "salah"}`);
      fetchAll();
    } catch (e) { showToast(e.message, "error"); }
  };

  const updateLogIntent = async (logId, intentId) => {
    const finalId = intentId === "" ? null : Number(intentId);
    try {
      const r = await fetch(`${API}/admin/logs/update-intent`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ log_id: logId, intent_id: finalId }) });
      if (!r.ok) throw new Error("Gagal update intent");
      showToast("Intent log diperbarui");
      fetchAll();
    } catch (e) { showToast(e.message, "error"); }
  };

  const addFromLog = async (logId) => {
    try {
      const r = await fetch(`${API}/admin/logs/add-question`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ log_id: logId }) });
      if (!r.ok) throw new Error("Gagal tambah ke dataset");
      showToast("Pertanyaan ditambahkan ke dataset");
      fetchAll();
    } catch (e) { showToast(e.message, "error"); }
  };

  /* ── EXPORT ── */
  const exportExcel = async () => {
    try {
      const r = await fetch(`${API}/admin/export`);
      const data = await r.json();
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.categories || []), "categories");
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.intents || []), "intents");
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.questions || []), "questions");
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.chat_logs || []), "chat_logs");
      if (data.bad_words) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.bad_words), "bad_words");
      XLSX.writeFile(wb, "chatbot-export.xlsx");
      showToast("Data berhasil diekspor");
    } catch { showToast("Gagal ekspor", "error"); }
  };

  /* ── IMPORT ── */
  const cleanRow = (row, type) => {
    const r = { ...row };
    if (type === "categories") {
      if (r.id !== undefined) r.id = Number(r.id) || undefined;
      if (r.name) r.name = String(r.name).trim();
    }
    if (type === "intents") {
      if (r.id !== undefined) r.id = Number(r.id) || undefined;
      r.category_id = r.category_id !== undefined && r.category_id !== "" ? Number(r.category_id) || null : null;
      if (r.name)     r.name     = String(r.name).trim();
      if (r.response) r.response = String(r.response).trim();
      r.emotion = r.emotion ? String(r.emotion).trim() : "neutral";
    }
    if (type === "questions") {
      if (r.id !== undefined) r.id = Number(r.id) || undefined;
      r.intent_id = r.intent_id !== undefined && r.intent_id !== "" ? Number(r.intent_id) || null : null;
      if (r.question) r.question = String(r.question).trim();
    }
    return r;
  };

  const importExcel = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.name.endsWith(".xlsx")) { showToast("Hanya file .xlsx", "error"); e.target.value = ""; return; }
    if (file.size > 2 * 1024 * 1024) { showToast("File maksimal 2MB", "error"); e.target.value = ""; return; }

    setImporting(true);
    setImportProgress("Membaca file...");
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const wb = XLSX.read(new Uint8Array(evt.target.result), { type: "array" });
        setImportProgress("Memproses data...");
        const sheet = (name) => wb.Sheets[name] ? XLSX.utils.sheet_to_json(wb.Sheets[name]) : [];
        const cats  = sheet("categories").map((r) => cleanRow(r, "categories"));
        const ints  = sheet("intents").map((r) => cleanRow(r, "intents"));
        const qs    = sheet("questions").map((r) => cleanRow(r, "questions"));
        if (!cats.length && !ints.length && !qs.length) throw new Error("Sheet tidak valid atau kosong");

        setImportProgress("Mengirim ke server...");
        const r = await fetch(`${API}/admin/import`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ categories: cats, intents: ints, questions: qs }),
        });
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || "Gagal import");
        const s = data.stats || {};
        showToast(`Import berhasil — ${s.categories || 0} kategori, ${s.intents || 0} intent, ${s.questions || 0} pertanyaan`);
        fetchAll();
      } catch (err) { showToast(err.message, "error"); }
      finally { setImporting(false); setImportProgress(""); e.target.value = ""; }
    };
    reader.onerror = () => { showToast("Gagal membaca file", "error"); setImporting(false); setImportProgress(""); e.target.value = ""; };
    reader.readAsArrayBuffer(file);
  };

  /* ── Modal openers ── */
  const openAddCategory = () => { setFormCat({ name: "" }); setModal({ open: true, type: "category", mode: "add", data: null }); };
  const openEditCategory = (cat) => { setFormCat({ name: cat.name }); setModal({ open: true, type: "category", mode: "edit", data: cat }); };
  const openAddIntent = (catId = "") => { setFormIntent({ category_id: catId, name: "", response: "", emotion: "neutral" }); setModal({ open: true, type: "intent", mode: "add", data: null }); };
  const openEditIntent = (intent) => { setFormIntent({ category_id: intent.category_id, name: intent.name, response: intent.response, emotion: intent.emotion || "neutral" }); setModal({ open: true, type: "intent", mode: "edit", data: intent }); };
  const openAddQuestion = (intentId = "") => { setFormQuestion({ intent_id: intentId, question: "" }); setModal({ open: true, type: "question", mode: "add", data: null }); };
  const openEditQuestion = (q) => { setFormQuestion({ intent_id: q.intent_id, question: q.question }); setModal({ open: true, type: "question", mode: "edit", data: q }); };

  const handleModalSubmit = () => {
    const { type, mode, data } = modal;
    if (type === "category") {
      mode === "add" ? addCategory(formCat.name) : updateCategory(data.id, formCat.name);
    } else if (type === "intent") {
      mode === "add" ? addIntent(formIntent) : updateIntent(data.id, formIntent);
    } else if (type === "question") {
      mode === "add" ? addQuestion(formQuestion) : updateQuestion(data.id, formQuestion.intent_id, formQuestion.question);
    }
    closeModal();
  };

  const toggleCat = (id) => setExpandedCats((p) => ({ ...p, [id]: !p[id] }));
  const toggleInt = (id) => setExpandedIntents((p) => ({ ...p, [id]: !p[id] }));

  const grouped = categories.map((cat) => ({
    category: cat,
    intents: intents
      .filter((i) => String(i.category_id) === String(cat.id))
      .map((intent) => ({ ...intent, questions: questions.filter((q) => String(q.intent_id) === String(intent.id)) })),
  }));

  /* ── Modal content ── */
  const modalContent = () => {
    const { type, mode } = modal;
    const title = type === "category" ? (mode === "add" ? "Tambah Kategori" : "Edit Kategori") :
                  type === "intent"   ? (mode === "add" ? "Tambah Intent"   : "Edit Intent")   :
                                        (mode === "add" ? "Tambah Pertanyaan" : "Edit Pertanyaan");

    let body = null;
    if (type === "category") {
      body = (
        <FG label="Nama Kategori">
          <input className="input" type="text" value={formCat.name} onChange={(e) => setFormCat({ name: e.target.value })} placeholder="Contoh: Akademik" autoFocus />
        </FG>
      );
    } else if (type === "intent") {
      body = (
        <>
          <FG label="Kategori">
            <select className="select" value={formIntent.category_id} onChange={(e) => setFormIntent({ ...formIntent, category_id: e.target.value })}>
              <option value="">— Pilih Kategori —</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </FG>
          <FG label="Nama Intent">
            <input className="input" type="text" value={formIntent.name} onChange={(e) => setFormIntent({ ...formIntent, name: e.target.value })} placeholder="Contoh: jadwal_mentoring" />
          </FG>
          <FG label="Response Bot">
            <textarea className="textarea" value={formIntent.response} onChange={(e) => setFormIntent({ ...formIntent, response: e.target.value })} placeholder="Isi jawaban bot..." rows={4} />
          </FG>
          <FG label="Emotion">
            <select className="select" value={formIntent.emotion} onChange={(e) => setFormIntent({ ...formIntent, emotion: e.target.value })}>
              {EMOTIONS.map((em) => <option key={em} value={em}>{em.charAt(0).toUpperCase() + em.slice(1)}</option>)}
            </select>
          </FG>
        </>
      );
    } else if (type === "question") {
      body = (
        <>
          <FG label="Intent">
            <select className="select" value={formQuestion.intent_id} onChange={(e) => setFormQuestion({ ...formQuestion, intent_id: e.target.value })}>
              <option value="">— Pilih Intent —</option>
              {intents.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
          </FG>
          <FG label="Pertanyaan">
            <textarea className="textarea" value={formQuestion.question} onChange={(e) => setFormQuestion({ ...formQuestion, question: e.target.value })} placeholder="Contoh: Kapan jadwal mentoring?" rows={3} />
          </FG>
        </>
      );
    }
    return { title, body };
  };

  /* ══════════════════════════════════
     TAB RENDERS
  ══════════════════════════════════ */
  const renderDashboard = () => (
    <div>
      <div className="section-header">
        <div>
          <h2 className="section-title">Dashboard</h2>
          <p className="section-sub">Ringkasan data chatbot mentoring</p>
        </div>
        <button className="btn btn-ghost" onClick={fetchAll} disabled={loading}>
          {loading ? "Memuat..." : "↻ Refresh"}
        </button>
      </div>
      <div className="stats-grid">
        {[
          { icon: "◈", label: "Kategori",    value: categories.length },
          { icon: "◉", label: "Intent",      value: intents.length },
          { icon: "▸", label: "Pertanyaan",  value: questions.length },
          { icon: "☰", label: "Chat Log",    value: logs.length },
        ].map((s) => (
          <div key={s.label} className="stat-card">
            <div className="stat-icon">{s.icon}</div>
            <div className="stat-value">{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>
      <div style={{ marginBottom: "var(--space-6)" }}>
        <h3 style={{ fontSize: "var(--text-lg)", fontWeight: "var(--font-semibold)", color: "var(--text-primary)", marginBottom: "var(--space-4)" }}>
          Aksi Cepat
        </h3>
        <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap" }}>
          <button className="btn btn-primary" onClick={() => { setActiveTab("training"); openAddCategory(); }}>+ Kategori Baru</button>
          <button className="btn btn-ghost"   onClick={() => { setActiveTab("training"); openAddIntent(); }}>+ Intent Baru</button>
          <button className="btn btn-ghost"   onClick={() => setActiveTab("logs")}>Lihat Logs</button>
          <button className="btn btn-ghost"   onClick={() => setActiveTab("data")}>Export Data</button>
        </div>
      </div>
    </div>
  );

  const renderTraining = () => (
    <div>
      <div className="section-header">
        <div>
          <h2 className="section-title">Training Panel</h2>
          <p className="section-sub">Kelola kategori, intent, dan pertanyaan</p>
        </div>
        <button className="btn btn-primary" onClick={openAddCategory}>+ Kategori</button>
      </div>
      <div className="tree-container">
        {grouped.length === 0 && !loading && (
          <div style={{ padding: "var(--space-8)", textAlign: "center", color: "var(--text-muted)", fontSize: "var(--text-sm)" }}>
            Belum ada data. Mulai dengan menambahkan kategori.
          </div>
        )}
        {grouped.map((group) => (
          <div key={group.category.id} className="tree-category">
            <div className="tree-cat-header" onClick={() => toggleCat(group.category.id)}>
              <span className="toggle-icon">{expandedCats[group.category.id] ? "▼" : "▶"}</span>
              <span className="cat-name">
                {group.category.name}
                <span style={{ fontWeight: "var(--font-regular)", color: "var(--text-muted)", fontSize: "var(--text-xs)", marginLeft: "var(--space-2)" }}>
                  {group.intents.length} intent
                </span>
              </span>
              <div className="cat-actions" onClick={(e) => e.stopPropagation()}>
                <button className="btn-icon" onClick={() => openEditCategory(group.category)} title="Edit kategori" aria-label="Edit">✎</button>
                <button className="btn-icon danger" onClick={() => deleteCategory(group.category.id)} title="Hapus kategori" aria-label="Hapus"
                  disabled={Number(group.category.question_count) > 0}>✕</button>
                <button className="btn btn-sm btn-ghost" onClick={() => openAddIntent(group.category.id)}>+ Intent</button>
              </div>
            </div>

            {expandedCats[group.category.id] && (
              <div className="tree-intents">
                {group.intents.length === 0 && (
                  <div className="tree-intent empty">Belum ada intent di kategori ini</div>
                )}
                {group.intents.map((intent) => (
                  <div key={intent.id} className="tree-intent">
                    <div className="tree-intent-header" onClick={() => toggleInt(intent.id)}>
                      <span className="toggle-icon">{expandedIntents[intent.id] ? "▼" : "▶"}</span>
                      <span className="intent-name">
                        {intent.name}
                        <span style={{ fontWeight: "var(--font-regular)", color: "var(--text-muted)", fontSize: "var(--text-xs)", marginLeft: "var(--space-2)" }}>
                          {intent.questions.length} pertanyaan
                        </span>
                      </span>
                      <span className={`badge badge-gray`} style={{ marginRight: "var(--space-2)", fontSize: "var(--text-xs)" }}>
                        {intent.emotion || "neutral"}
                      </span>
                      <div className="intent-actions" onClick={(e) => e.stopPropagation()}>
                        <button className="btn-icon" onClick={() => openEditIntent(intent)} title="Edit intent" aria-label="Edit">✎</button>
                        <button className="btn-icon danger" onClick={() => deleteIntent(intent.id)} title="Hapus intent" aria-label="Hapus"
                          disabled={Number(intent.question_count) > 0}>✕</button>
                        <button className="btn btn-sm btn-ghost" onClick={() => openAddQuestion(intent.id)}>+ Question</button>
                      </div>
                    </div>

                    {expandedIntents[intent.id] && (
                      <div className="tree-intent-detail">
                        <div className="intent-response">
                          <span className="response-label">Response</span>
                          <span className="response-text">{intent.response || "(Belum ada response)"}</span>
                        </div>
                        <div className="tree-questions">
                          {intent.questions.length === 0 && (
                            <div className="tree-question empty">Belum ada pertanyaan</div>
                          )}
                          {intent.questions.map((q) => (
                            <div key={q.id} className="tree-question">
                              <span className="question-text">{q.question}</span>
                              <div className="question-actions">
                                <button className="btn-icon" onClick={() => openEditQuestion(q)} title="Edit" aria-label="Edit">✎</button>
                                <button className="btn-icon danger" onClick={() => deleteQuestion(q.id)} title="Hapus" aria-label="Hapus">✕</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const renderLogs = () => (
    <div>
      <div className="section-header">
        <div>
          <h2 className="section-title">Chat Logs</h2>
          <p className="section-sub">{logs.length} percakapan tersimpan</p>
        </div>
        <button className="btn btn-ghost" onClick={fetchAll} disabled={loading}>↻ Refresh</button>
      </div>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Pesan User</th>
              <th>Respon Bot</th>
              <th>Intent</th>
              <th>Score</th>
              <th>Status</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", color: "var(--text-muted)", padding: "var(--space-8)" }}>
                  Belum ada log percakapan
                </td>
              </tr>
            )}
            {logs.map((l) => (
              <tr key={l.id}>
                <td className="td-truncate" title={l.user_message}>{l.user_message}</td>
                <td className="td-truncate" title={l.bot_response}>{l.bot_response}</td>
                <td>
                  <select
                    className="log-select"
                    value={l.matched_intent_id || ""}
                    onChange={(e) => updateLogIntent(l.id, e.target.value)}
                  >
                    <option value="">(none)</option>
                    {intents.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
                  </select>
                </td>
                <td style={{ fontVariantNumeric: "tabular-nums", color: "var(--text-secondary)" }}>
                  {l.confidence_score != null ? Number(l.confidence_score).toFixed(2) : "—"}
                </td>
                <td>
                  {l.is_correct === 1
                    ? <span className="badge badge-green">Benar</span>
                    : l.is_correct === 0
                    ? <span className="badge badge-red">Salah</span>
                    : <span className="badge badge-gray">—</span>}
                </td>
                <td>
                  <div className="log-actions">
                    <button className="btn btn-sm btn-success" onClick={() => validate(l.id, 1)} title="Tandai benar" aria-label="Benar">✓</button>
                    <button className="btn btn-sm btn-danger"  onClick={() => validate(l.id, 0)} title="Tandai salah" aria-label="Salah">✕</button>
                    <button className="btn btn-sm btn-ghost"   onClick={() => addFromLog(l.id)}  title="Tambah ke dataset" aria-label="Tambah ke dataset"
                      disabled={!l.matched_intent_id}>+DS</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderData = () => (
    <div>
      <div className="section-header">
        <div>
          <h2 className="section-title">Data</h2>
          <p className="section-sub">Export dan import dataset chatbot</p>
        </div>
      </div>
      <div className="data-panel">
        <div className="data-card">
          <div className="data-card-title">📤 Export Data</div>
          <p className="data-card-desc">
            Download semua data (categories, intents, questions, logs) dalam format Excel (.xlsx).
          </p>
          <button className="btn btn-primary" onClick={exportExcel} disabled={importing}>
            Download Excel
          </button>
        </div>
        <div className="data-card">
          <div className="data-card-title">📥 Import Data</div>
          <p className="data-card-desc">
            Upload file Excel (.xlsx) dengan sheet bernama <strong>categories</strong>, <strong>intents</strong>, dan <strong>questions</strong>. Maks 2MB.
          </p>
          {importing ? (
            <div className="progress-text">
              <span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>⏳</span>
              {importProgress}
            </div>
          ) : (
            <label className="file-input-label" htmlFor="import-file">
              <span style={{ fontSize: "var(--text-xl)" }}>↑</span>
              <span>Klik untuk pilih file .xlsx</span>
              <input
                id="import-file"
                type="file"
                accept=".xlsx"
                className="file-input-hidden"
                onChange={importExcel}
                disabled={importing}
              />
            </label>
          )}
        </div>
      </div>
    </div>
  );

  const { title: modalTitle, body: modalBody } = modal.open ? modalContent() : { title: "", body: null };

  const tabTitleMap = { dashboard: "Dashboard", training: "Training Panel", logs: "Chat Logs", data: "Data" };

  return (
    <div className="admin-root">
      {/* Sidebar */}
      <aside className={`admin-sidebar${sidebarOpen ? "" : " collapsed"}`} aria-label="Sidebar navigasi">
        <div className="sidebar-brand">
          <img src="/chat_p.png" alt="Logo" className="sidebar-logo" />
          <div className="sidebar-brand-text">
            <span className="sidebar-title">Chatbot UMN</span>
            <span className="sidebar-sub">ADMIN PANEL</span>
          </div>
        </div>
        <nav className="sidebar-nav">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              className={`nav-item${activeTab === tab.id ? " active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
              aria-current={activeTab === tab.id ? "page" : undefined}
            >
              <span className="nav-item-icon">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <a href="#/" className="btn btn-ghost btn-sm" style={{ textDecoration: "none", justifyContent: "center" }}>
            ← Chat Publik
          </a>
          <button className="btn btn-danger btn-sm" onClick={onLogout}>
            Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="admin-main">
        <header className="admin-header">
          <button className="header-toggle" onClick={() => setSidebarOpen((s) => !s)} aria-label="Toggle sidebar">
            ☰
          </button>
          <span className="header-title">{tabTitleMap[activeTab]}</span>
          <div className="header-actions">
            <button className="header-toggle" onClick={toggleTheme} aria-label="Toggle tema" title={theme === "dark" ? "Light mode" : "Dark mode"}>
              {theme === "dark" ? "☀" : "☾"}
            </button>
          </div>
        </header>

        <main className="admin-content">
          {activeTab === "dashboard" && renderDashboard()}
          {activeTab === "training"  && renderTraining()}
          {activeTab === "logs"      && renderLogs()}
          {activeTab === "data"      && renderData()}
        </main>
      </div>

      {/* Modal CRUD */}
      <Modal
        open={modal.open}
        title={modalTitle}
        onClose={closeModal}
        onSubmit={handleModalSubmit}
      >
        {modalBody}
      </Modal>

      {/* Confirm Modal */}
      <ConfirmModal
        open={confirmModal.open}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={closeConfirm}
      />

      {/* Toast */}
      <Toast toasts={toasts} />
    </div>
  );
}