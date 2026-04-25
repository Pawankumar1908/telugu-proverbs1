import { useEffect, useState } from "react";
import "../styles/user-dashboard.css";
import { API_BASE_URL } from "../api/config";

const adminTabs = [
  { id: "analytics", label: "Analytics", description: "Platform totals and activity summary." },
  { id: "new-annotations", label: "New Annotations", description: "Review and moderate pending submissions." },
  { id: "annotators", label: "Annotators", description: "Track contributor performance." },
  { id: "history", label: "History", description: "Review approval and rejection timeline." },
  { id: "repository", label: "Repository", description: "Browse and export proverb records." },
  { id: "add-proverb", label: "Add Proverb", description: "Create an individual proverb entry." },
  { id: "upload-csv", label: "Upload CSV", description: "Bulk upload proverb dataset rows." },
];

const initialFormState = {
  proverb_telugu: "",
  proverb_english: "",
  meaning: "",
  keywords: "",
  theme: "",
  context: "",
};

export default function AdminDashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState("analytics");
  const [analytics, setAnalytics] = useState(null);
  const [annotators, setAnnotators] = useState(null);
  const [newAnnotations, setNewAnnotations] = useState(null);
  const [history, setHistory] = useState(null);
  const [repository, setRepository] = useState(null);
  const [searchRepo, setSearchRepo] = useState("");
  const [formData, setFormData] = useState(initialFormState);
  const [csvFile, setCsvFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [duplicateFound, setDuplicateFound] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/analytics`);
      const data = await response.json();
      setAnalytics(data.data);
    } catch (err) {
      setMessage("Error: Failed to fetch analytics");
    }
  };

  const fetchAnnotators = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/annotators-stats`);
      const data = await response.json();
      setAnnotators(data.data);
    } catch (err) {
      setMessage("Error: Failed to fetch annotators");
    }
  };

  const fetchNewAnnotations = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/pending-annotations?role=admin`);
      const data = await response.json();
      setNewAnnotations(data.data);
    } catch (err) {
      setMessage("Error: Failed to fetch annotations");
    }
  };

  const fetchHistory = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/history`);
      const data = await response.json();
      setHistory(data.data);
    } catch (err) {
      setMessage("Error: Failed to fetch history");
    }
  };

  const fetchRepository = async (search = "") => {
    try {
      const url = search
        ? `${API_BASE_URL}/admin/repository?search=${encodeURIComponent(search)}`
        : `${API_BASE_URL}/admin/repository`;
      const response = await fetch(url);
      const data = await response.json();
      setRepository(data.data);
    } catch (err) {
      setMessage("Error: Failed to fetch repository");
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === "analytics") fetchAnalytics();
    if (tab === "new-annotations") fetchNewAnnotations();
    if (tab === "annotators") fetchAnnotators();
    if (tab === "history") fetchHistory();
    if (tab === "repository") fetchRepository(searchRepo.trim());
  };

  const handleAddProverb = async (event) => {
    event.preventDefault();

    if (duplicateFound) {
      setMessage("Warning: Proverb already exists. Verify before submitting.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(`${API_BASE_URL}/admin/add-proverb`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        setMessage("Success: Proverb added successfully.");
        setFormData(initialFormState);
        setDuplicateFound(false);
      } else {
        setMessage("Error: Failed to add proverb.");
      }
    } catch (err) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCSVUpload = async (event) => {
    event.preventDefault();

    if (!csvFile) {
      setMessage("Warning: Please select a CSV file.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const fileContent = await csvFile.text();

      const response = await fetch(`${API_BASE_URL}/admin/upload-csv`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({ csv_data: fileContent }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage(`Success: Uploaded. Inserted ${data.inserted}, skipped ${data.skipped}.`);
        setCsvFile(null);
      } else {
        setMessage("Error: Failed to upload CSV.");
      }
    } catch (err) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setMessage("");
    setDuplicateFound(false);
  };

  const handleCheckProverb = async () => {
    if (!formData.proverb_telugu && !formData.proverb_english) {
      setMessage("Warning: Enter Telugu or English proverb first.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(`${API_BASE_URL}/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ value: formData.proverb_telugu || formData.proverb_english }),
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const data = await response.json();

      if (data.status === "error") {
        setMessage(`Error: ${data.message}`);
        return;
      }

      if (data.status === "exists") {
        setMessage(`Warning: Proverb already exists. Telugu: ${data.telugu} | English: ${data.english}`);
        setDuplicateFound(true);
        setFormData((prev) => ({
          ...prev,
          proverb_telugu: data.telugu || prev.proverb_telugu,
          proverb_english: data.english || prev.proverb_english,
          meaning: data.meaning || prev.meaning,
          keywords: data.keywords || prev.keywords,
        }));
      } else {
        setMessage("Success: Proverb is new. You can add it.");
        setDuplicateFound(false);
        setFormData((prev) => ({
          ...prev,
          proverb_telugu: data.telugu || prev.proverb_telugu,
          proverb_english: data.english || prev.proverb_english,
        }));
      }
    } catch (err) {
      setMessage(`Error: ${err.message}. Verify backend URL and CORS configuration.`);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (!repository || repository.length === 0) {
      return;
    }

    const csv = repository
      .map(
        (item) =>
          `"${item.proverb_telugu || ""}","${item.proverb_english || ""}","${item.meaning || ""}","${item.keywords || ""}"`
      )
      .join("\n");

    const blob = new Blob(["proverb_telugu,proverb_english,meaning,keywords\n" + csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "proverbs_export.csv";
    anchor.click();
    window.URL.revokeObjectURL(url);
  };

  const handleDeleteProverb = async (proverb_id, proverb_name) => {
    if (!window.confirm(`Are you sure you want to delete this proverb?\n\n"${proverb_name}"?`)) {
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(`${API_BASE_URL}/admin/delete-proverb/${proverb_id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        setMessage("Success: Proverb deleted successfully.");
        fetchRepository(searchRepo.trim());
      } else {
        setMessage(`Error: ${data.detail || "Failed to delete proverb."}`);
      }
    } catch (err) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const messageTone = getMessageTone(message);
  const currentTab = adminTabs.find((tab) => tab.id === activeTab);

  return (
    <div className="admin-dashboard">
      <header className="admin-header">
        <div>
          <p className="user-eyebrow">Administrative Workspace</p>
          <h1 className="admin-title">Admin Dashboard</h1>
          <p className="admin-subtitle">
            Logged in as <strong>{user.email}</strong>
          </p>
        </div>

        <div className="user-header-actions">
          <button type="button" className="user-btn user-btn-ghost" onClick={() => setShowAboutModal(true)}>
            About Us
          </button>
          <button type="button" className="user-btn user-btn-danger" onClick={onLogout}>
            Sign Out
          </button>
        </div>
      </header>

      <div className="admin-layout">
        <aside className="admin-sidebar">
          {adminTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`admin-nav-btn ${activeTab === tab.id ? "is-active" : ""}`}
              onClick={() => handleTabChange(tab.id)}
            >
              <span>{tab.label}</span>
              <small>{tab.description}</small>
            </button>
          ))}
        </aside>

        <main className="admin-main">
          <section className="admin-panel">
            <div className="user-panel-header">
              <div>
                <p className="user-panel-kicker">Current View</p>
                <h3>{currentTab?.label || "Admin Dashboard"}</h3>
              </div>
            </div>

            {message ? <div className={`admin-alert ${messageTone}`}>{message}</div> : null}

            {activeTab === "analytics" ? (
              <section>
                {analytics ? (
                  <div className="admin-stat-grid">
                    <article className="admin-stat-card blue">
                      <h4>Total Proverbs</h4>
                      <p>{analytics.total_proverbs ?? 0}</p>
                    </article>
                    <article className="admin-stat-card green">
                      <h4>Active Users</h4>
                      <p>{analytics.total_users ?? 0}</p>
                    </article>
                    <article className="admin-stat-card violet">
                      <h4>Total Votes</h4>
                      <p>{analytics.total_feedback ?? 0}</p>
                    </article>
                  </div>
                ) : (
                  <button type="button" className="user-btn user-btn-primary" onClick={fetchAnalytics}>
                    Load Analytics
                  </button>
                )}
              </section>
            ) : null}

            {activeTab === "add-proverb" ? (
              <section>
                <form onSubmit={handleAddProverb} className="admin-form">
                  <div className="admin-field">
                    <label htmlFor="proverb_telugu">Telugu Proverb</label>
                    <input
                      id="proverb_telugu"
                      type="text"
                      name="proverb_telugu"
                      value={formData.proverb_telugu}
                      onChange={handleInputChange}
                      className="user-input"
                      required
                    />
                  </div>

                  <div className="admin-field">
                    <label htmlFor="proverb_english">English Proverb</label>
                    <input
                      id="proverb_english"
                      type="text"
                      name="proverb_english"
                      value={formData.proverb_english}
                      onChange={handleInputChange}
                      className="user-input"
                      required
                    />
                  </div>

                  <div className="admin-inline-actions">
                    <button type="button" className="user-btn user-btn-primary" onClick={handleCheckProverb} disabled={loading}>
                      {loading ? "Checking..." : "Check Proverb"}
                    </button>
                  </div>

                  <div className="admin-field">
                    <label htmlFor="meaning">Meaning</label>
                    <textarea
                      id="meaning"
                      name="meaning"
                      rows="3"
                      value={formData.meaning}
                      onChange={handleInputChange}
                      className="user-input admin-textarea"
                      required
                    />
                  </div>

                  <div className="admin-field">
                    <label htmlFor="keywords">Keywords (comma-separated)</label>
                    <input
                      id="keywords"
                      type="text"
                      name="keywords"
                      value={formData.keywords}
                      onChange={handleInputChange}
                      className="user-input"
                      placeholder="truth, honesty, integrity"
                    />
                  </div>

                  <div className="admin-field">
                    <label htmlFor="theme">Theme</label>
                    <input
                      id="theme"
                      type="text"
                      name="theme"
                      value={formData.theme}
                      onChange={handleInputChange}
                      className="user-input"
                      placeholder="Truth & Honesty"
                    />
                  </div>

                  <div className="admin-field">
                    <label htmlFor="context">Context</label>
                    <textarea
                      id="context"
                      name="context"
                      rows="3"
                      value={formData.context}
                      onChange={handleInputChange}
                      className="user-input admin-textarea"
                      placeholder="When to use this proverb..."
                    />
                  </div>

                  <button type="submit" className="user-btn user-btn-accent admin-submit" disabled={loading}>
                    {loading ? "Adding..." : "Add Proverb"}
                  </button>
                </form>
              </section>
            ) : null}

            {activeTab === "upload-csv" ? (
              <section>
                <form onSubmit={handleCSVUpload} className="admin-form">
                  <div className="admin-note admin-csv-note">
                    <p className="admin-csv-note-title">CSV File Format Required</p>
                    <p>Use this header row:</p>
                    <code className="admin-csv-header-code">
                      proverb_telugu, proverb_english, meaning, keywords, theme, context
                    </code>
                    <p className="admin-csv-note-title">Column Guide</p>
                    <ul className="admin-csv-list">
                      <li><strong>proverb_telugu</strong> - Telugu proverb text</li>
                      <li><strong>proverb_english</strong> - English translation</li>
                      <li><strong>meaning</strong> - Meaning or interpretation</li>
                      <li><strong>keywords</strong> - Related keywords (comma-separated)</li>
                      <li><strong>theme</strong> - Category or theme</li>
                      <li><strong>context</strong> - When or how to use the proverb</li>
                    </ul>
                  </div>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={(event) => setCsvFile(event.target.files?.[0] || null)}
                    className="admin-file-input"
                  />
                  <button type="submit" className="user-btn user-btn-primary admin-submit" disabled={loading || !csvFile}>
                    {loading ? "Uploading..." : "Upload CSV"}
                  </button>
                </form>
              </section>
            ) : null}

            {activeTab === "new-annotations" ? (
              <section>
                <div className="admin-list-header">
                  <span>Pending items</span>
                  <strong>{newAnnotations?.length || 0}</strong>
                </div>
                {newAnnotations && newAnnotations.length > 0 ? (
                  <div className="admin-card-grid">
                    {newAnnotations.map((annotation) => (
                      <article key={annotation._id} className="admin-item-card purple">
                        <p>
                          <strong>Telugu:</strong> {annotation.proverb_telugu}
                        </p>
                        <p>
                          <strong>English:</strong> {annotation.proverb_english}
                        </p>
                        <p>
                          <strong>Meaning:</strong> {annotation.meaning}
                        </p>
                        <p>
                          <strong>Context Meaning:</strong> {annotation.context_meaning || "Not provided"}
                        </p>
                        <p>
                          <strong>Keywords:</strong> {annotation.keywords}
                        </p>
                        <p className="admin-meta">
                          <strong>Submitted by:</strong> {annotation.user_id}
                        </p>
                        <div className="admin-inline-actions">
                          <button
                            type="button"
                            className="user-btn user-btn-primary"
                            onClick={() => {
                              fetch(`${API_BASE_URL}/admin/approve-annotation/${annotation._id}`, { method: "POST" })
                                .then(() => fetchNewAnnotations());
                            }}
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            className="user-btn user-btn-danger"
                            onClick={() => {
                              fetch(`${API_BASE_URL}/admin/reject-annotation/${annotation._id}`, { method: "POST" })
                                .then(() => fetchNewAnnotations());
                            }}
                          >
                            Reject
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <EmptyState title="No pending annotations" description="New user submissions will appear here." />
                )}
              </section>
            ) : null}

            {activeTab === "annotators" ? (
              <section>
                {annotators && annotators.length > 0 ? (
                  <div className="admin-table-wrap">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Name or Email</th>
                          <th>Submitted</th>
                          <th>Approved</th>
                          <th>Rejected</th>
                        </tr>
                      </thead>
                      <tbody>
                        {annotators.map((annotator, idx) => (
                          <tr key={`${annotator._id}-${idx}`}>
                            <td>{annotator._id}</td>
                            <td>{annotator.total_submitted || annotator.submitted || 0}</td>
                            <td className="is-positive">{annotator.approved || 0}</td>
                            <td className="is-negative">{annotator.rejected || 0}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <EmptyState title="No annotators yet" description="Contributor stats will appear after submissions." />
                )}
              </section>
            ) : null}

            {activeTab === "history" ? (
              <section>
                {history && history.length > 0 ? (
                  <div className="admin-card-grid">
                    {history.map((item, idx) => (
                      <article key={`${item._id || item.updated_at}-${idx}`} className="admin-item-card green">
                        <h4>{item.proverb_telugu}</h4>
                        <p>{item.proverb_english}</p>
                        <div className="admin-history-meta">
                          <span>
                            <strong>Status:</strong>{" "}
                            <span className={item.status === "approved" ? "is-positive" : "is-negative"}>
                              {(item.status || "unknown").toUpperCase()}
                            </span>
                          </span>
                          <span>
                            <strong>By:</strong> {item.user_id}
                          </span>
                          <span>{item.updated_at ? new Date(item.updated_at).toLocaleString() : ""}</span>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <EmptyState title="No history yet" description="Approval activity will appear here once moderation starts." />
                )}
              </section>
            ) : null}

            {activeTab === "repository" ? (
              <section>
                <div className="admin-search-wrap">
                  <div className="admin-list-header">
                    <span>Repository records</span>
                    <strong>{repository?.length || 0}</strong>
                  </div>
                  <div className="admin-search-form">
                    <input
                      type="text"
                      placeholder="Search by proverb or keyword..."
                      value={searchRepo}
                      onChange={(event) => setSearchRepo(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          fetchRepository(searchRepo.trim());
                        }
                      }}
                      className="user-input"
                    />
                    <button type="button" className="user-btn user-btn-primary" onClick={() => fetchRepository(searchRepo.trim())}>
                      Search
                    </button>
                    <button type="button" className="user-btn user-btn-accent" onClick={handleExportCSV} disabled={!repository?.length}>
                      Export CSV
                    </button>
                  </div>
                </div>

                {repository && repository.length > 0 ? (
                  <div className="admin-card-grid">
                    {repository.map((item, idx) => (
                      <article key={`${item._id || item.proverb_english}-${idx}`} className="admin-item-card blue">
                        <div className="admin-rank">#{idx + 1}</div>
                        <p>
                          <strong>Telugu:</strong> {item.proverb_telugu}
                        </p>
                        <p>
                          <strong>English:</strong> {item.proverb_english}
                        </p>
                        <p>
                          <strong>Meaning:</strong> {item.meaning}
                        </p>
                        <p className="admin-meta">
                          <strong>Keywords:</strong> {item.keywords}
                        </p>
                        <div className="admin-inline-actions">
                          <button
                            type="button"
                            className="user-btn user-btn-danger"
                            onClick={() => handleDeleteProverb(item._id, item.proverb_english || item.proverb_telugu)}
                            disabled={loading}
                          >
                            Delete
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <EmptyState title="No proverbs found" description="Try a different keyword or load all records." />
                )}
              </section>
            ) : null}
          </section>
        </main>
      </div>

      {showAboutModal ? (
        <div className="user-modal-backdrop" onClick={() => setShowAboutModal(false)}>
          <div className="user-modal" onClick={(event) => event.stopPropagation()}>
            <div className="user-modal-header">
              <div>
                <p className="user-panel-kicker">About The Project</p>
                <h2>About Us</h2>
              </div>
              <button type="button" className="user-modal-close" onClick={() => setShowAboutModal(false)}>
                x
              </button>
            </div>

            <p>
              This project is an intelligent Telugu proverb retrieval system designed to surface culturally meaningful
              wisdom in a clear, usable, and modern interface.
            </p>
            <p>
              It is built for educational use so learners can understand proverb meaning, context, and real-life
              application more easily.
            </p>

            <div className="user-modal-grid">
              <div className="user-modal-card">
                <h4>Mentorship</h4>
                <p>
                  <strong>Mentor:</strong> Sri Angara Jayasri
                </p>
                <p>
                  <strong>Developers:</strong> Budda Pawan Kumar and  D. Manaswini
                </p>
              </div>
              <div className="user-modal-card">
                <h4>Team</h4>
                <p>Gowtham Villa and K. Gayatri</p>
              </div>
            </div>

            <button type="button" className="user-btn user-btn-primary" onClick={() => setShowAboutModal(false)}>
              Close
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function getMessageTone(message) {
  const normalized = (message || "").toLowerCase();
  if (!normalized) return "";
  if (normalized.includes("success")) return "is-success";
  if (normalized.includes("warning")) return "is-warning";
  return "is-error";
}

function EmptyState({ title, description }) {
  return (
    <div className="user-empty-state">
      <h4>{title}</h4>
      <p>{description}</p>
    </div>
  );
}
