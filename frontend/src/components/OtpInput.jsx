import { useRef, useState, useEffect } from "react";

export default function OtpInput({ length = 6, value = "", onChange }) {
  const [digits, setDigits] = useState(
    value ? value.split("") : Array(length).fill("")
  );
  const inputs = useRef([]);

  useEffect(() => {
    if (value !== digits.join("")) {
      setDigits(value ? value.split("").slice(0, length) : Array(length).fill(""));
    }
  }, [value, length]);

  const update = (index, val) => {
    const next = [...digits];
    next[index] = val;
    setDigits(next);
    onChange?.(next.join(""));

    if (val && index < length - 1) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKey = (index, e) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    const next = Array(length).fill("");
    for (let i = 0; i < pasted.length; i++) {
      next[i] = pasted[i];
    }
    setDigits(next);
    onChange?.(next.join(""));
    const focusIdx = Math.min(pasted.length, length - 1);
    inputs.current[focusIdx]?.focus();
  };

  const handleQuickFill = () => {
    const devOtp = "123456";
    setDigits(devOtp.split(""));
    onChange?.(devOtp);
  };

  return (
    <div style={{ textAlign: "center" }}>
      <div className="apple-otp-group">
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => (inputs.current[i] = el)}
            type="text"
            inputMode="numeric"
            maxLength={1}
            className="apple-otp-slot"
            value={d}
            onChange={(e) => update(i, e.target.value.replace(/\D/, ""))}
            onKeyDown={(e) => handleKey(i, e)}
            onPaste={i === 0 ? handlePaste : undefined}
            autoFocus={i === 0}
            aria-label={`Digit ${i + 1}`}
          />
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "center", gap: 12, alignItems: "center", marginTop: 8 }}>
        <span style={{ fontSize: 13, color: "var(--color-ink-muted-48)" }}>
          Demo security code: <strong>123456</strong>
        </span>
        <button
          type="button"
          onClick={handleQuickFill}
          style={{
            background: "none",
            border: "none",
            color: "var(--color-primary)",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            textDecoration: "underline",
          }}
        >
          Auto-fill 123456
        </button>
      </div>
    </div>
  );
}
