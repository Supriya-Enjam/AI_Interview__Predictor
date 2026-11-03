
import { useEffect, useState } from "react";
import { Cookie, Settings, X } from "lucide-react";

interface CookiePreferences {
  essential: true;
  analytics: boolean;
  functional: boolean;
  marketing: boolean;
}

const STORAGE_KEY = "interviewiq_cookie_preferences";

const defaultPreferences: CookiePreferences = {
  essential: true,
  analytics: false,
  functional: false,
  marketing: false,
};

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] =
    useState<CookiePreferences>(defaultPreferences);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);

      if (saved) {
        const parsed = JSON.parse(saved) as Partial<CookiePreferences>;

        setPreferences({
          essential: true,
          analytics: parsed.analytics === true,
          functional: parsed.functional === true,
          marketing: parsed.marketing === true,
        });
      } else {
        setVisible(true);
      }
    } catch {
      setVisible(true);
    }
  }, []);

  const savePreferences = (selected: CookiePreferences) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(selected));
      setPreferences(selected);
      setVisible(false);
      setShowSettings(false);
    } catch (error) {
      console.error("Could not save cookie preferences:", error);
    }
  };

  const acceptAll = () => {
    savePreferences({
      essential: true,
      analytics: true,
      functional: true,
      marketing: true,
    });
  };

  const rejectOptional = () => {
    savePreferences(defaultPreferences);
  };

  const updatePreference = (
    category: keyof CookiePreferences,
    checked: boolean
  ) => {
    if (category === "essential") return;

    setPreferences((previous) => ({
      ...previous,
      [category]: checked,
    }));
  };

 if (!visible) {
  return (
    <button
      type="button"
      onClick={() => {
        setShowSettings(true);
        setVisible(true);
      }}
      className="fixed bottom-5 left-5 z-[150] flex items-center gap-2 rounded-full bg-purple-700 px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-purple-800"
      aria-label="Open cookie settings"
    >
      <Settings size={18} />
      Cookie Settings
    </button>
  );
}

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/40 p-4 backdrop-blur-[2px]">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="cookie-title"
        className="w-full max-w-3xl rounded-2xl border border-[#E9DDF7] bg-white p-6 shadow-2xl sm:p-8"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100 text-purple-700">
              <Cookie size={26} />
            </div>

            <div>
              <h2
                id="cookie-title"
                className="text-xl font-bold text-[#1F1633]"
              >
                {showSettings ? "Cookie Preferences" : "We value your privacy"}
              </h2>
              <p className="text-xs font-medium text-purple-700">
                InterviewIQ Privacy Center
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowSettings(false)}
            aria-label="Close cookie settings"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
          >
            <X size={19} />
          </button>
        </div>

        {!showSettings ? (
          <>
            <p className="mt-5 text-sm leading-6 text-slate-600">
              We use essential cookies to make InterviewIQ work. With your
              permission, we may also use optional cookies to understand
              website usage and remember preferences. You can accept all,
              reject optional cookies, or customize your choices.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={acceptAll}
                className="flex-1 rounded-xl bg-purple-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-purple-800"
              >
                Accept All
              </button>

              <button
                type="button"
                onClick={rejectOptional}
                className="flex-1 rounded-xl border border-purple-200 px-5 py-3 text-sm font-semibold text-purple-800 transition hover:bg-purple-50"
              >
                Reject Optional
              </button>

              <button
                type="button"
                onClick={() => setShowSettings(true)}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <Settings size={17} />
                Customize
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="mt-5 text-sm leading-6 text-slate-600">
              Choose which optional cookie categories you allow. Essential
              cookies are always active because they support core functionality.
            </p>

            <div className="mt-5 space-y-3">
              <PreferenceRow
                title="Essential Cookies"
                description="Required for core website functionality and security."
                checked={true}
                disabled={true}
              />

              <PreferenceRow
                title="Analytics Cookies"
                description="Help us understand how visitors use the website."
                checked={preferences.analytics}
                onChange={(value) => updatePreference("analytics", value)}
              />

              <PreferenceRow
                title="Functional Cookies"
                description="Remember preferences and improve your experience."
                checked={preferences.functional}
                onChange={(value) => updatePreference("functional", value)}
              />

              <PreferenceRow
                title="Marketing Cookies"
                description="Support advertising and campaign measurement."
                checked={preferences.marketing}
                onChange={(value) => updatePreference("marketing", value)}
              />
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => savePreferences(preferences)}
                className="flex-1 rounded-xl bg-purple-700 px-5 py-3 text-sm font-semibold text-white hover:bg-purple-800"
              >
                Save My Preferences
              </button>

              <button
                type="button"
                onClick={rejectOptional}
                className="flex-1 rounded-xl border border-purple-200 px-5 py-3 text-sm font-semibold text-purple-800 hover:bg-purple-50"
              >
                Reject Optional
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

interface PreferenceRowProps {
  title: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange?: (checked: boolean) => void;
}

function PreferenceRow({
  title,
  description,
  checked,
  disabled = false,
  onChange,
}: PreferenceRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-[#E9DDF7] p-4">
      <div>
        <h3 className="text-sm font-semibold text-[#1F1633]">{title}</h3>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          {description}
        </p>
      </div>

      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange?.(event.target.checked)}
        aria-label={title}
        className="h-5 w-5 shrink-0 accent-purple-700 disabled:cursor-not-allowed"
      />
    </div>
  );
}
