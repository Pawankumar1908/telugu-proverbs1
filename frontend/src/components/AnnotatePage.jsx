import { useState } from "react";
import "../styles/user-dashboard.css";
import { API_BASE_URL } from "../api/config";

export default function AnnotatePage({ user, onLogout, onBack }) {
  const [formData, setFormData] = useState({
    proverb_telugu: "",
    proverb_english: "",
    meaning: "",
    context_meaning: "",
    keywords: "",
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [duplicateFound, setDuplicateFound] = useState(false);
  const [verifyData, setVerifyData] = useState(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    setMessage("");
    setDuplicateFound(false);
    setVerifyData(null);
  };

  const handleCheckProverb = async () => {
    if (!formData.proverb_telugu && !formData.proverb_english) {
      setMessage("Please enter Telugu or English proverb");
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
        throw new Error(`Server error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (data.status === "error") {
        setMessage(`Error: ${data.message}`);
        return;
      }

      if (data.status === "exists") {
        setMessage(`This proverb already exists.\n\nTelugu: ${data.telugu}\nEnglish: ${data.english}\n\nMeaning: ${data.meaning}`);
        setDuplicateFound(true);
        setVerifyData(data);
        setFormData((prev) => ({
          ...prev,
          proverb_telugu: data.telugu || prev.proverb_telugu,
          proverb_english: data.english || prev.proverb_english,
          meaning: data.meaning || prev.meaning,
          context_meaning: data.context || prev.context_meaning,
          keywords: data.keywords || prev.keywords,
        }));
      } else {
        setMessage("Great. This proverb looks new and is ready for review.");
        setDuplicateFound(false);
        setVerifyData(data);
        setFormData((prev) => ({
          ...prev,
          proverb_telugu: data.telugu || prev.proverb_telugu,
          proverb_english: data.english || prev.proverb_english,
        }));
      }
    } catch (err) {
      console.error("Verify error:", err);
      setMessage(`Error checking proverb: ${err.message}. Verify backend URL and CORS configuration.`);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (duplicateFound) {
      setMessage("Cannot submit because this proverb already exists in the database.");
      return;
    }

    if (!formData.proverb_telugu || !formData.proverb_english || !formData.meaning) {
      setMessage("Please fill all required fields");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(`${API_BASE_URL}/annotate/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: user.user_id || user.email,
          proverb_telugu: formData.proverb_telugu,
          proverb_english: formData.proverb_english,
          meaning: formData.meaning,
          context_meaning: formData.context_meaning,
          keywords: formData.keywords,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage("Proverb submitted successfully. Admin will review it soon.");
        setFormData({
          proverb_telugu: "",
          proverb_english: "",
          meaning: "",
          context_meaning: "",
          keywords: "",
        });
        setDuplicateFound(false);
        setVerifyData(null);
      } else {
        setMessage("Failed to submit proverb");
      }
    } catch (err) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const statusClass = duplicateFound
    ? "annotate-status is-error"
    : verifyData
      ? "annotate-status is-success"
      : "annotate-status is-warning";

  return (
    <div className="annotate-page">
      <header className="user-shell user-header annotate-header">
        <div>
          <p className="user-eyebrow">Contribution Flow</p>
          <h1>Annotate Proverbs</h1>
          <p className="user-subtitle">Submit a new Telugu proverb in the same interface style as the user dashboard.</p>
        </div>

        <div className="user-header-actions">
          <button type="button" className="user-btn user-btn-ghost" onClick={() => onBack?.()}>
            Back to Search
          </button>
          <button type="button" className="user-btn user-btn-danger" onClick={onLogout}>
            Sign Out
          </button>
        </div>
      </header>

      <main className="user-shell annotate-main">
        <section className="annotate-info-card">
          <span className="user-proverb-tag">Community Contribution</span>
          <h2>Help grow the proverb collection with well-structured Telugu entries.</h2>
          <p>
            Check for duplicates first, then submit the proverb with a clear meaning and helpful keywords so the admin
            team can review it quickly.
          </p>
        </section>

        <section className="annotate-form-card">
          <form onSubmit={handleSubmit} className="annotate-form">
            <div className="annotate-field">
              <label htmlFor="proverb_telugu">Telugu Proverb *</label>
              <input
                id="proverb_telugu"
                type="text"
                name="proverb_telugu"
                value={formData.proverb_telugu}
                onChange={handleInputChange}
                placeholder="Enter in Telugu script"
                className="user-input"
              />
            </div>

            <div className="annotate-field">
              <label htmlFor="proverb_english">English Translation *</label>
              <input
                id="proverb_english"
                type="text"
                name="proverb_english"
                value={formData.proverb_english}
                onChange={handleInputChange}
                placeholder="English translation or transliteration"
                className="user-input"
              />
            </div>

            <div className="annotate-actions-row">
              <button type="button" className="user-btn user-btn-primary annotate-check-btn" onClick={handleCheckProverb} disabled={loading}>
                {loading ? "Checking..." : "Check if Exists"}
              </button>
            </div>

            {message ? <div className={statusClass}>{message}</div> : null}

            <div className="annotate-field">
              <label htmlFor="meaning">Meaning *</label>
              <textarea
                id="meaning"
                name="meaning"
                value={formData.meaning}
                onChange={handleInputChange}
                placeholder="Explain what this proverb means"
                rows="5"
                className="user-input annotate-textarea"
              />
            </div>

            <div className="annotate-field">
              <label htmlFor="context_meaning">Context Meaning</label>
              <textarea
                id="context_meaning"
                name="context_meaning"
                value={formData.context_meaning}
                onChange={handleInputChange}
                placeholder="Describe when and why this proverb is used"
                rows="4"
                className="user-input annotate-textarea"
              />
            </div>

            <div className="annotate-field">
              <label htmlFor="keywords">Keywords</label>
              <input
                id="keywords"
                type="text"
                name="keywords"
                value={formData.keywords}
                onChange={handleInputChange}
                placeholder="truth, honesty, courage"
                className="user-input"
              />
            </div>

            <button type="submit" className="user-btn user-btn-accent annotate-submit-btn" disabled={loading || duplicateFound}>
              {loading ? "Submitting..." : "Submit for Review"}
            </button>
          </form>

          <p className="annotate-footnote">Always verify the proverb first so duplicate entries do not get submitted.</p>
        </section>
      </main>
    </div>
  );
}
