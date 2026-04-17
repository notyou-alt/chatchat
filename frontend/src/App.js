import { useState } from "react";
import axios from "axios";
import Admin from "./admin";
import "./app.css";

import happy from "./assets/happy.svg";
import neutral from "./assets/neutral.svg";
import serious from "./assets/serious.svg";
import cheerful from "./assets/cheerful.svg";
import shy from "./assets/shy.svg";
import angry from "./assets/angry.svg";

function App() {
  const [message, setMessage] = useState("");
  const [response, setResponse] = useState("");
  const [score, setScore] = useState(0);
  const [emotion, setEmotion] = useState("neutral");

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");

  const emotionMap = { happy, neutral, serious, cheerful, shy, angry };

  const sendMessage = async () => {
    if (!message.trim()) return;

    const res = await axios.post("http://localhost:3001/chat", {
      message,
    });

    setResponse(res.data.response);
    setScore(res.data.score);
    setEmotion(res.data.emotion);
    setMessage("");
  };

  const handleLogin = () => {
    if (password === "12345678") setIsAuthenticated(true);
    else alert("Password salah!");
  };

  const isAdminPage = window.location.pathname === "/admin";

  if (isAdminPage) {
    if (!isAuthenticated) {
      return (
        <div className="app-container">
          <div className="app-box">
            <h2>Admin Access</h2>
            <input
              type="password"
              placeholder="Password..."
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <br /><br />
            <button className="btn-success" onClick={handleLogin}>
              Masuk
            </button>
          </div>
        </div>
      );
    }

    return <Admin />;
  }

  return (
    <div className="app-container">
      <div className="app-box">

        <h1>Chatbot Mentoring</h1>

        <button className="adminButton" onClick={() => (window.location.href = "/admin")}>
          Open The Core
        </button>

        <img className="maskot" src={emotionMap[emotion]} />

        <div className="input-row">
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Tanya sesuatu..."
          />
          <button className="btn-success" onClick={sendMessage}>
            Tanya
          </button>
        </div>

        <div className="response-box fade-in">
          <h3>Jawaban</h3>
          <p>{response}</p>

          <h4>Score: {score}</h4>
        </div>

      </div>
    </div>
  );
}

export default App;