import { useState } from "react";

export default function ProverbCard({ data, onVote, userId, keyword }) {
  const [votedType, setVotedType] = useState(null);
  const keywords = String(data.keywords || "").split(",").filter(Boolean);

  const handleVote = async (type) => {
    setVotedType(type);
    
    if (onVote) {
      await onVote({
        user_id: userId || "default",
        proverb_id: data.id || data.proverb_english,
        keyword: keyword || "search",
        vote_type: type
      });
    }
  };

  return (
    <div
      style={{
        background: "#fff",
        padding: "24px",
        borderRadius: "24px",
        marginBottom: "18px",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
        border: "1px solid #e5e5e5",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "14px", marginBottom: "16px" }}>
        <div>
          <p style={{ margin: "0 0 8px 0", fontSize: "18px", lineHeight: 1.4, fontWeight: 700, color: "#ff6b35" }}>
            {data.proverb}
          </p>
          <p style={{ margin: 0, fontSize: "15px", color: "#666", fontStyle: "italic" }}>
            "{data.proverb_english || "..."}"
          </p>
        </div>
        {data.theme && (
          <span
            style={{
              alignSelf: "flex-start",
              padding: "8px 12px",
              borderRadius: "999px",
              background: "rgba(255, 107, 53, 0.15)",
              color: "#ff6b35",
              fontSize: "12px",
              fontWeight: 700,
            }}
          >
            {data.theme}
          </span>
        )}
      </div>

      <p style={{ margin: "0 0 14px", fontSize: "15px", lineHeight: 1.8, color: "#333" }}>
        <strong>What it means:</strong> {data.meaning}
      </p>

      <p style={{ margin: "0 0 18px", fontSize: "15px", lineHeight: 1.8, color: "#555" }}>
        <strong>When to use it:</strong> {data.context}
      </p>

      {keywords.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginBottom: "18px" }}>
          {keywords.map((k, i) => (
            <span
              key={i}
              style={{
                padding: "8px 12px",
                borderRadius: "999px",
                background: "rgba(255, 107, 53, 0.1)",
                color: "#ff6b35",
                fontSize: "12px",
              }}
            >
              {k.trim()}
            </span>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "12px" }}>
        <button
          onClick={() => handleVote("upvote")}
          style={{
            padding: "8px 16px",
            background: votedType === "upvote" ? "#27ae60" : "#f0f0f0",
            color: votedType === "upvote" ? "#fff" : "#333",
            border: "1px solid #ddd",
            borderRadius: "6px",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: "14px",
            transition: "all 0.2s"
          }}
        >
          👍 Helpful
        </button>
        
        <button
          onClick={() => handleVote("downvote")}
          style={{
            padding: "8px 16px",
            background: votedType === "downvote" ? "#e74c3c" : "#f0f0f0",
            color: votedType === "downvote" ? "#fff" : "#333",
            border: "1px solid #ddd",
            borderRadius: "6px",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: "14px",
            transition: "all 0.2s"
          }}
        >
          👎 Not Helpful
        </button>
      </div>

      {data.score && (
        <p style={{ marginTop: "12px", color: "#ff6b35", fontSize: "13px" }}>
          ✓ Relevance: {Math.round(data.score * 100)}%
        </p>
      )}
    </div>
  );
}
