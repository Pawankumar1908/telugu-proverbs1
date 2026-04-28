import { useEffect, useState } from "react";
import "../styles/user-dashboard.css";
import { API_BASE_URL } from "../api/config";

export default function GuestDashboard({ user, onLogout }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [feedback, setFeedback] = useState({});
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [sessions, setSessions] = useState([
    {
      id: Date.now(),
      title: "New Search",
      query: "",
      results: [],
      updatedAt: new Date().toISOString(),
    },
  ]);
  const [currentSessionId, setCurrentSessionId] = useState(null);

  useEffect(() => {
    if (!currentSessionId && sessions.length > 0) {
      setCurrentSessionId(sessions[0].id);
    }
  }, [currentSessionId, sessions]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    try {
      const url = `${API_BASE_URL}/search?query=${encodeURIComponent(searchQuery)}&user_id=${encodeURIComponent(user.user_id)}`;
      const response = await fetch(url);
      const data = await response.json();
      const results = data.data || [];
      setSearchResults(results);
      setMessage("");
      const nextFeedback = {};
      results.forEach((result) => {
        if (result.user_vote === "upvote") {
          nextFeedback[result.id || result.proverb_english] = 1;
        } else if (result.user_vote === "downvote") {
          nextFeedback[result.id || result.proverb_english] = -1;
        }
      });
      setFeedback((prev) => ({ ...prev, ...nextFeedback }));
      updateCurrentSession({
        title: searchQuery.trim(),
        query: searchQuery,
        results,
      });
    } catch (err) {
      setMessage("Failed to search proverbs");
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const submitFeedback = async (proverb, rating) => {
    const voteType = rating === 1 ? "upvote" : "downvote";
    const proverbId = proverb.id || proverb.proverb_english || proverb.proverb || proverb.title;
    const keyword = (searchQuery || currentSession?.query || "").trim().toLowerCase();

    try {
      await fetch(`${API_BASE_URL}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user.user_id,
          proverb_id: proverbId,
          keyword,
          vote_type: voteType,
        }),
      });

      const feedbackKey = proverbId || proverb.proverb_english;
      setFeedback((prev) => ({ ...prev, [feedbackKey]: rating }));

      setSearchResults((prev) => {
        const updated = reorderResultsAfterVote(prev, proverbId, voteType);
        updateCurrentSession({ results: updated });
        return updated;
      });

      setMessage(voteType === "upvote" ? "Upvote saved for this keyword." : "Downvoted proverb hidden for this keyword.");
      setTimeout(() => setMessage(""), 2000);
    } catch (err) {
      setMessage("Failed to save vote");
    }
  };

  const formatDate = (isoString) => {
    if (!isoString) return "";
    return new Date(isoString).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const updateCurrentSession = (changes) => {
    if (!currentSessionId) return;
    setSessions((prev) =>
      prev.map((session) =>
        session.id === currentSessionId
          ? {
              ...session,
              ...changes,
              updatedAt: new Date().toISOString(),
            }
          : session
      )
    );
  };

  const handleNewOption = () => {
    const newSession = {
      id: Date.now(),
      title: "New Search",
      query: "",
      results: [],
      updatedAt: new Date().toISOString(),
    };
    setSessions((prev) => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
    setSearchQuery("");
    setSearchResults([]);
    setMessage("");
  };

  const handleSelectSession = (session) => {
    setCurrentSessionId(session.id);
    setSearchQuery(session.query || "");
    setSearchResults(session.results || []);
    setMessage("");
  };

  const currentSession = sessions.find((session) => session.id === currentSessionId);

  return (
    <div className="user-dashboard">
      <div className="user-layout">
        <aside className="user-sidebar">
          <div className="user-sidebar-top">
            <p className="user-eyebrow">Telugu Proverbs Platform</p>
            <h2>Search History</h2>
            <p className="user-subtitle">Guest User</p>
          </div>

          <button type="button" className="user-btn user-btn-primary user-sidebar-btn" onClick={handleNewOption}>
            + New Search
          </button>

          <div className="user-session-list">
            {sessions.map((session) => (
              <button
                key={session.id}
                type="button"
                className={`user-session-item ${currentSessionId === session.id ? "is-active" : ""}`}
                onClick={() => handleSelectSession(session)}
              >
                <span>{session.title || "New Search"}</span>
                <small>{formatDate(session.updatedAt)}</small>
              </button>
            ))}
          </div>

          <button type="button" className="user-btn user-btn-ghost user-sidebar-btn" onClick={() => setShowAboutModal(true)}>
            About Us
          </button>

          <button type="button" className="user-btn user-btn-danger user-sidebar-btn" onClick={onLogout}>
            Sign Out
          </button>
        </aside>

        <main className="user-main-content">
          <header className="user-shell user-header">
            <div>
              <p className="user-eyebrow">Current View</p>
              <h1>Search Proverbs</h1>
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

          <section className="user-shell user-tabs-wrap">
            <div className="user-panel-header">
              <div>
                <p className="user-panel-kicker">Search Results</p>
                <h3>Find Telugu Proverbs</h3>
              </div>
              <div className="user-pill">{searchResults.length} results</div>
            </div>

            {message ? <div className="user-alert">{message}</div> : null}

            <section className="user-panel">
              <form onSubmit={handleSearch} className="user-search-form">
                <input
                  type="text"
                  placeholder="Search by keyword, theme, or proverb..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="user-input"
                  autoFocus
                />
                <button type="submit" disabled={loading} className="user-btn user-btn-primary">
                  {loading ? "Searching..." : "Search"}
                </button>
              </form>

              {searchResults.length > 0 ? (
                <div className="proverb-list">
                  {searchResults.map((proverb, index) => {
                    const proverbId = proverb.id || proverb.proverb_english || proverb.proverb || proverb.title;
                    const isFeedbackUpvote = feedback[proverbId] === 1;
                    const isFeedbackDownvote = feedback[proverbId] === -1;

                    return (
                      <div key={index} className="proverb-item">
                        <div className="proverb-content">
                          <div className="proverb-main">
                            <p className="proverb-telugu">{proverb.proverb_telugu}</p>
                            <p className="proverb-english">"{proverb.proverb_english}"</p>
                            <p className="proverb-meaning">{proverb.meaning}</p>
                          </div>
                          {proverb.keywords && (
                            <div className="proverb-tags">
                              {proverb.keywords.split(",").map((tag, i) => (
                                <span key={i} className="proverb-tag">
                                  {tag.trim()}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="proverb-actions">
                          <button
                            type="button"
                            className={`proverb-vote-btn ${isFeedbackUpvote ? "is-active" : ""}`}
                            onClick={() => submitFeedback(proverb, 1)}
                            disabled={loading}
                            title="Helpful"
                          >
                            👍
                          </button>
                          <button
                            type="button"
                            className={`proverb-vote-btn ${isFeedbackDownvote ? "is-active" : ""}`}
                            onClick={() => submitFeedback(proverb, -1)}
                            disabled={loading}
                            title="Not helpful"
                          >
                            👎
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : searchQuery ? (
                <div className="user-empty-state">
                  <p>No proverbs found. Try a different search term.</p>
                </div>
              ) : (
                <div className="user-empty-state">
                  <p>Start by searching for a keyword or theme to discover Telugu proverbs.</p>
                </div>
              )}
            </section>
          </section>
        </main>
      </div>

      {showAboutModal ? (
        <div className="user-modal-backdrop" onClick={() => setShowAboutModal(false)}>
          <div className="user-modal" onClick={(e) => e.stopPropagation()}>
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
            <p>
              <strong>Note:</strong> Mistakes can be made and annotations can be done to improve the data quality.
            </p>

            <div className="user-modal-grid">
              <div className="user-modal-card">
                <h4>Mentorship</h4>
                <p>
                  <strong>Mentor:</strong> Sri Angara Jayasri
                </p>
                <p>
                  <strong>Developers:</strong> Budda Pawan Kumar and   D. Manaswini
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

function getProverbId(proverb, index) {
  return proverb.id || proverb.proverb_english || proverb.proverb || proverb.title || String(index);
}

function reorderResultsAfterVote(results, proverbId, voteType) {
  const normalized = results.map((item, index) => ({
    ...item,
    id: getProverbId(item, index),
  }));

  if (voteType === "downvote") {
    return normalized.filter((item) => item.id !== proverbId);
  }

  return normalized;
}
