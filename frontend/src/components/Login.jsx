import { useEffect, useRef, useState } from "react";
import "../styles/user-dashboard.css";
import { API_BASE_URL } from "../api/config";

export default function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const googleButtonRef = useRef(null);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

  useEffect(() => {
    if (!googleClientId || !googleButtonRef.current) return;

    const handleGoogleCredential = async (response) => {
      if (!response?.credential) {
        setError("Google sign-in failed. Please try again.");
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const authResponse = await fetch(`${API_BASE_URL}/auth/google`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ credential: response.credential }),
        });

        const data = await authResponse.json();
        if (!authResponse.ok || !data.success) {
          throw new Error(data.detail || "Google login failed");
        }

        onLogin({
          email: data.email,
          token: data.token,
          role: data.role,
          user_id: data.user_id || data.email,
          name: data.name || "",
          picture: data.picture || "",
          provider: "google",
        });
      } catch (err) {
        setError(err.message || "Google authentication failed");
      } finally {
        setLoading(false);
      }
    };

    const initializeGoogle = () => {
      if (!window.google?.accounts?.id || !googleButtonRef.current) return;
      googleButtonRef.current.innerHTML = "";
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: handleGoogleCredential,
      });
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: "outline",
        size: "large",
        width: 320,
      });
    };

    if (window.google?.accounts?.id) {
      initializeGoogle();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = initializeGoogle;
    document.body.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [googleClientId, onLogin]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!email || !password) {
      setError("Email and password are required.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        throw new Error("Login failed");
      }

      const data = await response.json();

      if (data.success) {
        onLogin({
          email: data.email,
          token: data.token,
          role: data.role,
          user_id: data.user_id || email,
        });
      } else {
        setError("Login failed. Please check your credentials.");
      }
    } catch (err) {
      setError(err.message || "An error occurred during login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-copy">
          <p className="user-eyebrow">Telugu Proverbs Platform</p>
          <h1>Welcome Back</h1>
          <p className="user-subtitle">
            Use Google Sign-In for user access. Use email/password only for admin login.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="annotate-field">
            <label>Admin Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              className="user-input"
              placeholder="admin@email.com"
            />
          </div>

          <div className="annotate-field">
            <label>Admin Password</label>
            <div className="auth-password-wrap">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="user-input"
                placeholder="Enter admin password"
              />
              <button
                type="button"
                className="auth-password-toggle"
                onClick={() => setShowPassword((prev) => !prev)}
                disabled={loading}
              >
                {showPassword ? "Hide" : "View"}
              </button>
            </div>
          </div>

          {error ? <div className="annotate-status is-error">{error}</div> : null}

          <button type="submit" disabled={loading} className="user-btn user-btn-primary auth-submit-btn">
            {loading ? "Please wait..." : "Admin Login"}
          </button>
        </form>

        {googleClientId ? (
          <div className="auth-google-wrap">
            <div className="auth-divider">
              <span>or continue with</span>
            </div>
            <div ref={googleButtonRef} className="auth-google-btn" />
          </div>
        ) : null}
      </div>
    </div>
  );
}
