/* src/index.js */
import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import "./global.css";
import App from "./App";
import Admin from "./admin";

const ADMIN_PASSWORD = "12345678";
const SESSION_KEY = "chatbot_admin_auth";

function Root() {
  const [hash, setHash] = useState(window.location.hash || "#/");
  const [adminAuthed, setAdminAuthed] = useState(
    sessionStorage.getItem(SESSION_KEY) === "true"
  );
  const [theme, setTheme] = useState("dark");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    const onHash = () => setHash(window.location.hash || "#/");
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const isAdmin = hash.startsWith("#/admin");

  const handleAdminLogin = (password) => {
    if (password === ADMIN_PASSWORD) {
      sessionStorage.setItem(SESSION_KEY, "true");
      setAdminAuthed(true);
      return true;
    }
    return false;
  };

  const handleAdminLogout = () => {
    sessionStorage.removeItem(SESSION_KEY);
    setAdminAuthed(false);
    window.location.hash = "#/";
  };

  const toggleTheme = () =>
    setTheme((t) => (t === "dark" ? "light" : "dark"));

  if (isAdmin) {
    if (!adminAuthed) {
      return (
        <LoginGate onLogin={handleAdminLogin} theme={theme} toggleTheme={toggleTheme} />
      );
    }
    return <Admin onLogout={handleAdminLogout} theme={theme} toggleTheme={toggleTheme} />;
  }

  return <App theme={theme} toggleTheme={toggleTheme} />;
}

function LoginGate({ onLogin, theme, toggleTheme }) {
  const [pw, setPw] = useState("");
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);

  const submit = () => {
    const ok = onLogin(pw);
    if (!ok) {
      setError(true);
      setShake(true);
      setPw("");
      setTimeout(() => setShake(false), 500);
    }
  };

  const onKey = (e) => {
    if (e.key === "Enter") submit();
    if (error) setError(false);
  };

  return (
    <div className="login-root">
      <div className={`login-card${shake ? " shake" : ""}`}>
        <div className="login-logo-wrap">
          <img src="/chat_p.png" alt="Chatbot Mentoring UMN" className="login-logo" />
        </div>
        <h2 className="login-title">Admin Panel</h2>
        <p className="login-sub">Masukkan password untuk melanjutkan</p>
        <input
          type="password"
          className={`login-input${error ? " error" : ""}`}
          placeholder="Password"
          value={pw}
          onChange={(e) => { setPw(e.target.value); setError(false); }}
          onKeyDown={onKey}
          autoFocus
        />
        {error && <p className="login-error">Password salah. Coba lagi.</p>}
        <button className="login-btn" onClick={submit}>Masuk</button>
        <a href="#/" className="login-back">← Kembali ke chat</a>
      </div>
      <style>{`
        .login-root {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-base);
          padding: var(--space-4);
        }
        .login-card {
          background: var(--bg-glass);
          border: 2px solid var(--border-glass);
          border-radius: var(--border-radius-xl);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          box-shadow: var(--shadow-glass);
          padding: var(--space-10) var(--space-8);
          width: 100%;
          max-width: 380px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--space-4);
        }
        .login-card.shake {
          animation: shake 0.45s ease;
        }
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-6px); }
          80% { transform: translateX(6px); }
        }
        .login-logo-wrap {
          width: 72px;
          height: 72px;
          border-radius: var(--border-radius-full);
          border: 2px solid var(--border-glass);
          background: var(--bg-glass);
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }
        .login-logo {
          width: 52px;
          height: 52px;
          object-fit: contain;
        }
        .login-title {
          font-size: var(--text-xl);
          font-weight: var(--font-bold);
          color: var(--text-primary);
          letter-spacing: var(--tracking-tight);
        }
        .login-sub {
          font-size: var(--text-sm);
          color: var(--text-muted);
          letter-spacing: var(--tracking-wide);
        }
        .login-input {
          width: 100%;
          background: var(--bg-glass);
          border: 2px solid var(--border-glass);
          border-radius: var(--border-radius-md);
          padding: var(--space-3) var(--space-4);
          font-size: var(--text-sm);
          color: var(--text-primary);
          font-family: var(--font-primary);
          transition: all var(--transition-normal);
          backdrop-filter: blur(8px);
          outline: none;
        }
        .login-input:focus {
          border-color: var(--primary);
          box-shadow: 0 0 0 3px var(--primary-glow);
        }
        .login-input.error {
          border-color: var(--danger);
          box-shadow: 0 0 0 3px rgba(239,68,68,0.2);
        }
        .login-input::placeholder { color: var(--text-muted); }
        .login-error {
          font-size: var(--text-xs);
          color: var(--danger);
          letter-spacing: var(--tracking-wide);
          align-self: flex-start;
        }
        .login-btn {
          width: 100%;
          background: var(--primary);
          color: var(--text-on-primary);
          border: 2px solid transparent;
          border-radius: var(--border-radius-md);
          padding: var(--space-3) var(--space-6);
          font-size: var(--text-sm);
          font-weight: var(--font-semibold);
          letter-spacing: var(--tracking-wide);
          cursor: pointer;
          transition: all var(--transition-normal);
          font-family: var(--font-primary);
        }
        .login-btn:hover {
          background: var(--primary-hover);
          box-shadow: 0 0 16px var(--primary-glow);
          transform: translateY(-1px);
        }
        .login-back {
          font-size: var(--text-xs);
          color: var(--text-muted);
          text-decoration: none;
          letter-spacing: var(--tracking-wide);
          transition: color var(--transition-fast);
        }
        .login-back:hover { color: var(--primary); }
      `}</style>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<React.StrictMode><Root /></React.StrictMode>);