export default function ChatHistory({ chats, currentChatIndex, onSelectChat, onNewChat, username, onLogout, onAnnotate }) {
  const formatDate = (isoString) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    return date.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  return (
    <div
      style={{
        width: "280px",
        background: "#ffffff",
        color: "#1a1a1a",
        padding: "22px",
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        borderRight: "1px solid #e5e5e5",
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    >
      <div style={{ marginBottom: "24px" }}>
        <h3 style={{ margin: "0 0 10px 0", fontSize: "20px", letterSpacing: "0.02em" }}>
          Chat History
        </h3>
        <p style={{ margin: "0", fontSize: "13px", color: "#6f624f" }}>
          {username}
        </p>
      </div>

      <button
        onClick={onNewChat}
        style={{
          padding: "12px 14px",
          background: "#ff6b35",
          color: "#fff",
          border: "none",
          borderRadius: "999px",
          cursor: "pointer",
          marginBottom: "12px",
          fontWeight: "700",
          letterSpacing: "0.01em",
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        + New Chat
      </button>

      <button
        onClick={onAnnotate}
        style={{
          padding: "12px 14px",
          background: "#27ae60",
          color: "#fff",
          border: "none",
          borderRadius: "999px",
          cursor: "pointer",
          marginBottom: "18px",
          fontWeight: "700",
          letterSpacing: "0.01em",
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        📝 Annotate Proverb
      </button>

      <div style={{ flex: 1, overflowY: "auto", marginBottom: "16px", minHeight: "0" }}>
        <h4 style={{ fontSize: "12px", color: "#8a7c6d", margin: "0 0 12px 0" }}>
          Recent conversations
        </h4>
        {chats.length === 0 ? (
          <p style={{ fontSize: "13px", color: "#7a6c5b" }}>No chats yet</p>
        ) : (
          chats.map((chat, index) => (
            <div
              key={index}
              onClick={() => onSelectChat(index)}
              style={{
                padding: "14px 16px",
                marginBottom: "12px",
                background: index === currentChatIndex ? "#bf5d2f" : "#fff2e5",
                color: index === currentChatIndex ? "#fff" : "#3e3528",
                borderRadius: "16px",
                cursor: "pointer",
                boxShadow: index === currentChatIndex ? "0 16px 32px rgba(191,93,47,0.18)" : "0 10px 20px rgba(120,92,66,0.06)",
                transition: "transform 0.2s ease, background 0.2s ease",
              }}
            >
              <div style={{ fontSize: "14px", fontWeight: 700, marginBottom: "6px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {chat.title || "New Chat"}
              </div>
              <div style={{ fontSize: "12px", color: index === currentChatIndex ? "rgba(255,255,255,0.8)" : "#7a6c5b" }}>
                {formatDate(chat.lastUpdated)}
              </div>
            </div>
          ))
        )}
      </div>

      <button
        onClick={onLogout}
        style={{
          padding: "12px 14px",
          background: "#e74c3c",
          color: "#fff",
          border: "none",
          borderRadius: "999px",
          cursor: "pointer",
          fontWeight: "700",
          width: "100%",
          boxSizing: "border-box",
          flexShrink: 0,
        }}
      >
        Logout
      </button>
    </div>
  );
}
