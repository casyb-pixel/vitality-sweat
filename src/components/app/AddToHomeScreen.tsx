"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const STORAGE_KEY = "ve-a2hs-dismissed";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type AddToHomeScreenValue = {
  isStandalone: boolean;
  showBanner: boolean;
  sheetOpen: boolean;
  needsSafari: boolean;
  isIos: boolean;
  canNativeInstall: boolean;
  dismissBanner: () => void;
  closeSheet: () => void;
  installOrExplain: () => Promise<void>;
};

const AddToHomeScreenContext = createContext<AddToHomeScreenValue | null>(null);

function isIosDevice(ua: string, maxTouchPoints: number, platform: string) {
  return (
    /iphone|ipad|ipod/i.test(ua) ||
    (platform === "MacIntel" && maxTouchPoints > 1)
  );
}

function isStandaloneDisplay() {
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return (
    nav.standalone === true ||
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches
  );
}

function isIosSafari(ua: string, isIos: boolean) {
  if (!isIos) return false;
  const isOther = /crios|fxios|edgios|opt\//i.test(ua);
  return /safari/i.test(ua) && !isOther;
}

function isPhoneOrTablet(ua: string, isIos: boolean) {
  return isIos || /android/i.test(ua);
}

function readDismissed() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function writeDismissed() {
  try {
    window.localStorage.setItem(STORAGE_KEY, "1");
  } catch {
    // ignore
  }
}

export function AddToHomeScreenProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [standalone, setStandalone] = useState(false);
  const [ios, setIos] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [safari, setSafari] = useState(true);
  const [dismissed, setDismissed] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [nativePrompt, setNativePrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const ua = window.navigator.userAgent;
    const iosNow = isIosDevice(
      ua,
      window.navigator.maxTouchPoints,
      window.navigator.platform,
    );
    setStandalone(isStandaloneDisplay());
    setIos(iosNow);
    setMobile(isPhoneOrTablet(ua, iosNow));
    setSafari(isIosSafari(ua, iosNow));
    setDismissed(readDismissed());
    setReady(true);

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setNativePrompt(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setNativePrompt(null);
      setStandalone(true);
      writeDismissed();
      setDismissed(true);
      setSheetOpen(false);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const dismissBanner = useCallback(() => {
    writeDismissed();
    setDismissed(true);
  }, []);

  const closeSheet = useCallback(() => {
    setSheetOpen(false);
  }, []);

  const installOrExplain = useCallback(async () => {
    if (standalone) return;
    if (nativePrompt) {
      await nativePrompt.prompt();
      const { outcome } = await nativePrompt.userChoice;
      setNativePrompt(null);
      if (outcome === "accepted") {
        writeDismissed();
        setDismissed(true);
        setStandalone(true);
      }
      return;
    }
    setSheetOpen(true);
  }, [nativePrompt, standalone]);

  const showBanner =
    ready &&
    !standalone &&
    !dismissed &&
    mobile &&
    (ios || Boolean(nativePrompt));

  const value = useMemo<AddToHomeScreenValue>(
    () => ({
      isStandalone: standalone,
      showBanner,
      sheetOpen,
      needsSafari: ios && !safari,
      isIos: ios,
      canNativeInstall: Boolean(nativePrompt),
      dismissBanner,
      closeSheet,
      installOrExplain,
    }),
    [
      closeSheet,
      dismissBanner,
      installOrExplain,
      ios,
      nativePrompt,
      safari,
      sheetOpen,
      showBanner,
      standalone,
    ],
  );

  return (
    <AddToHomeScreenContext.Provider value={value}>
      {children}
    </AddToHomeScreenContext.Provider>
  );
}

export function useAddToHomeScreen() {
  const ctx = useContext(AddToHomeScreenContext);
  if (!ctx) {
    throw new Error(
      "useAddToHomeScreen must be used inside AddToHomeScreenProvider",
    );
  }
  return ctx;
}

const primaryBtn =
  "inline-flex min-h-10 items-center justify-center bg-brand-orange px-4 py-2 font-sans text-xs font-bold uppercase tracking-[0.08em] text-white hover:bg-brand-orange-deep";
const secondaryBtn =
  "inline-flex min-h-10 items-center justify-center border border-brand-ink/15 px-4 py-2 font-sans text-xs font-bold uppercase tracking-[0.08em] text-brand-ink hover:border-brand-orange hover:text-brand-orange";

export function AddToHomeScreenBanner() {
  const {
    showBanner,
    dismissBanner,
    installOrExplain,
    sheetOpen,
    closeSheet,
    needsSafari,
    isIos,
    canNativeInstall,
  } = useAddToHomeScreen();

  return (
    <>
      {showBanner ? (
        <aside className="mb-6 border border-brand-ink/10 bg-surface-elevated p-5 sm:p-6">
          <p className="eyebrow text-brand-orange">Home Screen</p>
          <h2 className="mt-1 font-display text-2xl text-brand-ink">
            Add Vitality Engine to your Home Screen
          </h2>
          <p className="mt-2 max-w-2xl font-sans text-sm leading-relaxed text-brand-muted">
            Open workouts in one tap, like a real app. Rest alerts work best
            from that icon.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              className={primaryBtn}
              onClick={() => void installOrExplain()}
            >
              Add to Home Screen
            </button>
            <button type="button" className={secondaryBtn} onClick={dismissBanner}>
              Not now
            </button>
          </div>
        </aside>
      ) : null}
      {sheetOpen ? (
        <AddToHomeScreenSheet
          needsSafari={needsSafari}
          isIos={isIos}
          canNativeInstall={canNativeInstall}
          onClose={closeSheet}
        />
      ) : null}
    </>
  );
}

function AddToHomeScreenSheet({
  needsSafari,
  isIos,
  canNativeInstall,
  onClose,
}: {
  needsSafari: boolean;
  isIos: boolean;
  canNativeInstall: boolean;
  onClose: () => void;
}) {
  const steps = isIos
    ? [
        "Tap Share (the square with the arrow pointing up).",
        "Scroll the list and tap Add to Home Screen.",
        "Tap Add. The Engine icon lands on your Home Screen and opens the app.",
      ]
    : [
        "Tap the browser menu (three dots).",
        "Tap Install app or Add to Home Screen.",
        "Confirm. The Engine icon lands on your Home Screen and opens the app.",
      ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-brand-ink/40 p-3 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="a2hs-title"
    >
      <div className="w-full max-w-md border border-brand-ink/10 bg-surface-elevated p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="eyebrow text-brand-orange">Home Screen</p>
            <h3
              id="a2hs-title"
              className="font-display text-2xl text-brand-ink"
            >
              Add Vitality Engine
            </h3>
          </div>
          <button type="button" className={secondaryBtn} onClick={onClose}>
            Close
          </button>
        </div>
        {needsSafari ? (
          <p className="mt-3 border border-brand-orange/30 bg-brand-orange/5 px-3 py-2 font-sans text-sm text-brand-ink">
            iPhone only saves a real app icon from Safari. Open this page in
            Safari, then follow the steps below.
          </p>
        ) : null}
        {!isIos && !canNativeInstall ? (
          <p className="mt-3 font-sans text-sm text-brand-muted">
            Chrome can install Engine in one tap when it offers Install app.
            If you do not see that yet, use the menu steps below.
          </p>
        ) : null}
        <ol className="mt-4 list-decimal space-y-2 pl-5 font-sans text-sm leading-relaxed text-brand-ink">
          {steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        <p className="mt-4 font-sans text-xs text-brand-muted">
          Rest-timer and Daily Brief alerts work best from that Home Screen
          icon.
        </p>
      </div>
    </div>
  );
}
