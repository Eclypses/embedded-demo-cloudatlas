import { useState, useEffect, useRef } from "react";
import type { FormEvent, ChangeEvent } from "react";
import { mteFetch } from "mte-relay-browser-public-client";

// types
interface FormData {
  email: string;
  password: string;
}
interface FlowStep {
  id: number;
  label: string;
  encryption: EncryptionType;
  description: string;
}
type EncryptionType = "none" | "tls" | "mte" | "both";
type AnimationSpeed = "slow" | "medium" | "fast";

// constants
const STANDARD_API_URL = "https://http-relay-demo.eclypses.com";
const MTE_API_URL = "https://aws-relay-server-demo.eclypses.com";

const DEFAULT_FORM_DATA: FormData = {
  email: "jim.halpert@example.com",
  password: "P@ssw0rd!",
};

const ANIMATION_SPEEDS: Record<AnimationSpeed, number> = {
  slow: 4000,
  medium: 1000,
  fast: 500,
};

// Standard HTTPS flow - data encrypted only during network transit
const STANDARD_FLOW: FlowStep[] = [
  {
    id: 1,
    label: "Form Submission",
    encryption: "none",
    description: "User data collected from form",
  },
  {
    id: 2,
    label: "Browser Processing",
    encryption: "none",
    description: "Data passed to browser in plain text",
  },
  {
    id: 3,
    label: "TLS Encryption",
    encryption: "tls",
    description: "Browser initiates TLS encryption",
  },
  {
    id: 4,
    label: "Network Transit",
    encryption: "tls",
    description: "Encrypted data sent to server",
  },
  {
    id: 5,
    label: "Server Response",
    encryption: "tls",
    description: "TLS encrypted response received",
  },
  {
    id: 6,
    label: "Browser Decryption",
    encryption: "none",
    description: "Browser decrypts response data",
  },
  {
    id: 7,
    label: "Application Receives Data",
    encryption: "none",
    description: "Plain text data available to app",
  },
];

// MTE flow - data encrypted at app layer before TLS (double encryption)
const MTE_FLOW: FlowStep[] = [
  {
    id: 1,
    label: "Form Submission",
    encryption: "none",
    description: "User data collected from form",
  },
  {
    id: 2,
    label: "MTE Encryption",
    encryption: "mte",
    description: "Data encrypted in application memory",
  },
  {
    id: 3,
    label: "Browser Processing",
    encryption: "mte",
    description: "MTE encrypted data passed to browser",
  },
  {
    id: 4,
    label: "TLS Encryption",
    encryption: "both",
    description: "Browser adds TLS layer",
  },
  {
    id: 5,
    label: "Network Transit",
    encryption: "both",
    description: "Double encrypted data in transit",
  },
  {
    id: 6,
    label: "Server Response",
    encryption: "both",
    description: "Double encrypted response received",
  },
  {
    id: 7,
    label: "TLS Decryption",
    encryption: "mte",
    description: "Browser removes TLS layer",
  },
  {
    id: 8,
    label: "MTE Decryption",
    encryption: "none",
    description: "MTE Relay decrypts response",
  },
  {
    id: 9,
    label: "Application Receives Data",
    encryption: "none",
    description: "Plain text data available to app",
  },
];

// utils

/** Generates a random hex string to simulate encrypted data */
function generateEncryptedString(): string {
  const chars = "0123456789abcdef";
  return Array.from(
    { length: 20 },
    () => chars[Math.floor(Math.random() * 16)]
  ).join("");
}

/** Generates an array of fake encrypted strings for visualization */
function generateEncryptedDataSet(): string[] {
  return [
    generateEncryptedString(),
    generateEncryptedString(),
    generateEncryptedString(),
  ];
}

function LockIcon({ color, size = 16 }: { color: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function CheckIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

// UI Components

/** Displays a colored badge indicating the current encryption state */
function EncryptionBadge({ encryption }: { encryption: EncryptionType }) {
  const baseClasses =
    "flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full";

  switch (encryption) {
    case "none":
      return (
        <span
          className={baseClasses}
          style={{
            backgroundColor: "#6b7280",
            color: "var(--color-text-tertiary)",
          }}
        >
          Unencrypted
        </span>
      );
    case "tls":
      return (
        <span
          className={baseClasses}
          style={{
            backgroundColor: "rgba(34, 197, 94, 0.15)",
            color: "#22c55e",
          }}
        >
          <LockIcon color="#22c55e" size={12} />
          TLS
        </span>
      );
    case "mte":
      return (
        <span
          className={baseClasses}
          style={{
            backgroundColor: "rgba(240, 74, 42, 0.15)",
            color: "var(--color-brand-500)",
          }}
        >
          <LockIcon color="var(--color-brand-500)" size={12} />
          MTE
        </span>
      );
    case "both":
      return (
        <span
          className={baseClasses}
          style={{
            background:
              "linear-gradient(90deg, rgba(240, 74, 42, 0.35), rgba(34, 197, 94, 0.25))",
            color: "var(--color-text-primary)",
          }}
        >
          <LockIcon color="var(--color-brand-500)" size={12} />
          <span>MTE + </span>
          <LockIcon color="#22c55e" size={12} />
          <span>TLS</span>
        </span>
      );
  }
}

/** Visual representation of each step in the encryption flow */
function FlowVisualization({
  useMteRelay,
  currentStep,
  isAnimating,
}: {
  useMteRelay: boolean;
  currentStep: number;
  isAnimating: boolean;
}) {
  const flow = useMteRelay ? MTE_FLOW : STANDARD_FLOW;

  return (
    <div className="space-y-1">
      {flow.map((step, index) => {
        const isComplete = currentStep > index;
        const isCurrent = currentStep === index;

        return (
          <div
            key={step.id}
            className="flex items-start gap-3 p-3 rounded-lg transition-all duration-300"
            style={{
              backgroundColor: isCurrent
                ? "var(--color-bg-700)"
                : isComplete
                ? "var(--color-bg-800)"
                : "transparent",
              opacity: isComplete
                ? 1
                : !isAnimating
                ? 0.5
                : isCurrent
                ? 1
                : 0.3,
              transform: isCurrent ? "scale(1.02)" : "scale(1)",
            }}
          >
            {/* Step indicator circle */}
            <div
              className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300"
              style={{
                backgroundColor: isComplete
                  ? "var(--color-success-500)"
                  : isCurrent
                  ? "var(--color-brand-500)"
                  : "var(--color-bg-700)",
                color:
                  isComplete || isCurrent
                    ? "white"
                    : "var(--color-text-tertiary)",
              }}
            >
              {isComplete ? (
                <CheckIcon size={14} />
              ) : (
                <span className="text-xs font-medium">{step.id}</span>
              )}
            </div>

            {/* Step content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className="text-sm font-medium"
                  style={{
                    color:
                      isCurrent || isComplete
                        ? "var(--color-text-primary)"
                        : "var(--color-text-tertiary)",
                  }}
                >
                  {step.label}
                </span>
                <EncryptionBadge encryption={step.encryption} />
              </div>
              <p
                className="text-xs mt-0.5"
                style={{
                  color: isCurrent
                    ? "rgba(255, 255, 255, 0.7)"
                    : isComplete
                    ? "var(--color-text-primary)"
                    : "var(--color-text-secondary)",
                }}
              >
                {step.description}
              </p>
            </div>

            {/* Animated pulse for current step */}
            {isCurrent && isAnimating && (
              <div className="shrink-0">
                <div
                  className="w-2 h-2 rounded-full animate-pulse"
                  style={{ backgroundColor: "var(--color-brand-500)" }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Shows the current state of data (plain text, encrypted, or response) */
function DataPreview({
  useMteRelay,
  currentStep,
  formData,
  responseData,
  tlsEncryptedData,
  mteEncryptedData,
}: {
  useMteRelay: boolean;
  currentStep: number;
  formData: FormData;
  responseData: Record<string, unknown> | null;
  tlsEncryptedData: string[];
  mteEncryptedData: string[];
}) {
  const flow = useMteRelay ? MTE_FLOW : STANDARD_FLOW;
  const step = flow[currentStep];

  const getDisplayData = (): string => {
    // Standard flow: show response after browser decryption (step 5+)
    if (!useMteRelay && responseData && currentStep >= 5) {
      return JSON.stringify(responseData, null, 2);
    }

    // MTE flow: show appropriate data based on decryption stage
    if (useMteRelay) {
      if (currentStep === 6) return mteEncryptedData.join("\n"); // After TLS decrypt, before MTE decrypt
      if (responseData && currentStep >= 7)
        return JSON.stringify(responseData, null, 2); // Fully decrypted
    }

    if (!step) return JSON.stringify(formData, null, 2);

    // Show data based on current encryption state
    switch (step.encryption) {
      case "none":
        return JSON.stringify(formData, null, 2);
      case "mte":
        return mteEncryptedData.join("\n");
      case "tls":
        return tlsEncryptedData.join("\n");
      case "both":
        return `${tlsEncryptedData[0]}\n${tlsEncryptedData[1]}\n${tlsEncryptedData[2]}\n${mteEncryptedData[0]}`;
    }
  };

  // Determine text color based on encryption type
  const getTextColor = (): string => {
    if (!step || step.encryption === "none") return "var(--color-text-primary)";
    if (step.encryption === "mte") return "var(--color-brand-500)";
    if (step.encryption === "tls") return "#22c55e";
    return "#a78bfa";
  };

  return (
    <div
      className="mt-4 p-3 rounded-lg border"
      style={{
        backgroundColor: "var(--color-bg-800)",
        borderColor: "var(--color-border-soft)",
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <span
          className="text-xs font-semibold"
          style={{ color: "var(--color-text-secondary)" }}
        >
          Data State
        </span>
        {step && <EncryptionBadge encryption={step.encryption} />}
      </div>
      <pre
        className="text-xs font-mono overflow-hidden"
        style={{ color: getTextColor() }}
      >
        {getDisplayData()}
      </pre>
    </div>
  );
}

// Main Component

export function RelayDemo() {
  // Form state
  const [formData, setFormData] = useState<FormData>(DEFAULT_FORM_DATA);
  const [useMteRelay, setUseMteRelay] = useState(false);

  // Request state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [responseData, setResponseData] = useState<Record<
    string,
    unknown
  > | null>(null);

  // Animation state
  const [currentStep, setCurrentStep] = useState(-1);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [animationSpeed, setAnimationSpeed] = useState<AnimationSpeed>("fast");

  // Simulated encrypted data for visualization
  const [tlsEncryptedData, setTlsEncryptedData] = useState<string[]>([]);
  const [mteEncryptedData, setMteEncryptedData] = useState<string[]>([]);

  // Refs for async operations
  const abortControllerRef = useRef<AbortController | null>(null);
  const pendingErrorRef = useRef<string | null>(null);

  const flow = useMteRelay ? MTE_FLOW : STANDARD_FLOW;
  const isProcessing = loading || isAnimating;

  // Generate TLS "encrypted" data on mount
  useEffect(() => {
    setTlsEncryptedData(generateEncryptedDataSet());
  }, []);

  // Mark success when animation completes with valid response
  useEffect(() => {
    if (!isAnimating && responseData) {
      setSuccess(true);
    }
  }, [isAnimating, responseData]);

  // Display deferred error after animation finishes
  useEffect(() => {
    if (!isAnimating && pendingErrorRef.current) {
      setError(pendingErrorRef.current);
      pendingErrorRef.current = null;
    }
  }, [isAnimating]);

  // Step through animation on timer
  useEffect(() => {
    if (!isAnimating || isPaused) return;

    if (currentStep >= flow.length) {
      setIsAnimating(false);
      return;
    }

    const timer = setTimeout(() => {
      setCurrentStep((prev) => prev + 1);
    }, ANIMATION_SPEEDS[animationSpeed]);

    return () => clearTimeout(timer);
  }, [currentStep, isAnimating, isPaused, flow.length, animationSpeed]);

  // Reset animation state (used by toggle and input changes)
  const resetAnimation = () => {
    setCurrentStep(-1);
    setIsAnimating(false);
  };

  // Full state reset
  const resetAll = () => {
    setFormData(DEFAULT_FORM_DATA);
    setSuccess(false);
    setError(null);
    setResponseData(null);
    setIsPaused(false);
    resetAnimation();
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    resetAnimation();
  };

  const handleToggleMte = () => {
    setUseMteRelay(!useMteRelay);
    resetAnimation();
  };

  const handleAbort = () => {
    abortControllerRef.current?.abort();
    resetAll();
    setLoading(false);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    abortControllerRef.current = new AbortController();

    // Reset state for new request
    setLoading(true);
    setError(null);
    setSuccess(false);
    setResponseData(null);
    setCurrentStep(0);
    if (useMteRelay) {
      // For MTE+TLS, generate fresh encrypted data for both layers
      setTlsEncryptedData(generateEncryptedDataSet());
      setMteEncryptedData(generateEncryptedDataSet());
    } else {
      // For TLS only, MTE data stays empty
      setMteEncryptedData([]);
    }
    setIsAnimating(true);
    pendingErrorRef.current = null;

    try {
      const baseUrl = useMteRelay ? MTE_API_URL : STANDARD_API_URL;
      const fetchFn = useMteRelay ? mteFetch : fetch;

      const response = await fetchFn(`${baseUrl}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
        signal: abortControllerRef.current.signal,
      });

      const data = await response.json();

      if (response.ok) {
        setResponseData(data);
      } else {
        pendingErrorRef.current = `Error: ${response.status} - Failed to submit form`;
      }

      setFormData(DEFAULT_FORM_DATA);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        setError("Request cancelled");
        setIsAnimating(false);
      } else {
        pendingErrorRef.current =
          err instanceof Error ? err.message : "An error occurred";
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="w-full min-h-screen p-6"
      style={{ backgroundColor: "var(--color-bg-800)" }}
    >
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Login Form */}
          <div
            className="p-8 rounded-lg border shadow-lg"
            style={{
              backgroundColor: "var(--color-bg-850)",
              borderColor: "var(--color-border-soft)",
            }}
          >
            <div className="mb-4 text-center">
              <h1
                className="text-3xl font-bold mb-3"
                style={{ color: "var(--color-text-primary)" }}
              >
                MTE Relay Demo
              </h1>
              <p
                className="text-sm"
                style={{ color: "var(--color-text-secondary)" }}
              >
                Sign in using the form below.
              </p>
            </div>

            {/* MTE Toggle */}
            <div
              className="mb-6 pb-6 border-b"
              style={{ borderColor: "var(--color-border-soft)" }}
            >
              <div className="flex items-center justify-between mb-2">
                <label
                  htmlFor="mte-toggle"
                  className="text-sm font-semibold"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  Enable MTE Relay
                </label>
                <button
                  id="mte-toggle"
                  onClick={handleToggleMte}
                  disabled={isProcessing}
                  className="relative w-12 h-7 rounded-full border-2 transition-colors disabled:opacity-50 shrink-0"
                  style={{
                    backgroundColor: useMteRelay
                      ? "var(--color-brand-500)"
                      : "var(--color-bg-800)",
                    borderColor: useMteRelay
                      ? "var(--color-brand-500)"
                      : "var(--color-border-strong)",
                  }}
                >
                  <div
                    className="absolute top-0.5 w-5 h-5 rounded-full transition-transform shadow-md"
                    style={{
                      backgroundColor: "white",
                      transform: useMteRelay
                        ? "translateX(21px)"
                        : "translateX(2px)",
                    }}
                  />
                </button>
              </div>
              <p
                className="text-xs"
                style={{ color: "var(--color-text-secondary)" }}
              >
                When MTE Relay is enabled, data is encrypted at the application
                layer before being sent over TLS. Data is encrypted uniquely for
                each request, using quantum resistant encryption that protects
                your users and their data.
              </p>
            </div>

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium mb-2"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="jim.halpert@example.com"
                  required
                  disabled={isProcessing}
                  className="w-full px-4 py-2.5 rounded-lg border text-sm transition-colors disabled:opacity-50 focus:outline-none focus:ring-2"
                  style={{
                    backgroundColor: "var(--color-bg-800)",
                    borderColor: "var(--color-border-soft)",
                    color: "var(--color-text-primary)",
                  }}
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium mb-2"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="P@ssw0rd!"
                  required
                  disabled={isProcessing}
                  className="w-full px-4 py-2.5 rounded-lg border text-sm transition-colors disabled:opacity-50 focus:outline-none focus:ring-2"
                  style={{
                    backgroundColor: "var(--color-bg-800)",
                    borderColor: "var(--color-border-soft)",
                    color: "var(--color-text-primary)",
                  }}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mt-6">
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="flex-1 py-3 px-4 rounded-lg font-semibold text-sm transition-all disabled:opacity-50 hover:opacity-90"
                  style={{
                    backgroundColor: "var(--color-brand-500)",
                    color: "white",
                  }}
                >
                  {loading ? "Logging in..." : "Login"}
                </button>

                {isProcessing && (
                  <>
                    <button
                      type="button"
                      onClick={() => setIsPaused(!isPaused)}
                      className="py-3 px-4 rounded-lg font-semibold text-sm transition-all hover:opacity-90"
                      style={{ backgroundColor: "#f59e0b", color: "white" }}
                    >
                      {isPaused ? "Resume" : "Pause"}
                    </button>
                    <button
                      type="button"
                      onClick={handleAbort}
                      className="py-3 px-4 rounded-lg font-semibold text-sm transition-all hover:opacity-90"
                      style={{ backgroundColor: "#ef4444", color: "white" }}
                    >
                      Cancel
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={resetAll}
                  disabled={isProcessing}
                  className="py-3 px-4 rounded-lg font-semibold text-sm transition-all disabled:opacity-50 hover:opacity-90"
                  style={{
                    backgroundColor: "var(--color-bg-700)",
                    color: "var(--color-text-primary)",
                    border: "1px solid var(--color-border-soft)",
                  }}
                >
                  Reset
                </button>
              </div>
            </form>

            {/* Data State Preview */}
            <DataPreview
              useMteRelay={useMteRelay}
              currentStep={Math.max(0, Math.min(currentStep, flow.length - 1))}
              formData={formData}
              responseData={responseData}
              tlsEncryptedData={tlsEncryptedData}
              mteEncryptedData={mteEncryptedData}
            />

            {/* Success Message */}
            {success && (
              <div
                className="mt-6 p-4 rounded-lg border"
                style={{
                  backgroundColor: "var(--color-brand-soft)",
                  borderColor: "var(--color-success-500)",
                }}
              >
                <p
                  style={{ color: "var(--color-success-500)" }}
                  className="font-medium text-sm"
                >
                  Login successful!
                </p>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div
                className="mt-6 p-4 rounded-lg border"
                style={{
                  backgroundColor: "#f04a2a24",
                  borderColor: "var(--color-brand-500)",
                }}
              >
                <p
                  style={{ color: "var(--color-brand-500)" }}
                  className="font-medium text-sm"
                >
                  Error: {error}
                </p>
              </div>
            )}
          </div>

          {/* Right Column - Flow Visualization */}
          <div
            className="p-8 rounded-lg border shadow-lg"
            style={{
              backgroundColor: "var(--color-bg-850)",
              borderColor: "var(--color-border-soft)",
            }}
          >
            <div className="flex items-center justify-between gap-4 mb-6">
              <h2
                className="text-xl font-bold"
                style={{ color: "var(--color-text-primary)" }}
              >
                Data Flow Visualization
              </h2>

              {/* Animation Speed Selector */}
              <div className="shrink-0 w-40">
                <label
                  htmlFor="animation-speed"
                  className="block text-xs font-semibold mb-1"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  Speed
                </label>
                <select
                  id="animation-speed"
                  value={animationSpeed}
                  onChange={(e) =>
                    setAnimationSpeed(e.target.value as AnimationSpeed)
                  }
                  className="w-full px-2 py-1.5 rounded-lg border text-xs transition-colors focus:outline-none focus:ring-2"
                  style={{
                    backgroundColor: "var(--color-bg-800)",
                    borderColor: "var(--color-border-soft)",
                    color: "var(--color-text-primary)",
                  }}
                >
                  <option value="slow">Slow</option>
                  <option value="medium">Medium</option>
                  <option value="fast">Fast</option>
                </select>
              </div>
            </div>

            <p
              className="text-sm mb-6"
              style={{ color: "var(--color-text-secondary)" }}
            >
              {useMteRelay
                ? "MTE Relay adds application-layer encryption before TLS"
                : "Standard TLS encryption via browser"}
            </p>

            <FlowVisualization
              useMteRelay={useMteRelay}
              currentStep={currentStep}
              isAnimating={isAnimating}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
