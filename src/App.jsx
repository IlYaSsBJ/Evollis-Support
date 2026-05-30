import { useState, useRef, useEffect } from "react";

// ─── Evollis context + routing system prompt ────────────────────────────────
const SYSTEM_PROMPT = `You are the official customer support agent for Evollis, a French fintech and circular economy company specializing in Device-as-a-Service (DaaS) platforms, long-term rentals, and subscription-based electronics/mobility programs.

## About Evollis
Evollis offers:
- **Device-as-a-Service (DaaS) & Subscription Plans**: Long-term leasing models for high-value consumer equipment (smartphones, IT gear, e-bikes, and home appliances) instead of outright purchasing.
- **Brand Partnerships**: We power the official subscription/rental platforms for major global brands and retailers, notably managing programs like **Samsung Renting** in France.
- **Lifecycle Management**: End-to-end management including initial instant credit/solvency risk assessment, recurring monthly subscription billing, insurance logistics, and product return, refurbishment, or recycling.
- **Support channels**: This chat interface, email at support@evollis.com, and phone support (Mon–Fri 9:00–18:00 CET).

## Subscription & Lifecycle Policies
- **Rental Terms**: Flexible lease terms typically spanning 12, 24, or 36 months depending on the specific partner brand contract.
- **Upgrades**: Customers enrolled in standard tech subscription programs can frequently upgrade to the latest device model every 12 or 24 months.
- **End-of-Contract**: When a lease ends, devices must be sent back to Evollis. Customers must remove all personal SIM/SD cards and perform a complete factory data wipe before shipping.
- **Damage & Theft**: Many premium lease programs bundle integrated device insurance. If a device is broken or stolen, it is subject to a maximum of 2 claim interventions per rolling 12-month period.
- **Legal Rights**: A strict 14-day withdrawal period applies to all newly signed lease contracts, allowing users to return equipment risk-free if they change their mind.
- **Data Compliance**: Headquartered in France, all customer credit evaluation documentation and contract data are fully GDPR compliant.

---

## YOUR TASK
For every user message, you must evaluate the input text, execute classification logic, and respond.

CRITICAL MECHANICAL REQUIREMENT: You must respond ONLY with a single, valid, parseable JSON object. Do NOT wrap your output in markdown code blocks like \`\`\`json ... \`\`\`. Do NOT include any introductory or concluding text outside the JSON object. Start directly with the character { and end directly with the character }.

Your response must strictly adhere to this exact JSON schema:
{
  "category": "BILLING" | "TECHNICAL" | "ORDER" | "GENERAL",
  "confidence": "high" | "medium" | "low",
  "response": "Your full helpful response here as plain text",
  "escalate": true | false,
  "escalation_reason": "brief reason string if escalate is true, else null",
  "quick_actions": ["Label 1", "Label 2"]
}

## Response guidelines by category

**CRITICAL RULE - INQUIRY VS. ACTION**: You must distinguish between general questions and definitive requests. If a user asks *how* a process works (e.g., "How do I cancel?", "What happens if my device breaks?"), explain the policy clearly and ask if they want to proceed. DO NOT escalate general inquiries. ONLY escalate when the user explicitly demands immediate action.

**JSON SYNTAX SAFETY**: Inside the "response" and "escalation_reason" text fields, never use raw double quotes ("") around words. If you need to quote something, use single quotes ('').

**BILLING**: Be precise about monthly recurring payment rules. Direct debits generally process on the 5th of each month. 
- *Inquiries*: If they ask about cancellation terms, explain the 14-day withdrawal period and standard lease lengths (12/24/36 months). 
- *Escalations*: Set "escalate" to true ONLY IF a user has a specific payment incident, requires a refund, or explicitly demands to terminate their contract right now. Remind them they can view invoices via their customer portal dashboard.

**TECHNICAL**: Provide basic step-by-step troubleshooting guidelines. 
- *Inquiries*: If they ask about insurance policies, explain the "2 interventions per year" limitation. 
- *Escalations*: If they are actively reporting a stolen or significantly damaged device right now, express immediate empathy, ask for their Device IMEI or Serial Number, and set "escalate" to true. If an issue requires deep hardware assessment → set "escalate" to true and "escalation_reason" to 'Needs L2 technical support'.

**ORDER**: Confirm shipping or return windows (e.g., reminding them to wipe data and remove SIMs when returning an old contract device). If the user asks for real-time tracking coordinates or custom logistics adjustments → set "escalate" to true and "escalation_reason" to 'No carrier DB access'.

**GENERAL**: Be professional, modern, and informative. Explain the financial and environmental benefits of the circular economy/rental asset ownership. Never escalate unless they explicitly demand human intervention.

**Escalation rule**: When "escalate" is true, it means a human agent should follow up. Be transparent with the user inside your text "response" field — tell them a specialist will review their contract details and contact them via email.

**Language rule**: Write the "response" text in the exact same language the user used (French or English). If the user uses any language other than English or French, reply politely in English stating that you only support English and French.

**Quick Actions rule**: You must always populate the "quick_actions" field with an array containing 2 to 3 short strings (labels under 25 characters), even during escalations or errors. Never leave it empty or null.`;

// ─── Category config ─────────────────────────────────────────────────────────
const CATEGORIES = {
  BILLING: {
    label: "Billing",
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.1)",
    icon: <svg style={{marginTop: "-2px"}} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>,
    description: "Subscription & payments",
  },
  TECHNICAL: {
    label: "Technical",
    color: "#3b82f6",
    bg: "rgba(59,130,246,0.1)",
    icon: <svg style={{marginTop: "-2px"}} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>,
    description: "Device & app support",
  },
  ORDER: {
    label: "Order",
    color: "#8b5cf6",
    bg: "rgba(139,92,246,0.1)",
    icon: <svg style={{marginTop: "-2px"}} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>,
    description: "Shipping & returns",
  },
  GENERAL: {
    label: "General",
    color: "#10b981",
    bg: "rgba(16,185,129,0.1)",
    icon: <svg style={{marginTop: "-2px"}} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>,
    description: "Info & plans",
  },
};

const SUGGESTED_QUESTIONS = [
  "How do I cancel my subscription?",
  "My device won't pair with the app",
  "I was charged twice this month",
  "What's included in Premium?",
  "How do I return a device?",
  "The app keeps crashing on iOS",
];

// ─── Safety / Context window limits ─────────────────────────────────────────
// Protects against token abuse by limiting per-message size and trimming
// the conversation history sent to the model (sliding window).
const MAX_INPUT_CHARS = 750; // per-message hard cap
const MAX_CONTEXT_CHARS = 8000; // total chars in the context window sent to the model
const MAX_CONTEXT_MESSAGES = 10; // max messages to include (fallback)

function trimMessagesForContext(messages) {
  // messages assumed to be array of { role, content }
  const out = [];
  let chars = 0;
  // iterate from the end and include until limits reached
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    const len = (m.content || "").length;
    if (out.length >= MAX_CONTEXT_MESSAGES) break;
    if (chars + len > MAX_CONTEXT_CHARS) break;
    out.push(m);
    chars += len;
  }
  // out is reversed (most recent first) -> reverse to chronological order
  return out.reverse();
}

// ─── API call ────────────────────────────────────────────────────────────────
async function callGemini(messages, apiKey) {
  // Trim the messages to a sliding context window to prevent token abuse
  const trimmed = trimMessagesForContext(messages);
  const geminiMessages = trimmed.map(m => ({
    role: m.role === "user" ? "user" : "model",
    parts: [{ text: m.content }]
  }));

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: geminiMessages,
      generationConfig: {
        maxOutputTokens: 1024,
        // ── ENFORCE JSON STRUCTURE AT THE ENGINE LAYER ──────────────────
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            category: { type: "STRING", enum: ["BILLING", "TECHNICAL", "ORDER", "GENERAL"] },
            confidence: { type: "STRING", enum: ["high", "medium", "low"] },
            response: { type: "STRING" },
            escalate: { type: "BOOLEAN" },
            escalation_reason: { type: "STRING", nullable: true },
            quick_actions: {
              type: "ARRAY",
              items: { type: "STRING" }
            }
          },
          required: ["category", "confidence", "response", "escalate", "quick_actions"]
        }
      }
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || `HTTP ${response.status}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

  try {
    // Because responseMimeType is set, text is guaranteed to be pure parseable JSON
    return JSON.parse(text);
  } catch {
    return {
      category: "GENERAL",
      confidence: "low",
      response: "Error decoding structured response data payload.",
      escalate: false,
      escalation_reason: null,
      quick_actions: [],
    };
  }
}
// ─── Components ──────────────────────────────────────────────────────────────
function CategoryBadge({ category, confidence }) {
  const cfg = CATEGORIES[category] || CATEGORIES.GENERAL;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        padding: "2px 8px",
        borderRadius: "99px",
        fontSize: "11px",
        fontWeight: 600,
        fontFamily: "'DM Mono', monospace",
        letterSpacing: "0.04em",
        color: cfg.color,
        background: cfg.bg,
        border: `1px solid ${cfg.color}30`,
      }}
    >
      {cfg.icon} {cfg.label.toUpperCase()}
      {confidence === "low" && (
        <span style={{ opacity: 0.6, fontSize: "10px" }}>?</span>
      )}
    </span>
  );
}

function EscalationNotice({ reason }) {
  return (
    <div
      style={{
        marginTop: "12px",
        padding: "10px 14px",
        borderRadius: "8px",
        background: "rgba(239,68,68,0.07)",
        border: "1px solid rgba(239,68,68,0.2)",
        fontSize: "13px",
        color: "#ef4444",
        display: "flex",
        alignItems: "flex-start",
        gap: "8px",
      }}
    >
      <span style={{ flexShrink: 0 }}>🔴</span>
      <span>
        <strong>Escalated to human agent.</strong>{" "}
        {reason
          ? `Reason: ${reason}. `
          : ""}
        A team member will follow up at your registered email within 4 business hours.
      </span>
    </div>
  );
}

function Message({ msg }) {
  const isUser = msg.role === "user";

  if (isUser) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginBottom: "16px",
        }}
      >
        <div
          style={{
            maxWidth: "70%",
            background: "#1a1a2e",
            color: "#e2e8f0",
            padding: "12px 16px",
            borderRadius: "18px 18px 4px 18px",
            fontSize: "14px",
            lineHeight: 1.6,
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          {msg.content}
        </div>
      </div>
    );
  }

  // assistant message
  const parsed = msg.parsed;
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "flex-start",
        marginBottom: "16px",
        gap: "10px",
      }}
    >
      {/* Avatar */}
      <img 
        src="/evollis-logo.svg" 
        alt="Evollis" 
        style={{
          width: "32px",
          height: "32px",
          borderRadius: "50%",
          flexShrink: 0,
          marginTop: "4px",
          objectFit: "contain"
        }}
      />

      <div style={{ maxWidth: "75%", minWidth: "0", width: "100%" }}>
        {/* Category badge */}
        {parsed && (
          <div style={{ marginBottom: "6px" }}>
            <CategoryBadge
              category={parsed.category}
              confidence={parsed.confidence}
            />
          </div>
        )}

        {/* Message bubble */}
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e8eaf0",
            padding: "14px 16px",
            borderRadius: "4px 18px 18px 18px",
            fontSize: "14px",
            lineHeight: 1.7,
            color: "#1e293b",
            fontFamily: "'DM Sans', sans-serif",
            boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
          }}
        >
          {msg.error ? (
            <span style={{ color: "#ef4444" }}>⚠️ {msg.content}</span>
          ) : (
            <span style={{ whiteSpace: "pre-wrap" }}>
              {parsed ? parsed.response : msg.content}
            </span>
          )}

          {/* Escalation notice */}
          {parsed?.escalate && (
            <EscalationNotice reason={parsed.escalation_reason} />
          )}
        </div>

        {/* Quick actions */}
        {parsed?.quick_actions?.length > 0 && (
          <div
            style={{
              marginTop: "8px",
              display: "flex",
              flexWrap: "wrap",
              gap: "6px",
            }}
          >
            {parsed.quick_actions.map((action, i) => (
              <button
                key={i}
                onClick={() => msg.onQuickAction && msg.onQuickAction(action)}
                style={{
                  padding: "5px 12px",
                  borderRadius: "99px",
                  border: "1px solid #e2e8f0",
                  background: "#f8fafc",
                  color: "#475569",
                  fontSize: "12px",
                  fontFamily: "'DM Sans', sans-serif",
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = "#f1f5f9";
                  e.target.style.borderColor = "#94a3b8";
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = "#f8fafc";
                  e.target.style.borderColor = "#e2e8f0";
                }}
              >
                {action}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div style={{ display: "flex", gap: "10px", marginBottom: "16px" }}>
      {/* Matched Avatar Logo to prevent layout shifts */}
      <img 
        src="/evollis-logo.svg" 
        alt="Evollis" 
        style={{
          width: "32px",
          height: "32px",
          borderRadius: "50%",
          flexShrink: 0,
          marginTop: "4px",
          objectFit: "contain"
        }}
      />
      <div
        style={{
          background: "#ffffff",
          border: "1px solid #e8eaf0",
          padding: "14px 18px",
          borderRadius: "4px 18px 18px 18px",
          display: "flex",
          alignItems: "center",
          gap: "5px",
          boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
        }}
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: "7px",
              height: "7px",
              borderRadius: "50%",
              background: "#94a3b8",
              animation: "bounce 1.2s infinite",
              animationDelay: `${i * 0.2}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Main App ────────────────────────────────────────────────────────────────
export default function App() {
  const [apiKey, setApiKey] = useState(
    () => localStorage.getItem("evollis_apikey") || ""
  );
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [apiKeySet, setApiKeySet] = useState(
    () => !!localStorage.getItem("evollis_apikey")
  );
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [inputError, setInputError] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSetApiKey = () => {
    const key = apiKeyInput.trim();
    if (!key) {
      alert("Please enter a valid Google Gemini API key");
      return;
    }
    localStorage.setItem("evollis_apikey", key);
    setApiKey(key);
    setApiKeySet(true);
  };

  const handleQuickAction = (text) => {
    setInput(text);
    inputRef.current?.focus();
  };

  const handleSend = async (textOverride) => {
    const text = (textOverride || input).trim();
    if (!text || loading) return;
    // Input length protection
    if (text.length > MAX_INPUT_CHARS) {
      setInputError(`Input too long — maximum ${MAX_INPUT_CHARS} characters.`);
      return;
    }
    setInputError("");
    setInput("");

    const userMsg = { role: "user", content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setLoading(true);

    // Build history for API (only role + content)
    const apiMessages = newMessages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    try {
      const parsed = await callGemini(apiMessages, apiKey);
      // Clear any input error after successful call
      setInputError("");
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: parsed.response,
          parsed,
          onQuickAction: handleQuickAction,
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Error: ${err.message}. Please check your API key and try again.`,
          error: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isSendDisabled = loading || !input.trim() || input.length > MAX_INPUT_CHARS;

  // ── API key setup screen ──────────────────────────────────────────────────
  if (!apiKeySet) {
    return (
      <>
        <style>{globalStyles}</style>
        <div
          style={{
            minHeight: "100vh",
            background: "transparent",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: "20px",
              padding: "48px",
              maxWidth: "460px",
              width: "100%",
              boxShadow: "0 8px 40px rgba(0,0,0,0.1)",
            }}
          >
            <img
              src="/evollis-logo.svg"
              alt="Evollis Logo"
              style={{
                width: "150px",
                height: "56px",
                marginBottom: "24px",
                objectFit: "contain",
              }}
            />
            <h1
              style={{
                fontSize: "24px",
                fontWeight: 600,
                color: "#0f172a",
                margin: "0 0 8px",
              }}
            >
              Evollis Support
            </h1>
            <p style={{ color: "#64748b", fontSize: "14px", margin: "0 0 32px", lineHeight: 1.6 }}>
              AI-powered first-line customer support. Enter your Google Gemini API key to get started.
            </p>
            <label style={{ fontSize: "13px", fontWeight: 500, color: "#374151", display: "block", marginBottom: "8px" }}>
              Google Gemini API Key
            </label>
            <input
              type="password"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSetApiKey()}
              placeholder="AIza..."
              style={{
                width: "100%",
                padding: "12px 14px",
                borderRadius: "10px",
                border: "1.5px solid #e2e8f0",
                fontSize: "14px",
                fontFamily: "'DM Mono', monospace",
                outline: "none",
                marginBottom: "16px",
                boxSizing: "border-box",
                transition: "border-color 0.15s",
              }}
              onFocus={(e) => (e.target.style.borderColor = "rgb(71, 209, 202)")}
              onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
            />
            <button
              onClick={handleSetApiKey}
              style={{
                width: "100%",
                padding: "13px",
                background: "rgb(71, 209, 202)",
                color: "#fff",
                border: "none",
                borderRadius: "10px",
                fontSize: "15px",
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              Start Support Session →
            </button>
            <p style={{ fontSize: "12px", color: "#94a3b8", marginTop: "16px", textAlign: "center" }}>
              Your key is stored only in your browser's localStorage and sent directly to Google.
            </p>
          </div>
        </div>
      </>
    );
  }

  // ── Main chat UI ──────────────────────────────────────────────────────────
  return (
    <>
      <style>{globalStyles}</style>
      <div
        className="evollis-app-shell"
        style={{
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          background: "transparent",
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        {/* Header */}
        <div
          className="evollis-header"
          style={{
            background: "#ffffff",
            borderBottom: "1px solid #e8eaf0",
            padding: "0 24px",
            height: "64px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
            boxShadow: "0 1px 8px rgba(0,0,0,0.05)",
          }}
        >
          <div className="evollis-header-left" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <img 
              src="/evollis-logo.svg" 
              alt="Evollis" 
              style={{ width: "80px", height: "36px", borderRadius: "10px", objectFit: "contain" }} 
            />
            <div>
              <div style={{ fontWeight: 600, fontSize: "15px", color: "#0f172a", lineHeight: 1 }}>
                Evollis Support
              </div>
              <div style={{ fontSize: "12px", color: "#10b981", marginTop: "3px", display: "flex", alignItems: "center", gap: "4px" }}>
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#10b981", display: "inline-block" }} />
                Online · AI Agent
              </div>
            </div>
          </div>

          {/* Category legend */}
          <div className="evollis-header-legend" style={{ display: "flex", gap: "12px" }}>
            {Object.entries(CATEGORIES).map(([key, cfg]) => (
              <div
                key={key}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                  fontSize: "12px",
                  color: "#64748b",
                }}
              >
                  <span style={{ display: "flex", color: "#94a3b8" }}>{cfg.icon}</span>
                  <span style={{ color: "#64748b", fontWeight: 500 }}>{cfg.label}</span>
              </div>
            ))}
          </div>

          <button
            onClick={() => {
              localStorage.removeItem("evollis_apikey");
              setApiKeySet(false);
              setApiKey("");
              setMessages([]);
            }}
            className="evollis-reset-btn"
            style={{
              padding: "6px 12px",
              background: "rgba(49, 97, 110, 0.1)",
              border: "1px solid rgba(49, 97, 110, 0.2)",
              borderRadius: "8px",
              fontSize: "12px",
              fontWeight: 500,
              color: "rgb(49, 97, 110)",
              cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            Reset key
          </button>
        </div>

        {/* Messages area */}
        <div
          className="evollis-messages"
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "24px",
            maxWidth: "860px",
            width: "100%",
            margin: "0 auto",
            boxSizing: "border-box",
          }}
        >
          {messages.length === 0 && (
            <div
              style={{
                textAlign: "center",
                padding: "60px 24px",
                color: "#94a3b8",
              }}
            >
              <div style={{ display: "flex", justifyContent: "center", marginBottom: "20px", color: "rgb(71, 209, 202)" }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                </svg>
              </div>
              <h2 style={{ fontSize: "20px", fontWeight: 600, color: "#334155", marginBottom: "8px" }}>
                How can we help you today?
              </h2>
              <p style={{ fontSize: "14px", marginBottom: "32px", color: "#64748b" }}>
                Ask anything about your Evollis subscription, devices, or orders.
              </p>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "10px",
                  justifyContent: "center",
                  maxWidth: "600px",
                  margin: "0 auto",
                }}
              >
                {SUGGESTED_QUESTIONS.map((q, i) => (
                  <button
                    key={i}
                    className="evollis-suggestion"
                    onClick={() => handleSend(q)}
                    style={{
                      padding: "10px 18px",
                      borderRadius: "99px",
                      border: "1.5px solid #e2e8f0",
                      background: "#fff",
                      color: "#475569",
                      fontSize: "13px",
                      fontFamily: "'DM Sans', sans-serif",
                      cursor: "pointer",
                      transition: "all 0.15s",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.borderColor = "rgb(71, 209, 202)";
                      e.target.style.color = "rgb(49, 97, 110)";
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.borderColor = "#e2e8f0";
                      e.target.style.color = "#475569";
                    }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <Message
              key={i}
              msg={{
                ...msg,
                onQuickAction: handleQuickAction,
              }}
            />
          ))}

          {loading && <TypingIndicator />}
          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div
          className="evollis-input-footer"
          style={{
            background: "#ffffff",
            borderTop: "1px solid #e8eaf0",
            padding: "16px 24px",
            flexShrink: 0,
          }}
        >
          <div
            className="evollis-input-row"
            style={{
              maxWidth: "860px",
              margin: "0 auto",
              display: "flex",
              gap: "12px",
              alignItems: "flex-end",
            }}
          >
            <div className="evollis-composer" style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", position: "relative" }}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => {
                  const v = e.target.value;
                  setInput(v);
                  // live client-side validation
                  if (v.length > MAX_INPUT_CHARS) {
                    setInputError(`Input too long — maximum ${MAX_INPUT_CHARS} characters.`);
                  } else {
                    setInputError("");
                  }
                }}
                onKeyDown={handleKeyDown}
                placeholder="Type your question… (Enter to send, Shift+Enter for new line)"
                rows={1}
                style={{
                  width: "100%",
                  minHeight: "48px",
                  padding: "13px 16px",
                  borderRadius: "12px",
                  border: "1.5px solid #e2e8f0",
                  fontSize: "14px",
                  fontFamily: "'DM Sans', sans-serif",
                  outline: "none",
                  resize: "none",
                  lineHeight: 1.5,
                  transition: "border-color 0.15s",
                  maxHeight: "120px",
                  overflowY: "auto",
                }}
                onFocus={(e) => (e.target.style.borderColor = "rgb(71, 209, 202)")}
                onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
                onInput={(e) => {
                  e.target.style.height = "auto";
                  e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
                }}
              />

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "6px" }}>
                <div style={{ minHeight: "18px" }}>
                  {inputError && (
                    <div style={{ color: "#ef4444", fontSize: "12px" }}>
                      {inputError}
                    </div>
                  )}
                </div>

                <div
                  style={{
                    fontSize: "12px",
                    fontFamily: "'DM Mono', monospace",
                    color:
                      input.length > MAX_INPUT_CHARS
                        ? "#ef4444"
                        : MAX_INPUT_CHARS - input.length <= 100
                        ? "#f59e0b"
                        : "#94a3b8",
                    marginLeft: "12px",
                  }}
                >
                  {Math.max(0, MAX_INPUT_CHARS - input.length)} chars left
                </div>
              </div>
            </div>
            <button
              onClick={() => handleSend()}
              disabled={isSendDisabled}
              className="evollis-send-button"
              style={{
                width: "46px",
                height: "46px",
                borderRadius: "12px",
                background: isSendDisabled ? "#e2e8f0" : "rgb(71, 209, 202)",
                border: "none",
                cursor: isSendDisabled ? "default" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                transition: "background 0.15s",
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 19V5"
                  stroke={isSendDisabled ? "#94a3b8" : "#fff"}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M5 12l7-7 7 7"
                  stroke={isSendDisabled ? "#94a3b8" : "#fff"}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
          <div
            style={{
              textAlign: "center",
              marginTop: "10px",
              fontSize: "11px",
              color: "#cbd5e1",
              fontFamily: "'DM Mono', monospace",
            }}
          >
            Powered by Gemini · Evollis Customer Support v1.0
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Global styles ────────────────────────────────────────────────────────────
const globalStyles = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { 
    background-color: rgb(220, 241, 246);
    background-image: radial-gradient(rgba(49, 97, 110, 0.15) 1.5px, transparent 2.5px);
    background-size: 20px 20px;
    background-position: 0 0;
  }
  input:focus, textarea:focus { outline: none; border-color: rgb(71, 209, 202) !important; box-shadow: 0 0 0 3px rgba(71, 209, 202, 0.15) !important; transition: all 0.2s ease; }
  button:hover:not(:disabled) { filter: brightness(0.95); opacity: 0.95; transition: all 0.2s ease; }
  @keyframes bounce {
    0%, 60%, 100% { transform: translateY(0); }
    30% { transform: translateY(-6px); }
  }
  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 3px; }
  ::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
  textarea::-webkit-scrollbar { display: none; }
  textarea { -ms-overflow-style: none; scrollbar-width: none; }

  @media (max-width: 640px) {
    body {
      background-size: 16px 16px;
    }

    .evollis-app-shell {
      height: 100dvh;
    }

    .evollis-header {
      padding: 10px 12px;
      height: auto;
      min-height: 64px;
      align-items: flex-start;
      gap: 10px;
      flex-wrap: wrap;
    }

    .evollis-header-left {
      flex: 1 1 auto;
      min-width: 0;
    }

    .evollis-header-legend {
      display: none !important;
    }

    .evollis-reset-btn {
      margin-left: auto;
    }

    .evollis-messages {
      padding: 16px 12px;
    }

    .evollis-input-footer {
      padding: 12px;
    }

    .evollis-input-row {
      gap: 10px;
      align-items: stretch;
      flex-direction: column;
    }

    .evollis-composer {
      width: 100%;
    }

    .evollis-send-button {
      width: 100% !important;
      height: 48px !important;
      border-radius: 14px !important;
    }

    .evollis-input-footer textarea {
      min-height: 52px;
      font-size: 16px;
    }

    .evollis-suggestion {
      width: 100%;
      justify-content: center;
    }
  }
`;
