import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import "./admin.css";

function Admin() {
  const [activeTab, setActiveTab] = useState("training"); // training, logs, data

  // Data state
  const [categories, setCategories] = useState([]);
  const [intents, setIntents] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [logs, setLogs] = useState([]);

  // UI state for accordion
  const [expandedCats, setExpandedCats] = useState({});
  const [expandedIntents, setExpandedIntents] = useState({});

  // Modal states
  const [modal, setModal] = useState({
    open: false,
    type: null, // 'category', 'intent', 'question'
    mode: null, // 'add', 'edit'
    data: null,
  });

  // Form inputs for add/edit
  const [formCat, setFormCat] = useState({ name: "" });
  const [formIntent, setFormIntent] = useState({
    category_id: "",
    name: "",
    response: "",
    emotion: "neutral",
  });
  const [formQuestion, setFormQuestion] = useState({ intent_id: "", question: "" });

  // Notification helper
  const showNotification = (message, isError = false) => {
    alert(`${isError ? "❌ Gagal: " : "✅ Berhasil: "}${message}`);
  };

  // Build tree structure
  const grouped = categories.map((cat) => {
    const catIntents = intents.filter((i) => i.category_id === cat.id);
    return {
      category: cat,
      intents: catIntents.map((intent) => ({
        ...intent,
        questions: questions.filter((q) => q.intent_id === intent.id),
      })),
    };
  });

  // Fetch all data - wrapped in useCallback
  const fetchAll = useCallback(async () => {
    try {
      const [l, c, i, q] = await Promise.all([
        axios.get("http://localhost:3001/admin/logs"),
        axios.get("http://localhost:3001/admin/categories"),
        axios.get("http://localhost:3001/admin/intents"),
        axios.get("http://localhost:3001/admin/questions"),
      ]);
      setLogs(l.data);
      setCategories(c.data);
      setIntents(i.data);
      setQuestions(q.data);
    } catch (err) {
      console.error(err);
      showNotification("Gagal mengambil data", true);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // ========== CATEGORY CRUD ==========
  const addCategory = async (name) => {
    if (!name.trim()) return showNotification("Nama kategori kosong", true);
    try {
      await axios.post("http://localhost:3001/admin/categories", { name });
      showNotification("Kategori ditambahkan");
      fetchAll();
    } catch (err) {
      showNotification(err.response?.data?.error || err.message, true);
    }
  };

  const updateCategory = async (id, name) => {
    if (!name.trim()) return showNotification("Nama kategori kosong", true);
    try {
      await axios.put(`http://localhost:3001/admin/categories/${id}`, { name });
      showNotification("Kategori diperbarui");
      fetchAll();
    } catch (err) {
      showNotification(err.response?.data?.error || err.message, true);
    }
  };

  const deleteCategory = async (id) => {
    const cat = categories.find((c) => c.id === id);
    if (cat?.question_count > 0) {
      return showNotification("Category masih memiliki questions, hapus dulu.", true);
    }
    if (!window.confirm("Hapus kategori ini?")) return;
    try {
      await axios.delete(`http://localhost:3001/admin/categories/${id}`);
      showNotification("Kategori dihapus");
      fetchAll();
    } catch (err) {
      showNotification(err.response?.data?.error || err.message, true);
    }
  };

  // ========== INTENT CRUD ==========
  const addIntent = async (intent) => {
    if (!intent.name.trim()) return showNotification("Nama intent kosong", true);
    if (!intent.category_id) return showNotification("Pilih kategori", true);
    try {
      await axios.post("http://localhost:3001/admin/intents", intent);
      showNotification("Intent ditambahkan");
      fetchAll();
    } catch (err) {
      showNotification(err.response?.data?.error || err.message, true);
    }
  };

  const updateIntent = async (id, updates) => {
    if (!updates.name?.trim()) return showNotification("Nama intent kosong", true);
    try {
      await axios.put(`http://localhost:3001/admin/intents/${id}`, updates);
      showNotification("Intent diperbarui");
      fetchAll();
    } catch (err) {
      showNotification(err.response?.data?.error || err.message, true);
    }
  };

  const deleteIntent = async (id) => {
    const intent = intents.find((i) => i.id === id);
    if (intent?.question_count > 0) {
      return showNotification("Intent masih memiliki questions, hapus dulu.", true);
    }
    if (!window.confirm("Hapus intent ini?")) return;
    try {
      await axios.delete(`http://localhost:3001/admin/intents/${id}`);
      showNotification("Intent dihapus");
      fetchAll();
    } catch (err) {
      showNotification(err.response?.data?.error || err.message, true);
    }
  };

  // ========== QUESTION CRUD ==========
  const addQuestion = async (q) => {
    if (!q.question.trim()) return showNotification("Pertanyaan kosong", true);
    if (!q.intent_id) return showNotification("Pilih intent", true);
    try {
      await axios.post("http://localhost:3001/admin/questions", q);
      showNotification("Pertanyaan ditambahkan");
      fetchAll();
    } catch (err) {
      showNotification(err.response?.data?.error || err.message, true);
    }
  };

  const updateQuestion = async (id, question) => {
    if (!question.trim()) return showNotification("Pertanyaan kosong", true);
    try {
      await axios.put(`http://localhost:3001/admin/questions/${id}`, { question });
      showNotification("Pertanyaan diperbarui");
      fetchAll();
    } catch (err) {
      showNotification(err.response?.data?.error || err.message, true);
    }
  };

  const deleteQuestion = async (id) => {
    if (!window.confirm("Hapus pertanyaan ini?")) return;
    try {
      await axios.delete(`http://localhost:3001/admin/questions/${id}`);
      showNotification("Pertanyaan dihapus");
      fetchAll();
    } catch (err) {
      showNotification(err.response?.data?.error || err.message, true);
    }
  };

  // ========== LOGS & VALIDATION ==========
  const validate = async (id, status) => {
    try {
      await axios.post("http://localhost:3001/admin/validate", { id, is_correct: status });
      showNotification(`Log ${status === 1 ? "benar" : "salah"} divalidasi`);
      fetchAll();
    } catch (err) {
      showNotification(`Gagal validasi: ${err.response?.data?.error || err.message}`, true);
    }
  };

  const updateLogIntent = async (logId, intentId) => {
    const finalId = intentId === "" ? null : Number(intentId);
    try {
      await axios.post("http://localhost:3001/admin/update-log-intent", {
        log_id: logId,
        intent_id: finalId,
      });
      showNotification("Intent log diubah");
      fetchAll();
    } catch (err) {
      showNotification(`Gagal: ${err.response?.data?.error || err.message}`, true);
    }
  };

  const addFromLog = async (logId) => {
    try {
      await axios.post("http://localhost:3001/admin/add-from-log", { log_id: logId });
      showNotification("Pertanyaan ditambahkan ke intent");
      fetchAll();
    } catch (err) {
      showNotification(`Gagal: ${err.response?.data?.error || err.message}`, true);
    }
  };

  // ========== EXPORT / IMPORT ==========
  const exportExcel = () => {
    window.open("http://localhost:3001/admin/export");
    showNotification("Ekspor dimulai");
  };

  const importExcel = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    try {
      await axios.post("http://localhost:3001/admin/import", formData);
      showNotification("Import berhasil");
      fetchAll();
    } catch (err) {
      showNotification(`Gagal import: ${err.response?.data?.error || err.message}`, true);
    }
    e.target.value = "";
  };

  // ========== MODAL HANDLERS ==========
  const openAddCategory = () => {
    setFormCat({ name: "" });
    setModal({ open: true, type: "category", mode: "add", data: null });
  };
  const openEditCategory = (cat) => {
    setFormCat({ name: cat.name });
    setModal({ open: true, type: "category", mode: "edit", data: cat });
  };
  const openAddIntent = (categoryId = "") => {
    setFormIntent({
      category_id: categoryId,
      name: "",
      response: "",
      emotion: "neutral",
    });
    setModal({ open: true, type: "intent", mode: "add", data: null });
  };
  const openEditIntent = (intent) => {
    setFormIntent({
      category_id: intent.category_id,
      name: intent.name,
      response: intent.response,
      emotion: intent.emotion || "neutral",
    });
    setModal({ open: true, type: "intent", mode: "edit", data: intent });
  };
  const openAddQuestion = (intentId = "") => {
    setFormQuestion({ intent_id: intentId, question: "" });
    setModal({ open: true, type: "question", mode: "add", data: null });
  };
  const openEditQuestion = (question) => {
    setFormQuestion({ intent_id: question.intent_id, question: question.question });
    setModal({ open: true, type: "question", mode: "edit", data: question });
  };

  const handleModalSubmit = () => {
    if (modal.type === "category") {
      if (modal.mode === "add") addCategory(formCat.name);
      else updateCategory(modal.data.id, formCat.name);
    } else if (modal.type === "intent") {
      if (modal.mode === "add") addIntent(formIntent);
      else updateIntent(modal.data.id, formIntent);
    } else if (modal.type === "question") {
      if (modal.mode === "add") addQuestion(formQuestion);
      else updateQuestion(modal.data.id, formQuestion.question);
    }
    setModal({ open: false, type: null, mode: null, data: null });
  };

  // Toggle accordion
  const toggleCategory = (id) => setExpandedCats((prev) => ({ ...prev, [id]: !prev[id] }));
  const toggleIntent = (id) => setExpandedIntents((prev) => ({ ...prev, [id]: !prev[id] }));

  // ========== RENDER TRAINING TREE ==========
  const renderTree = () => (
  <div className="tree-container">
    <div className="tree-header">
      <h3>Hierarchical Training Panel</h3>
      <button className="btn btn-success" onClick={openAddCategory}>
        + New Category
      </button>
    </div>
    {grouped.length === 0 && <p>Belum ada kategori. Silakan tambah.</p>}
    {grouped.map((group) => (
      <div key={group.category.id} className="tree-category">
        <div className="tree-cat-header" onClick={() => toggleCategory(group.category.id)}>
          <span className="toggle-icon">{expandedCats[group.category.id] ? "▼" : "▶"}</span>
          <span className="cat-name">
            Category:  {group.category.name} ({group.intents.length} intent)
          </span>
          <div className="cat-actions" onClick={(e) => e.stopPropagation()}>
            <button className="btn-icon edit" onClick={() => openEditCategory(group.category)}> (edit) </button>
            <button className="btn-icon delete" onClick={() => deleteCategory(group.category.id)} disabled={group.category.question_count > 0} title={group.category.question_count > 0 ? "Hapus questions dulu" : ""}> (delete) </button>
            <button className="btn-icon add" onClick={() => openAddIntent(group.category.id)}>+ Intent</button>
          </div>
        </div>
        {expandedCats[group.category.id] && (
          <div className="tree-intents">
            {group.intents.map((intent) => (
              <div key={intent.id} className="tree-intent">
                <div className="tree-intent-header" onClick={() => toggleIntent(intent.id)}>
                  <span className="toggle-icon">{expandedIntents[intent.id] ? "▼" : "▶"}</span>
                  <span className="intent-name">
                    Intents:  {intent.name} ({intent.questions.length} question)
                  </span>
                  <div className="intent-actions" onClick={(e) => e.stopPropagation()}>
                    <button className="btn-icon edit" onClick={() => openEditIntent(intent)}> (edit) </button>
                    <button className="btn-icon delete" onClick={() => deleteIntent(intent.id)} disabled={intent.question_count > 0} title={intent.question_count > 0 ? "Hapus questions dulu" : ""}> (delete) </button>
                    <button className="btn-icon add" onClick={() => openAddQuestion(intent.id)}>+ Question</button>
                  </div>
                </div>
                {expandedIntents[intent.id] && (
                  <div className="tree-intent-detail">
                    {/* TAMPILKAN RESPONSE INTENT */}
                    <div className="intent-response">
                      <span className="response-label">Response:</span>
                      <span className="response-text">{intent.response || "(Belum ada response)"}</span>
                    </div>
                    {/* DAFTAR QUESTIONS */}
                    <div className="tree-questions">
                      {intent.questions.map((q) => (
                        <div key={q.id} className="tree-question">
                          <span className="question-text">{q.question}</span>
                          <div className="question-actions">
                            <button className="btn-icon edit" onClick={() => openEditQuestion(q)}> (edit) </button>
                            <button className="btn-icon delete" onClick={() => deleteQuestion(q.id)}> (delete) </button>
                          </div>
                        </div>
                      ))}
                      {intent.questions.length === 0 && (
                        <div className="tree-question empty">(Tidak ada pertanyaan)</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
            {group.intents.length === 0 && (
              <div className="tree-intent empty">Belum ada intent. Klik "+ Intent"</div>
            )}
          </div>
        )}
      </div>
    ))}
  </div>
);

  // ========== RENDER LOGS ==========
const renderLogs = () => (
  <div className="card">
    <h3>Chat Logs</h3>
    <table className="table">
      <thead>
        <tr><th>Question</th><th>Answer</th><th>Intent</th><th>Score</th><th>Status</th><th>Action</th></tr>
      </thead>
      <tbody>
        {logs.map((l) => (
          <tr key={l.id}>
            <td>{l.user_message}</td>
            <td>{l.bot_response}</td>
            <td>
              <select value={l.matched_intent_id || ""} onChange={(e) => updateLogIntent(l.id, e.target.value)}>
                <option value="">(none)</option>
                {intents.map((intent) => (
                  <option key={intent.id} value={intent.id}>
                    {intent.name}   {/* ← hanya nama intent */}
                  </option>
                ))}
              </select>
            </td>
            <td>{l.confidence_score ? Number(l.confidence_score).toFixed(2) : "-"}</td>
            <td>{l.is_correct === 1 ? "✅" : l.is_correct === 0 ? "❌" : "-"}</td>
            <td>
              <button className="btn btn-success" onClick={() => validate(l.id, 1)}>✔</button>
              <button className="btn btn-danger" onClick={() => validate(l.id, 0)}>✖</button>
              <button className="btn btn-warning" onClick={() => addFromLog(l.id)} disabled={!l.matched_intent_id} title={!l.matched_intent_id ? "Intent kosong" : ""}>➕</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

  // ========== RENDER DATA IMPORT/EXPORT ==========
  const renderData = () => (
    <div className="card">
      <h3>Import / Export</h3>
      <button className="btn btn-success" onClick={exportExcel}>
        Export Excel
      </button>
      <br />
      <br />
      <input type="file" onChange={importExcel} />
    </div>
  );

  // ========== MODAL COMPONENT ==========
  const renderModal = () => {
    if (!modal.open) return null;
    let title = "";
    let content = null;
    if (modal.type === "category") {
      title = modal.mode === "add" ? "Tambah Kategori" : "Edit Kategori";
      content = (
        <>
          <label>Nama Kategori</label>
          <input
            type="text"
            value={formCat.name}
            onChange={(e) => setFormCat({ name: e.target.value })}
            placeholder="Contoh: Event"
          />
        </>
      );
    } else if (modal.type === "intent") {
      title = modal.mode === "add" ? "Tambah Intent" : "Edit Intent";
      content = (
        <>
          <label>Kategori</label>
          <select
            value={formIntent.category_id}
            onChange={(e) => setFormIntent({ ...formIntent, category_id: e.target.value })}
          >
            <option value="">Pilih Kategori</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <label>Nama Intent</label>
          <input
            type="text"
            value={formIntent.name}
            onChange={(e) => setFormIntent({ ...formIntent, name: e.target.value })}
            placeholder="Contoh: event_date"
          />
          <label>Response Bot</label>
          <textarea
            value={formIntent.response}
            onChange={(e) => setFormIntent({ ...formIntent, response: e.target.value })}
            placeholder="Jawaban bot..."
            rows="3"
          />
          <label>Emotion</label>
          <select
            value={formIntent.emotion}
            onChange={(e) => setFormIntent({ ...formIntent, emotion: e.target.value })}
          >
            <option value="neutral">Neutral</option>
            <option value="happy">Happy</option>
            <option value="serious">Serious</option>
            <option value="cheerful">Cheerful</option>
            <option value="shy">Shy</option>
            <option value="angry">Angry</option>
          </select>
        </>
      );
    } else if (modal.type === "question") {
      title = modal.mode === "add" ? "Tambah Pertanyaan" : "Edit Pertanyaan";
      content = (
        <>
          <label>Intent</label>
          <select
            value={formQuestion.intent_id}
            onChange={(e) => setFormQuestion({ ...formQuestion, intent_id: e.target.value })}
          >
            <option value="">Pilih Intent</option>
            {intents.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </select>
          <label>Pertanyaan</label>
          <textarea
            value={formQuestion.question}
            onChange={(e) => setFormQuestion({ ...formQuestion, question: e.target.value })}
            placeholder="Contoh: Kapan jadwal mentoring?"
            rows="2"
          />
        </>
      );
    }
    return (
      <div className="modal-overlay" onClick={() => setModal({ open: false })}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <h3>{title}</h3>
          <div className="modal-body">{content}</div>
          <div className="modal-buttons">
            <button className="btn btn-secondary" onClick={() => setModal({ open: false })}>
              Batal
            </button>
            <button className="btn btn-primary" onClick={handleModalSubmit}>
              Simpan
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="admin-container">
      <h1 className="admin-title">ADMIN CONTROL PANEL</h1>
      <div className="navbar">
        <button className={`nav-btn ${activeTab === "training" ? "active" : ""}`} onClick={() => setActiveTab("training")}>
          TRAINING
        </button>
        <button className={`nav-btn ${activeTab === "logs" ? "active" : ""}`} onClick={() => setActiveTab("logs")}>
          LOGS
        </button>
        <button className={`nav-btn ${activeTab === "data" ? "active" : ""}`} onClick={() => setActiveTab("data")}>
          DATA
        </button>
      </div>

      {activeTab === "training" && renderTree()}
      {activeTab === "logs" && renderLogs()}
      {activeTab === "data" && renderData()}
      {renderModal()}
    </div>
  );
}

export default Admin;