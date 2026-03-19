/**
 * useOneSignalNotifications.ts
 * Integrates OneSignal Web Push (free tier) for menstrual cycle reminders.
 *
 * Setup:
 *  1. Create a free account at https://onesignal.com
 *  2. Add a Web Push app → get your App ID
 *  3. Set VITE_ONESIGNAL_APP_ID in your .env
 *  4. Add OneSignal SDK to index.html (see bottom of this file)
 */

import { useEffect, useState, useCallback, useRef } from "react";
import { format, parseISO, subDays } from "date-fns";

// ── Types ──────────────────────────────────────────────────────────────────
export interface NotificationPayload {
  title: string;
  message: string;
  scheduledDate: Date;
  daysUntilPeriod: number;
  type: "period_reminder" | "ovulation_reminder" | "cycle_update";
}

export interface OneSignalState {
  isSupported: boolean;       // Browser supports push
  isInitialized: boolean;     // SDK loaded
  isSubscribed: boolean;      // User opted in
  isLoading: boolean;
  playerId: string | null;    // OneSignal Player/Subscription ID
  error: string | null;
  permissionState: "default" | "granted" | "denied";
}

// OneSignal global (injected by their SDK)
declare global {
  interface Window {
    OneSignalDeferred?: Array<(os: OneSignalType) => void>;
    OneSignal?: OneSignalType;
  }
}

interface OneSignalType {
  init: (config: object) => Promise<void>;
  Notifications: {
    requestPermission: () => Promise<void>;
    permission: boolean;
    permissionNative: NotificationPermission;
    addEventListener: (event: string, cb: (value: unknown) => void) => void;
    removeEventListener: (event: string, cb: (value: unknown) => void) => void;
  };
  User: {
    PushSubscription: {
      id: string | null;
      optedIn: boolean;
      optIn: () => Promise<void>;
      optOut: () => Promise<void>;
    };
  };
}

// ── OneSignal REST API helper ───────────────────────────────────────────────
const OS_APP_ID = import.meta.env.VITE_ONESIGNAL_APP_ID ?? "";
const OS_API_URL = "https://onesignal.com/api/v1/notifications";

async function sendOneSignalNotification(
  playerId: string,
  title: string,
  message: string,
  sendAfter?: Date,
  data?: Record<string, string>
): Promise<boolean> {
  if (!OS_APP_ID || !playerId) return false;

  const body: Record<string, unknown> = {
    app_id: OS_APP_ID,
    include_subscription_ids: [playerId],
    headings: { en: title },
    contents: { en: message },
    ...(data && { data }),
  };

  if (sendAfter && sendAfter > new Date()) {
    body.send_after = sendAfter.toUTCString();
  }

  try {
    const res = await fetch(OS_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return res.ok;
  } catch (err) {
    console.error("[OneSignal] Failed to send notification:", err);
    return false;
  }
}

// ── Hook ───────────────────────────────────────────────────────────────────
export function useOneSignalNotifications() {
  const [state, setState] = useState<OneSignalState>({
    isSupported: false,
    isInitialized: false,
    isSubscribed: false,
    isLoading: true,
    playerId: null,
    error: null,
    permissionState: "default",
  });
  const [scheduledCount, setScheduledCount] = useState(0);
  const initRef = useRef(false);

  // ── Initialize OneSignal SDK ──────────────────────────────────────────
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    const isSupported =
      typeof window !== "undefined" &&
      "Notification" in window &&
      "serviceWorker" in navigator &&
      "PushManager" in window;

    if (!isSupported) {
      setState(s => ({ ...s, isSupported: false, isLoading: false }));
      return;
    }

    if (!OS_APP_ID) {
      setState(s => ({
        ...s,
        isSupported: true,
        isLoading: false,
        error: "VITE_ONESIGNAL_APP_ID is not set in your .env file.",
      }));
      return;
    }

    // Inject OneSignal SDK script if not already present
    if (!document.getElementById("onesignal-sdk")) {
      const script = document.createElement("script");
      script.id = "onesignal-sdk";
      script.src = "https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js";
      script.defer = true;
      document.head.appendChild(script);
    }

    window.OneSignalDeferred = window.OneSignalDeferred || [];

    window.OneSignalDeferred.push(async (os: OneSignalType) => {
      try {
        await os.init({
          appId: OS_APP_ID,
          notifyButton: { enable: false },   // We use our own UI
          allowLocalhostAsSecureOrigin: true, // Dev convenience
        });

        const sub = os.User.PushSubscription;
        const perm = os.Notifications.permissionNative as "default" | "granted" | "denied";

        setState(s => ({
          ...s,
          isSupported: true,
          isInitialized: true,
          isLoading: false,
          isSubscribed: sub.optedIn,
          playerId: sub.id,
          permissionState: perm,
        }));

        // Listen for subscription changes
        os.Notifications.addEventListener("permissionChange", (granted: unknown) => {
          setState(s => ({
            ...s,
            permissionState: granted ? "granted" : "denied",
            isSubscribed: os.User.PushSubscription.optedIn,
            playerId: os.User.PushSubscription.id,
          }));
        });
      } catch (err) {
        console.error("[OneSignal] Init error:", err);
        setState(s => ({
          ...s,
          isLoading: false,
          error: "Failed to initialize push notifications.",
        }));
      }
    });
  }, []);

  // ── Subscribe ─────────────────────────────────────────────────────────
  const subscribe = useCallback(async (): Promise<boolean> => {
    setState(s => ({ ...s, isLoading: true, error: null }));
    try {
      const os = window.OneSignal;
      if (!os) throw new Error("OneSignal not ready");

      await os.Notifications.requestPermission();
      await os.User.PushSubscription.optIn();

      const playerId = os.User.PushSubscription.id;
      setState(s => ({
        ...s,
        isSubscribed: true,
        isLoading: false,
        playerId,
        permissionState: "granted",
      }));
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Permission denied";
      setState(s => ({ ...s, isLoading: false, error: msg, permissionState: "denied" }));
      return false;
    }
  }, []);

  // ── Unsubscribe ───────────────────────────────────────────────────────
  const unsubscribe = useCallback(async (): Promise<void> => {
    setState(s => ({ ...s, isLoading: true }));
    try {
      await window.OneSignal?.User.PushSubscription.optOut();
      setState(s => ({ ...s, isSubscribed: false, isLoading: false, playerId: null }));
    } catch {
      setState(s => ({ ...s, isLoading: false }));
    }
  }, []);

  // ── Schedule period reminders from cycle data ─────────────────────────
  const scheduleReminders = useCallback(
    async (notifications: NotificationPayload[]): Promise<number> => {
      if (!state.isSubscribed || !state.playerId) return 0;

      let sent = 0;
      for (const n of notifications) {
        if (n.scheduledDate <= new Date()) continue; // skip past dates
        const ok = await sendOneSignalNotification(
          state.playerId,
          n.title,
          n.message,
          n.scheduledDate,
          { type: n.type, days: String(n.daysUntilPeriod) }
        );
        if (ok) sent++;
      }
      setScheduledCount(sent);
      return sent;
    },
    [state.isSubscribed, state.playerId]
  );

  // ── Send instant test notification ────────────────────────────────────
  const sendTestNotification = useCallback(async (): Promise<boolean> => {
    if (!state.playerId) return false;
    return sendOneSignalNotification(
      state.playerId,
      "🌸 CycleTracker Notifications Active",
      "You'll get reminders before your next period. Stay prepared! 💗",
    );
  }, [state.playerId]);

  // ── Build notification payloads from cycle prediction ─────────────────
  const buildPeriodReminders = useCallback(
    (predictedStartDate: string, reminderDays: number[] = [5, 3, 1]): NotificationPayload[] => {
      const start = parseISO(predictedStartDate);
      const MESSAGES: Record<number, { title: string; msg: string }> = {
        5: { title: "Period in ~5 Days 🌸", msg: "Your period is predicted in about 5 days. Stock up on supplies! 🛍️" },
        3: { title: "Period in 3 Days 🩷", msg: "Heads up — your period may start in 3 days. Take care 💗" },
        2: { title: "Period in 2 Days 💗", msg: "Your period may start the day after tomorrow. Stay prepared! 🩸" },
        1: { title: "Period Tomorrow 🩸", msg: "Your period is expected tomorrow. This is an estimate — bodies vary! 🌸" },
      };

      return reminderDays.map(days => {
        const scheduledDate = subDays(start, days);
        const tpl = MESSAGES[days] ?? {
          title: `Period in ${days} Days 🌸`,
          msg: `Your period may start in about ${days} days. 💗`,
        };
        return {
          title: tpl.title,
          message: tpl.msg,
          scheduledDate,
          daysUntilPeriod: days,
          type: "period_reminder" as const,
        };
      });
    },
    []
  );

  const buildOvulationReminder = useCallback(
    (predictedStartDate: string, avgCycleLength: number): NotificationPayload | null => {
      const start = parseISO(predictedStartDate);
      const ovulationDay = Math.round(avgCycleLength * 0.46);
      // Ovulation is ~ovulationDay days before NEXT period start
      const ovulationDate = subDays(start, avgCycleLength - ovulationDay);
      if (ovulationDate <= new Date()) return null;
      return {
        title: "🥚 Fertile Window Starting",
        message: "Your estimated fertile window begins today. Track your symptoms! 💫",
        scheduledDate: ovulationDate,
        daysUntilPeriod: avgCycleLength - ovulationDay,
        type: "ovulation_reminder",
      };
    },
    []
  );

  return {
    ...state,
    scheduledCount,
    subscribe,
    unsubscribe,
    scheduleReminders,
    sendTestNotification,
    buildPeriodReminders,
    buildOvulationReminder,
  };
}