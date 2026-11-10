
import { useEffect, useRef, useState } from "react";
import {
  Bot,
  MessageCircle,
  Mic,
  MicOff,
  Send,
  Sparkles,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";

// =====================================================
// TYPES
// =====================================================

interface ChatMessage {
  id: string;
  role: "assistant" | "user";
  text: string;
}

interface ApiHistoryMessage {
  role: "user" | "model";
  text: string;
}

interface ChatbotApiResponse {
  success: boolean;
  reply?: string;
  message?: string;
  errors?: Array<{
    field: string;
    message: string;
  }>;
}

interface SpeechRecognitionResultItem {
  transcript: string;
}

interface SpeechRecognitionResultLike {
  0: SpeechRecognitionResultItem;
}

interface SpeechRecognitionEventLike {
  results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

interface SpeechWindow extends Window {
  SpeechRecognition?: new () => SpeechRecognitionLike;
  webkitSpeechRecognition?: new () => SpeechRecognitionLike;
}

interface StoredSession {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: "candidate" | "admin";
    targetRole: string;
  };
}

// =====================================================
// CONFIGURATION
// =====================================================

const API_URL = "http://localhost:5000/api/chatbot/message";

const welcomeMessage: ChatMessage = {
  id: "welcome",
  role: "assistant",
  text: "Hi! I'm your InterviewIQ Candidate Guidance Assistant. I can help you with technical interviews, HR questions, communication skills, resume preparation, and career guidance. What would you like to learn today?",
};

const suggestions = [
  "How can I prepare for an interview?",
  "Give me common HR interview questions",
  "Explain the four pillars of OOP",
  "How can I improve my communication skills?",
];

// =====================================================
// CHATBOT COMPONENT
// =====================================================

export default function ChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");

  const [messages, setMessages] = useState<ChatMessage[]>([
    welcomeMessage,
  ]);

  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // =====================================================
  // VOICE SUPPORT INITIALIZATION
  // =====================================================

  useEffect(() => {
    const speechWindow = window as SpeechWindow;

    setVoiceSupported(
      Boolean(
        speechWindow.SpeechRecognition ||
        speechWindow.webkitSpeechRecognition
      )
    );

    return () => {
      recognitionRef.current?.stop();
      window.speechSynthesis?.cancel();
    };
  }, []);

  // =====================================================
  // AUTO SCROLL
  // =====================================================

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, isOpen, isLoading]);

  // =====================================================
  // GET AUTHENTICATION TOKEN
  // =====================================================

  const getAuthToken = (): string | null => {
    try {
      const savedSession = sessionStorage.getItem(
        "interviewiq_session"
      );

      if (!savedSession) {
        return null;
      }

      const session = JSON.parse(savedSession) as StoredSession;

      if (
        typeof session.token !== "string" ||
        !session.token.trim()
      ) {
        return null;
      }

      return session.token;
    } catch (error) {
      console.error(
        "Unable to read authentication session:",
        error
      );

      return null;
    }
  };

  // =====================================================
  // SEND MESSAGE TO GROQ CHATBOT
  // =====================================================

  const sendMessage = async (text: string) => {
    const trimmedMessage = text.trim();

    if (!trimmedMessage || isLoading) {
      return;
    }

    if (trimmedMessage.length > 2000) {
      setMessages((previous) => [
        ...previous,
        {
          id: `${Date.now()}-error`,
          role: "assistant",
          text: "Your message is too long. Please keep it under 2000 characters.",
        },
      ]);

      return;
    }

    const token = getAuthToken();

    if (!token) {
      setMessages((previous) => [
        ...previous,
        {
          id: `${Date.now()}-error`,
          role: "assistant",
          text: "Your login session could not be found. Please log in again to use the AI assistant.",
        },
      ]);

      return;
    }

    const userMessage: ChatMessage = {
      id: `${Date.now()}-user`,
      role: "user",
      text: trimmedMessage,
    };

    // Keep only actual conversation messages.
    const previousMessages = messages.filter(
      (item) =>
        item.id !== "welcome" &&
        item.text.trim().length > 0
    );

    // Convert frontend messages into backend history format.
    const history: ApiHistoryMessage[] = previousMessages
      .slice(-10)
      .map((item) => ({
        role:
          item.role === "assistant"
            ? "model"
            : "user",
        text: item.text.trim(),
      }));

    setMessages((previous) => [
      ...previous,
      userMessage,
    ]);

    setMessage("");
    setIsLoading(true);

    try {
      const response = await fetch(API_URL, {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },

        body: JSON.stringify({
          message: trimmedMessage,
          history,
        }),
      });

      const result =
        (await response.json()) as ChatbotApiResponse;

      // Handle expired authentication.
      if (response.status === 401) {
        throw new Error(
          "Your login session has expired. Please log in again."
        );
      }

      // Handle invalid request validation.
      if (response.status === 400) {
        console.error(
          "Chatbot validation details:",
          result.errors
        );

        const validationDetails = result.errors
          ?.map((item) => `${item.field}: ${item.message}`)
          .join(", ");

        throw new Error(
          validationDetails ||
          result.message ||
          "Your message could not be validated."
        );
      }

      // Handle Groq quota exhaustion.
      if (response.status === 429) {
        throw new Error(
          result.message ||
          "The AI assistant has reached its usage limit. Please try again later."
        );
      }

      // Handle other API errors.
      if (
        !response.ok ||
        !result.success ||
        !result.reply
      ) {
        throw new Error(
          result.message ||
          "Unable to get an AI response. Please try again."
        );
      }

      const assistantMessage: ChatMessage = {
        id: `${Date.now()}-assistant`,
        role: "assistant",
        text: result.reply,
      };

      setMessages((previous) => [
        ...previous,
        assistantMessage,
      ]);
    } catch (error: unknown) {
      console.error(
        "Groq chatbot request failed:",
        error
      );

      const errorMessage =
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again.";

      setMessages((previous) => [
        ...previous,
        {
          id: `${Date.now()}-error`,
          role: "assistant",
          text: errorMessage,
        },
      ]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  // =====================================================
  // VOICE-TO-TEXT
  // =====================================================

  const startVoiceInput = () => {
    const speechWindow = window as SpeechWindow;

    const Recognition =
      speechWindow.SpeechRecognition ||
      speechWindow.webkitSpeechRecognition;

    if (!Recognition) {
      window.alert(
        "Voice input is not supported in this browser. Please try Google Chrome."
      );

      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const recognition = new Recognition();

    recognition.lang = "en-IN";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event) => {
      const transcript =
        event.results[0]?.[0]?.transcript;

      if (transcript) {
        setMessage((previous) =>
          previous
            ? `${previous} ${transcript}`
            : transcript
        );
      }
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
      setIsListening(true);
    } catch {
      setIsListening(false);
    }
  };

  // =====================================================
  // TEXT-TO-SPEECH
  // =====================================================

  const speakMessage = (text: string) => {
    const speech = window.speechSynthesis;

    if (!speech) {
      window.alert(
        "Text-to-speech is not supported in this browser."
      );

      return;
    }

    if (isSpeaking) {
      speech.cancel();
      setIsSpeaking(false);
      return;
    }

    speech.cancel();

    const utterance = new SpeechSynthesisUtterance(text);

    utterance.lang = "en-IN";
    utterance.rate = 1;
    utterance.pitch = 1;

    utterance.onstart = () => {
      setIsSpeaking(true);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
    };

    speech.speak(utterance);
  };

  // =====================================================
  // CLOSE CHATBOT
  // =====================================================

  const closeChat = () => {
    setIsOpen(false);

    recognitionRef.current?.stop();
    setIsListening(false);

    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
  };

  // =====================================================
  // UI
  // =====================================================

  return (
    <>
      {/* Floating chatbot button */}

      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label="Open InterviewIQ AI assistant"
          className="fixed bottom-24 right-6 z-[60] flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 text-white shadow-xl shadow-indigo-900/25 transition duration-200 hover:scale-105 hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-300"
        >
          <MessageCircle size={25} />

          <span className="absolute -right-1 -top-1 flex h-4 w-4">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-4 w-4 rounded-full border-2 border-white bg-emerald-500" />
          </span>
        </button>
      )}

      {/* Chat window */}

      {isOpen && (
        <section
          aria-label="InterviewIQ AI assistant"
          className="fixed bottom-5 right-4 z-[60] flex h-[min(650px,calc(100vh-40px))] w-[min(390px,calc(100vw-32px))] flex-col overflow-hidden rounded-2xl border border-indigo-100 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
        >
          {/* Header */}

          <div className="flex shrink-0 items-center justify-between bg-indigo-600 px-4 py-4 text-white">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
                <Bot size={23} />
              </div>

              <div>
                <h2 className="text-sm font-bold">
                  InterviewIQ Assistant
                </h2>

                <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-indigo-100">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  Groq AI candidate guidance
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={closeChat}
              aria-label="Close chatbot"
              className="rounded-lg p-2 transition hover:bg-white/15"
            >
              <X size={20} />
            </button>
          </div>

          {/* Messages */}

          <div className="flex-1 space-y-4 overflow-y-auto bg-slate-50 p-4 dark:bg-slate-950">
            <div className="text-center">
              <span className="rounded-full bg-indigo-50 px-3 py-1 text-[10px] font-medium text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                CANDIDATE GUIDANCE
              </span>
            </div>

            {messages.map((chatMessage) => (
              <div
                key={chatMessage.id}
                className={`flex ${
                  chatMessage.role === "user"
                    ? "justify-end"
                    : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    chatMessage.role === "user"
                      ? "rounded-br-sm bg-indigo-600 text-white"
                      : "rounded-bl-sm border border-slate-200 bg-white text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  }`}
                >
                  {chatMessage.role === "assistant" && (
                    <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                      <Sparkles size={14} />
                      InterviewIQ AI
                    </div>
                  )}

                  <p className="whitespace-pre-wrap">
                    {chatMessage.text}
                  </p>

                  {chatMessage.role === "assistant" && (
                    <button
                      type="button"
                      onClick={() =>
                        speakMessage(chatMessage.text)
                      }
                      aria-label="Read assistant message aloud"
                      className="mt-3 flex items-center gap-1.5 text-xs text-slate-500 transition hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400"
                    >
                      <Volume2 size={14} />
                      Read aloud
                    </button>
                  )}
                </div>
              </div>
            ))}

            {/* Groq loading indicator */}

            {isLoading && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-sm border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                  <div className="flex items-center gap-2 text-xs text-indigo-600 dark:text-indigo-400">
                    <Sparkles size={14} />
                    Groq AI is thinking

                    <span className="flex gap-1">
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-500" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-500 [animation-delay:150ms]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-500 [animation-delay:300ms]" />
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Suggested questions */}

            {messages.length === 1 && !isLoading && (
              <div className="space-y-2 pt-2">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Suggested questions
                </p>

                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => sendMessage(suggestion)}
                    className="block w-full rounded-xl border border-indigo-100 bg-white px-3 py-2.5 text-left text-xs text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Voice status */}

          {isListening && (
            <div className="flex items-center justify-center gap-2 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-600 dark:bg-rose-950/40 dark:text-rose-300">
              <span className="h-2 w-2 animate-pulse rounded-full bg-rose-500" />
              Listening... Speak now
            </div>
          )}

          {/* Input */}

          <div className="shrink-0 border-t border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void sendMessage(message);
              }}
              className="flex items-center gap-2"
            >
              {voiceSupported && (
                <button
                  type="button"
                  onClick={startVoiceInput}
                  disabled={isLoading}
                  aria-label={
                    isListening
                      ? "Stop voice input"
                      : "Start voice input"
                  }
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition ${
                    isListening
                      ? "bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-300"
                      : "bg-slate-100 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                  } disabled:cursor-not-allowed disabled:opacity-40`}
                >
                  {isListening ? (
                    <MicOff size={18} />
                  ) : (
                    <Mic size={18} />
                  )}
                </button>
              )}

              <input
                ref={inputRef}
                type="text"
                value={message}
                onChange={(event) =>
                  setMessage(event.target.value)
                }
                placeholder="Ask an interview question..."
                aria-label="Type your message"
                maxLength={2000}
                disabled={isLoading}
                className="h-10 min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:ring-indigo-950"
              />

              <button
                type="submit"
                disabled={!message.trim() || isLoading}
                aria-label="Send message"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Send size={17} />
              </button>
            </form>

            <div className="mt-2 flex items-center justify-between px-1">
              <p className="text-[10px] text-slate-400">
                Voice input requires microphone permission.
              </p>

              <button
                type="button"
                onClick={() => {
                  window.speechSynthesis?.cancel();
                  setIsSpeaking(false);
                }}
                aria-label="Stop text-to-speech"
                title="Stop speaking"
                className="text-slate-400 transition hover:text-indigo-600"
              >
                <VolumeX size={14} />
              </button>
            </div>
          </div>
        </section>
      )}
    </>
  );
}
