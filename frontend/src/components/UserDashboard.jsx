import { useEffect, useState } from "react";
import "../styles/user-dashboard.css";
import { API_BASE_URL } from "../api/config";

const tabs = [
  { id: "search", label: "Search Proverbs", description: "Find wisdom by theme, meaning, or keyword." },
  { id: "favorites", label: "Favorites", description: "Return to the proverbs you saved." },
];

export default function UserDashboard({ user, onLogout, onAnnotate }) {
  const [activeTab, setActiveTab] = useState("search");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [favoriteProverbs, setFavoriteProverbs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [feedback, setFeedback] = useState({});
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [sessions, setSessions] = useState([
    {
      id: Date.now(),
      title: "New Option",
      tab: "search",
      query: "",
      results: [],
      updatedAt: new Date().toISOString(),
    },
  ]);
  const [currentSessionId, setCurrentSessionId] = useState(null);

  useEffect(() => {
    loadFavorites();
  }, []);

  useEffect(() => {
    if (!currentSessionId && sessions.length > 0) {
      setCurrentSessionId(sessions[0].id);
    }
  }, [currentSessionId, sessions]);

  const loadFavorites = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/favorites?user_id=${encodeURIComponent(user.user_id)}`);
      const data = await response.json();
      setFavoriteProverbs(data.data || []);
    } catch (err) {
      console.error("Failed to load favorites:", err);
    }
  };

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
        tab: "search",
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

  const addFavorite = async (proverb) => {
    try {
      const response = await fetch(`${API_BASE_URL}/favorites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user.user_id,
          proverb: {
            id: proverb.id || proverb._id || proverb.proverb_english || proverb.proverb_telugu,
            proverb_telugu: proverb.proverb_telugu || proverb.proverb || proverb.title || "",
            proverb_english: proverb.proverb_english || "",
            meaning: proverb.meaning || "",
            keywords: proverb.keywords || "",
            theme: proverb.theme || "",
            context: proverb.context || "",
          },
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "Failed to add favorite");
      }
      loadFavorites();
      setMessage(data.already_exists ? "Already in favorites." : "Added to favorites!");
      setTimeout(() => setMessage(""), 2000);
    } catch (err) {
      setMessage("Failed to add favorite");
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

      if (activeTab === "search") {
        setSearchResults((prev) => {
          const updated = reorderResultsAfterVote(prev, proverbId, voteType);
          updateCurrentSession({ results: updated });
          return updated;
        });
      }

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

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    updateCurrentSession({ tab: tabId });
  };

  const handleNewOption = () => {
    const newSession = {
      id: Date.now(),
      title: "New Option",
      tab: "search",
      query: "",
      results: [],
      updatedAt: new Date().toISOString(),
    };
    setSessions((prev) => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
    setActiveTab("search");
    setSearchQuery("");
    setSearchResults([]);
    setMessage("");
  };

  const handleSelectSession = (session) => {
    setCurrentSessionId(session.id);
    setActiveTab(session.tab || "search");
    setSearchQuery(session.query || "");
    setSearchResults(session.results || []);
    setMessage("");
  };

  const currentTab = tabs.find((tab) => tab.id === activeTab);
  const currentSession = sessions.find((session) => session.id === currentSessionId);

  return (
    <div className="user-dashboard">
      <div className="user-layout">
        <aside className="user-sidebar">
          <div className="user-sidebar-top">
            <p className="user-eyebrow">Telugu Proverbs Platform</p>
            <h2>Chat History</h2>
            <p className="user-subtitle">{user.email}</p>
          </div>

          <button type="button" className="user-btn user-btn-primary user-sidebar-btn" onClick={handleNewOption}>
            + New Option
          </button>

          <div className="user-session-list">
            {sessions.map((session) => (
              <button
                key={session.id}
                type="button"
                className={`user-session-item ${currentSessionId === session.id ? "is-active" : ""}`}
                onClick={() => handleSelectSession(session)}
              >
                <span>{session.title || "New Option"}</span>
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
              <h1>{currentTab?.label || "User Dashboard"}</h1>
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
          <div className="user-tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`user-tab ${activeTab === tab.id ? "is-active" : ""}`}
                onClick={() => handleTabChange(tab.id)}
              >
                <span>{tab.label}</span>
                <small>{tab.description}</small>
              </button>
            ))}
          </div>

          <div className="user-panel-header">
            <div>
              <p className="user-panel-kicker">Current View</p>
              <h3>{currentTab?.label}</h3>
            </div>
            <div className="user-pill">{searchResults.length} results</div>
          </div>

          {message ? <div className="user-alert">{message}</div> : null}

          {activeTab === "search" && (
            <section className="user-panel">
              <form onSubmit={handleSearch} className="user-search-form">
                <input
                  type="text"
                  placeholder="Search by keyword, theme, or proverb..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="user-input"
                />
                <button type="submit" className="user-btn user-btn-primary" disabled={loading}>
                  {loading ? "Searching..." : "Search"}
                </button>
              </form>

              {searchQuery && !loading && searchResults.length === 0 ? (
                <EmptyState
                  title="No proverbs found"
                  description={`No results for "${searchQuery}". Try a different keyword or meaning.`}
                />
              ) : null}

              <div className="user-card-grid">
                {searchResults.map((proverb, idx) => (
                  <ProverbCardComponent
                    key={`${proverb.proverb_english}-${idx}`}
                    proverb={proverb}
                    onFavorite={() => addFavorite(proverb)}
                    onFeedback={(rating) => submitFeedback(proverb, rating)}
                    currentRating={feedback[proverb.id || proverb.proverb_english]}
                  />
                ))}
              </div>
            </section>
          )}

          {activeTab === "favorites" && (
            <section className="user-panel">
              {favoriteProverbs.length > 0 ? (
                <div className="user-card-grid">
                  {favoriteProverbs.map((proverb, idx) => (
                    <ProverbCardComponent
                      key={`${proverb.proverb_english}-${idx}`}
                      proverb={proverb}
                      onFavorite={() => addFavorite(proverb)}
                      onFeedback={(rating) => submitFeedback(proverb, rating)}
                      currentRating={feedback[proverb.id || proverb.proverb_english]}
                      isFavorited
                    />
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="No favorites yet"
                  description="Save proverbs from search or browse to build your personal collection."
                />
              )}
            </section>
          )}
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

  const selected = normalized.find((item) => item.id === proverbId);
  const others = normalized.filter((item) => item.id !== proverbId);

  return selected ? [selected, ...others] : normalized;
}

function EmptyState({ title, description }) {
  return (
    <div className="user-empty-state">
      <h4>{title}</h4>
      <p>{description}</p>
    </div>
  );
}

function ProverbCardComponent({ proverb, onFavorite, onFeedback, currentRating, isFavorited }) {
  const teluguText = proverb.proverb_telugu || proverb.proverb || proverb.title || "Telugu text unavailable";
  const englishText = proverb.proverb_english || proverb.proverb || proverb.title || "English meaning unavailable";
  const meaningText = proverb.meaning || proverb.context || "Meaning not available.";
  const hasUpvoted = currentRating === 1;
  const hasDownvoted = currentRating === -1;

  return (
    <article className="user-proverb-card">
      <div className="user-proverb-topline">
        <span className="user-proverb-tag">{proverb.theme || "Wisdom"}</span>
        <span className="user-proverb-tag secondary">{proverb.keywords || "Keywords unavailable"}</span>
      </div>

      <h3>{teluguText}</h3>
      <p className="user-proverb-english">{englishText}</p>

      <div className="user-proverb-section">
        <span>Meaning</span>
        <p>{meaningText}</p>
      </div>

      {proverb.context ? (
        <div className="user-proverb-section user-context-box">
          <span>Context</span>
          <p>{proverb.context}</p>
        </div>
      ) : null}

      <div className="user-card-actions">
        <button type="button" className="user-btn user-btn-accent" onClick={onFavorite}>
          {isFavorited ? "Favorited" : "Add to Favorites"}
        </button>

        <div className="user-rating-group">
          <button
            type="button"
            className={`user-rating-btn ${hasUpvoted ? "is-selected" : ""}`}
            onClick={() => onFeedback(1)}
          >
            Upvote
          </button>
          <button
            type="button"
            className={`user-rating-btn ${hasDownvoted ? "is-selected user-rating-btn-downvote" : "user-rating-btn-downvote"}`}
            onClick={() => onFeedback(-1)}
          >
            Downvote
          </button>
        </div>
      </div>
    </article>
  );
}
