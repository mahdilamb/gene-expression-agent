import chatSvg from "./assets/chat.svg";
import { ChatInput } from "./components/ChatInput";
import { MessageList } from "./components/MessageList";
import { useChat } from "./hooks/useChat";
import { useSession } from "./hooks/useSession";
import { ThemeContext, useTheme, useThemeProvider } from "./hooks/useTheme";
import { ShowThoughtsContext, useShowThoughts, useShowThoughtsProvider } from "./hooks/useShowThoughts";

function AppInner() {
  const { sessionId, messages, loading, newSession, addMessage, updateLastAssistant } =
    useSession();
  const { send, streaming } = useChat({ sessionId, addMessage, updateLastAssistant });
  const { theme, toggle } = useTheme();
  const { showThoughts, toggleThoughts } = useShowThoughts();

  return (
    <div className="app">
      <header className="owkin-header">
        <h1 className="brand">OWKIN <span className="sep">|</span> <img src={chatSvg} alt="chat" /></h1>
        <div className="header-actions">
          <button
            className="theme-toggle-btn"
            onClick={toggleThoughts}
            aria-label={showThoughts ? "Hide thoughts" : "Show thoughts"}
            title={showThoughts ? "Hide thoughts" : "Show thoughts"}
          >
            {showThoughts ? "🧠" : "💭"}
          </button>
          <button
            className="theme-toggle-btn"
            onClick={toggle}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark" ? "☀️" : "🌙"}
          </button>
          <button className="new-session-btn" onClick={newSession} disabled={streaming}>
            New session
          </button>
        </div>
      </header>

      <main className="chat-area">
        {loading ? (
          <p className="loading">Loading session...</p>
        ) : (
          <MessageList messages={messages} streaming={streaming} />
        )}
      </main>

      <footer className="chat-footer">
        <ChatInput onSend={send} disabled={streaming || loading} />
      </footer>
    </div>
  );
}

export default function App() {
  const themeValue = useThemeProvider();
  const thoughtsValue = useShowThoughtsProvider();
  return (
    <ThemeContext.Provider value={themeValue}>
      <ShowThoughtsContext.Provider value={thoughtsValue}>
        <AppInner />
      </ShowThoughtsContext.Provider>
    </ThemeContext.Provider>
  );
}
