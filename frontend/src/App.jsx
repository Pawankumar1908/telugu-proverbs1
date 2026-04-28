import { useState, useEffect } from "react";
import { sendMessage } from "./api/chatApi";
import Login from "./components/Login";
import AdminDashboard from "./components/AdminDashboard";
import UserDashboard from "./components/UserDashboard";
import GuestDashboard from "./components/GuestDashboard";
import AnnotatePage from "./components/AnnotatePage";
import ChatHistory from "./components/ChatHistory";
import ProverbCard from "./components/ProverbCard";
import { API_BASE_URL } from "./api/config";

const formatDateTime = (isoString) => {
  if (!isoString) return "";
  const date = new Date(isoString);
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

export default function App() {
  const [user, setUser] = useState(null);
  const [showAnnotate, setShowAnnotate] = useState(false);
  const [input, setInput] = useState("");
  const [cards, setCards] = useState([]);
  const [chat, setChat] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchTheme, setSearchTheme] = useState("");
  const [chats, setChats] = useState([]);
  const [currentChatIndex, setCurrentChatIndex] = useState(null);

  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  useEffect(() => {
    if (user && currentChatIndex === null) {
      const now = new Date().toISOString();
      const initialChat = {
        title: "New Chat",
        messages: [],
        cards: [],
        createdAt: now,
        lastUpdated: now,
      };
      setChats([initialChat]);
      setCurrentChatIndex(0);
    }
  }, [user, currentChatIndex]);

  const handleLogin = (userData) => {
    localStorage.setItem("user", JSON.stringify(userData));
    setUser(userData);
    
    // Don't redirect to /admin here - let handleUserStateChange handle the route
    // Just set the user
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    setUser(null);
    setCards([]);
    setChat([]);
    setChats([]);
    setCurrentChatIndex(null);
  };

  const handleVote = async (voteData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/vote`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(voteData)
      });
      
      if (response.ok) {
        console.log("Vote recorded:", voteData);
      } else {
        console.error("Vote failed");
      }
    } catch (err) {
      console.error("Vote error:", err);
    }
  };

  const handleNewChat = () => {
    const now = new Date().toISOString();
    const newChat = {
      title: "New Chat",
      messages: [],
      cards: [],
      createdAt: now,
      lastUpdated: now,
    };
    setChats((prevChats) => [...prevChats, newChat]);
    setCurrentChatIndex(chats.length);
    setCards([]);
    setChat([]);
    setInput("");
  };

  const handleSelectChat = (index) => {
    const selected = chats[index];
    if (!selected) return;
    setCurrentChatIndex(index);
    setCards(selected.cards || []);
    setChat(selected.messages || []);
  };

  const saveCurrentChat = (updatedCards, updatedChat) => {
    if (currentChatIndex !== null) {
      const updatedChats = [...chats];
      const title =
        updatedChat.find((message) => message.sender === "user")?.text.slice(0, 40) ||
        updatedChats[currentChatIndex].title;
      updatedChats[currentChatIndex] = {
        ...updatedChats[currentChatIndex],
        cards: updatedCards,
        messages: updatedChat,
        title,
        lastUpdated: new Date().toISOString(),
      };
      setChats(updatedChats);
    }
  };

  const send = async () => {
    const trimmed = input.trim();
    if (!trimmed) return;

    setLoading(true);
    setError(null);

    const userMessage = {
      sender: "user",
      text: trimmed,
      timestamp: new Date().toISOString(),
      type: "message",
    };
    
    // Add thinking message while loading
    const thinkingMessage = {
      sender: "bot",
      text: "Thinking...",
      timestamp: new Date().toISOString(),
      type: "message",
      isThinking: true,
    };
    
    const updatedChat = [...chat, userMessage, thinkingMessage];
    setChat(updatedChat);

    try {
      const res = await sendMessage(trimmed);
      console.log("API Response:", res.data);

      let finalChat = [...chat, userMessage];

      if (res.data.type === "cards") {
        const cardsData = res.data.data;
        console.log("Cards received:", cardsData);
        setCards(cardsData);
        setSearchTheme(trimmed);
        // Add cards as a bot message in the conversation
        const botMessage = {
          sender: "bot",
          type: "cards",
          cards: cardsData,
          timestamp: new Date().toISOString(),
        };
        finalChat = [...finalChat, botMessage];
        setChat(finalChat);
      } else if (res.data.type === "text") {
        const botMessage = {
          sender: "bot",
          text: res.data.data,
          timestamp: new Date().toISOString(),
          type: "message",
        };
        finalChat = [...finalChat, botMessage];
        setChat(finalChat);
      } else {
        setError("Unexpected response from the server.");
      }

      saveCurrentChat([], finalChat);
    } catch (err) {
      console.log("API Error:", err);
      setError(err?.response?.data?.detail || err.message || "Request failed.");
      setChat([...chat, userMessage]);
      saveCurrentChat([], [...chat, userMessage]);
    } finally {
      setLoading(false);
      setInput("");
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter") {
      send();
    }
  };

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  // Show annotate page for users who want to submit proverbs
  if (showAnnotate) {
    return <AnnotatePage user={user} onLogout={handleLogout} onBack={() => setShowAnnotate(false)} />;
  }

  // Show admin dashboard for admin users
  if (user.role === "admin") {
    return <AdminDashboard user={user} onLogout={handleLogout} />;
  }

  // Show guest dashboard for guest users
  if (user.role === "guest") {
    return <GuestDashboard user={user} onLogout={handleLogout} />;
  }

  // Show user dashboard for regular users
  if (user.role === "user") {
    return <UserDashboard user={user} onLogout={handleLogout} onAnnotate={() => setShowAnnotate(true)} />;
  }

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        background: "#ffffff",
        color: "#1a1a1a",
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      <ChatHistory
        chats={chats}
        currentChatIndex={currentChatIndex}
        onSelectChat={handleSelectChat}
        onNewChat={handleNewChat}
        username={user.email}
        onLogout={handleLogout}
        onAnnotate={() => setShowAnnotate(true)}
      />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {chat.length === 0 ? (
          <div
            style={{
              padding: "48px 40px 28px",
              background: "#fbf4eb",
              borderBottom: "1px solid rgba(46, 42, 38, 0.08)",
              textAlign: "center",
            }}
          >
            <div style={{ maxWidth: "720px", margin: "0 auto" }}>
              <div style={{ fontSize: "36px", fontWeight: 700, color: "#b95b2d", marginBottom: "14px" }}>
                Telugu Proverbs
              </div>
              <p style={{ margin: "0 auto", maxWidth: "560px", fontSize: "16px", color: "#6a5f53", lineHeight: 1.7 }}>
                Discover wisdom through semantic search
              </p>
            </div>
          </div>
        ) : null}

        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ flex: 1, overflowY: "auto", padding: "28px 36px", maxWidth: "1100px", margin: "0 auto", width: "100%" }}>
            {searchTheme && chat.length > 0 && (
              <div style={{ color: "#999", fontSize: "13px", marginBottom: "18px" }}>
                Results for: <b>{searchTheme}</b>
              </div>
            )}

            <div style={{ display: "grid", gap: "22px" }}>
            {chat.map((msg, i) => (
              <div key={i}>
                {msg.type === "message" ? (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: msg.sender === "user" ? "flex-start" : "flex-end",
                    }}
                  >
                    <div
                      style={{
                        maxWidth: "72%",
                        background: msg.isThinking ? "#e8e8e8" : (msg.sender === "user" ? "#ff6b35" : "#f0f0f0"),
                        color: msg.isThinking ? "#666" : (msg.sender === "user" ? "#ffffff" : "#1a1a1a"),
                        padding: "18px 22px",
                        borderRadius: msg.sender === "user" ? "22px 22px 6px 22px" : "22px 22px 22px 6px",
                        boxShadow: msg.sender === "user" ? "0 4px 12px rgba(255, 107, 53, 0.2)" : "0 2px 8px rgba(0, 0, 0, 0.08)",
                        lineHeight: 1.7,
                      }}
                    >
                      <div style={{ fontSize: "15px", fontStyle: msg.isThinking ? "italic" : "normal" }}>{msg.text}</div>
                      <div style={{ marginTop: "10px", fontSize: "12px", opacity: 0.7, textAlign: msg.sender === "user" ? "right" : "left" }}>
                        {formatDateTime(msg.timestamp)}
                      </div>
                    </div>
                  </div>
                ) : msg.type === "cards" ? (
                  <div>
                    {msg.cards.map((card, cardIdx) => (
                      <ProverbCard 
                        key={cardIdx}
                        data={card} 
                        onVote={handleVote}
                        userId={user.user_id || user.email}
                        keyword={searchTheme}
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>

          {error && (
            <div style={{ marginTop: "24px", color: "#c0392b", fontSize: "14px" }}>
              {error}
            </div>
          )}
        </div>

        {/* Search bar always at bottom */}
        <div
          style={{
            padding: "12px 28px",
            background: "#f5f5f5",
            borderTop: "1px solid #e5e5e5",
            display: "flex",
            gap: "10px",
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={chat.length === 0 ? "Search for wisdom... (e.g., how to live well)" : "Ask for more proverbs or explain one..."}
            style={{
              flex: 1,
              padding: "12px 16px",
              borderRadius: "999px",
              border: "1px solid #e5e5e5",
              fontSize: "14px",
              outline: "none",
            }}
          />
          <button
            onClick={send}
            disabled={loading}
            style={{
              padding: "12px 24px",
              background: "#ff6b35",
              color: "#fff",
              border: "none",
              borderRadius: "999px",
              cursor: loading ? "not-allowed" : "pointer",
              fontWeight: 700,
            }}
          >
            {loading ? "..." : "Send"}
          </button>
        </div>
        </div>
      </div>
    </div>
  );
}
