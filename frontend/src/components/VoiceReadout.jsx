import { useEffect, useState, useRef, useCallback } from "react";
import { Volume2, VolumeX, RotateCcw, Square, ShieldAlert, ShieldCheck, CheckCircle2 } from "lucide-react";

/**
 * SafePay Voice Guard: Audio Readout Component
 * Speaks the transaction details aloud for Medium and High risk transfers.
 */
export default function VoiceReadout({
  riskLevel = "HIGH",
  amount = 0,
  payeeName = "Recipient",
  reasons = [],
  autoPlay = true,
  compact = false,
}) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [supported, setSupported] = useState(true);
  const [hasStarted, setHasStarted] = useState(false);
  const utteranceRef = useRef(null);

  const isHigh = riskLevel === "HIGH";
  const isMedium = riskLevel === "MEDIUM";
  const isSuccess = riskLevel === "SUCCESS";

  const formattedAmount = Number(amount || 0).toLocaleString("en-IN");

  // Construct clear, authoritative speech text
  const script = isHigh
    ? `Security Alert: High Risk Transaction Detected. You are initiating a high-value transfer of ${formattedAmount} rupees to ${payeeName}. A mandatory thirty-second cooling-off delay and one-time password verification are required to protect your funds.`
    : isMedium
    ? `Notice: Medium Risk Transaction. You are authorizing a transfer of ${formattedAmount} rupees to ${payeeName}. Please verify the recipient identity and account recap carefully before confirming.`
    : `Transfer dispatched successfully. ${formattedAmount} rupees has been sent to ${payeeName}.`;

  const stop = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, []);

  const speak = useCallback(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setSupported(false);
      return;
    }

    // Stop previous utterance
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(script);
    utterance.rate = 0.95; // Slightly measured rate for clear comprehension
    utterance.pitch = 1.0;
    utterance.lang = "en-IN"; // English (India) preference

    // Attempt to pick an optimal English voice
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      const preferred =
        voices.find((v) => v.lang === "en-IN") ||
        voices.find((v) => v.lang.startsWith("en") && v.name.includes("Natural")) ||
        voices.find((v) => v.lang.startsWith("en"));
      if (preferred) utterance.voice = preferred;
    }

    utterance.onstart = () => {
      setIsSpeaking(true);
      setHasStarted(true);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
    };

    utterance.onerror = (e) => {
      console.warn("SpeechSynthesis error:", e);
      setIsSpeaking(false);
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [script]);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setSupported(false);
      return;
    }

    // Ensure voices are loaded
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = () => {};
    }

    if (autoPlay) {
      // Small timeout to allow component mount & page transition to settle
      const timer = setTimeout(() => {
        speak();
      }, 400);
      return () => {
        clearTimeout(timer);
        stop();
      };
    }

    return () => {
      stop();
    };
  }, [autoPlay, speak, stop]);

  if (!supported) {
    return null; // Gracefully degrade if browser doesn't support Web Speech API
  }

  const themeColor = isHigh
    ? "var(--color-danger)"
    : isMedium
    ? "var(--color-caution)"
    : "var(--color-safe)";

  const themeBg = isHigh
    ? "rgba(255, 59, 48, 0.05)"
    : isMedium
    ? "rgba(255, 149, 0, 0.05)"
    : "rgba(52, 199, 89, 0.05)";

  const themeBorder = isHigh
    ? "rgba(255, 59, 48, 0.2)"
    : isMedium
    ? "rgba(255, 149, 0, 0.2)"
    : "rgba(52, 199, 89, 0.2)";

  const pulseAnimation = isHigh
    ? "voice-pulse-glow 1.5s infinite"
    : "voice-pulse-glow-caution 1.5s infinite";

  return (
    <div
      style={{
        backgroundColor: themeBg,
        border: `1px solid ${themeBorder}`,
        borderRadius: "var(--radius-md)",
        padding: compact ? "12px 16px" : "16px 20px",
        marginBottom: 20,
        transition: "all 0.2s ease",
      }}
    >
      {/* ── Top Header Row ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              backgroundColor: themeBg,
              border: `1px solid ${themeBorder}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: themeColor,
              animation: isSpeaking ? pulseAnimation : "none",
            }}
          >
            {isSpeaking ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </div>
          <div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                color: themeColor,
              }}
            >
              SafePay Voice Guard • Audio Readout
            </div>
            <div style={{ fontSize: 11, color: "var(--color-body-muted)" }}>
              {isSpeaking
                ? "Reading out transaction details..."
                : hasStarted
                ? "Audio alert completed"
                : "Audible transaction alert"}
            </div>
          </div>
        </div>

        {/* Live Audio Equalizer Wave Animation */}
        <div style={{ display: "flex", alignItems: "center", gap: 3, height: 26 }}>
          {[
            "soundwave-bar-1 0.8s ease-in-out infinite",
            "soundwave-bar-2 0.7s ease-in-out infinite",
            "soundwave-bar-3 0.9s ease-in-out infinite",
            "soundwave-bar-4 0.6s ease-in-out infinite",
          ].map((anim, idx) => (
            <div
              key={idx}
              style={{
                width: 3,
                backgroundColor: themeColor,
                borderRadius: 2,
                height: isSpeaking ? undefined : 6,
                animation: isSpeaking ? anim : "none",
                transition: "height 0.2s ease",
              }}
            />
          ))}
        </div>
      </div>

      {/* ── Spoken Transcript Box ── */}
      <div
        style={{
          backgroundColor: "rgba(255, 255, 255, 0.7)",
          border: "1px solid var(--color-hairline)",
          borderRadius: "var(--radius-sm)",
          padding: "10px 14px",
          marginBottom: 12,
          fontSize: 13,
          lineHeight: 1.45,
          color: "var(--color-ink)",
          fontStyle: "italic",
        }}
      >
        "{script}"
      </div>

      {/* ── Audio Control Buttons ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end" }}>
        {isSpeaking ? (
          <button
            type="button"
            className="button-pearl-capsule"
            onClick={stop}
            style={{
              fontSize: 12,
              padding: "4px 12px",
              display: "flex",
              alignItems: "center",
              gap: 6,
              color: "var(--color-danger)",
              borderColor: "rgba(255, 59, 48, 0.3)",
            }}
          >
            <Square size={13} />
            Stop Audio
          </button>
        ) : (
          <button
            type="button"
            className="button-pearl-capsule"
            onClick={speak}
            style={{
              fontSize: 12,
              padding: "4px 12px",
              display: "flex",
              alignItems: "center",
              gap: 6,
              color: themeColor,
              borderColor: themeBorder,
              fontWeight: 600,
            }}
          >
            <RotateCcw size={13} />
            {hasStarted ? "Replay Voice Readout" : "Play Voice Readout"}
          </button>
        )}
      </div>
    </div>
  );
}
