import { useState, useCallback } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Droplets, Heart, Calendar, TrendingUp, Info, BarChart3, Clock,
  Bell, BellOff, BellRing, CheckCircle2, AlertTriangle, Loader2,
  Sparkles, Zap,
} from "lucide-react";
import {
  MenstrualFormData,
  MenstrualPrediction,
  runAppPyLogic,
  computeLiveRisk,
} from "@/lib/menstrual-ml";
import { AssessmentForm } from "@/components/menstrual/AssessmentForm";
import { MenstrualResults } from "@/components/menstrual/MenstrualResults";
import { CycleCalendar } from "@/components/menstrual/CycleCalendar";
import { PhaseRing } from "@/components/menstrual/PhaseRing";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useOneSignalNotifications } from "@/hooks/useOneSignalNotifications";

// ─────────────────────────────────────────────────────────────────────────────
type TabId = "assess" | "tracker" | "insights" | "notify" | "result";

const TABS = [
  { id: "assess"   as const, icon: Heart,      label: "Assess",   desc: "Health check" },
  { id: "tracker"  as const, icon: Calendar,   label: "Tracker",  desc: "Cycle view"   },
  { id: "insights" as const, icon: TrendingUp,  label: "Insights", desc: "Your data"   },
  { id: "notify"   as const, icon: Bell,        label: "Notify",   desc: "Reminders"   },
];

const DEFAULT_FORM: MenstrualFormData = {
  age: 25, bmi: 22.0, sleep: 7,
  stress: "", pcos: "", thyroid: "",
  period_duration: 5, flow: "", cramps: "", pimples: "",
  prev1: 28, prev2: 29, prev3: 28,
  last_period: "",
};

const ML_API_BASE = import.meta.env.VITE_ML_API_URL ?? "http://localhost:8000";

const REMINDER_OPTIONS = [
  { days: 5, label: "5 days before", emoji: "📅", desc: "Early heads-up"   },
  { days: 3, label: "3 days before", emoji: "🩷", desc: "Prepare supplies" },
  { days: 2, label: "2 days before", emoji: "💗", desc: "Stock up"         },
  { days: 1, label: "Day before",    emoji: "🩸", desc: "Final reminder"   },
];

// ─────────────────────────────────────────────────────────────────────────────
const MenstrualModule = () => {
  const { user } = useAuth();

  // ── Core state ──────────────────────────────────────────────────────────────
  const [tab, setTab]         = useState<TabId>("assess");
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState<MenstrualPrediction | null>(null);
  const [apiUsed, setApiUsed] = useState(false);
  const [form, setForm]       = useState<MenstrualFormData>({ ...DEFAULT_FORM });

  // ── Notification state ──────────────────────────────────────────────────────
  const os = useOneSignalNotifications();
  const [selectedDays, setSelectedDays]         = useState<number[]>([5, 3, 1]);
  const [includeOvulation, setIncludeOvulation] = useState(true);
  const [scheduling, setScheduling]             = useState(false);
  const [scheduled, setScheduled]               = useState(false);
  const [testSent, setTestSent]                 = useState(false);

  // ── Derived values ──────────────────────────────────────────────────────────
  const setField = useCallback(
    (key: keyof MenstrualFormData, value: MenstrualFormData[keyof MenstrualFormData]) => {
      setForm(prev => ({ ...prev, [key]: value }));
    },
    [],
  );

  const avgCycle   = Math.round((form.prev1 + form.prev2 + form.prev3) / 3);
  const dayInCycle = form.last_period
    ? Math.floor((Date.now() - new Date(form.last_period + "T12:00:00").getTime()) / 86400000)
    : 14;

  const predictedStartDate: string | null = result?.next_date_obj
    ? result.next_date_obj.toISOString().split("T")[0]
    : null;

  // ── Notification helpers ────────────────────────────────────────────────────
  const toggleDay = (day: number) => {
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day],
    );
    setScheduled(false);
  };

  const handleScheduleReminders = async () => {
    if (!predictedStartDate || !os.isSubscribed) return;
    setScheduling(true);
    const reminders = os.buildPeriodReminders(predictedStartDate, selectedDays);
    if (includeOvulation) {
      const ov = os.buildOvulationReminder(predictedStartDate, avgCycle);
      if (ov) reminders.push(ov);
    }
    await os.scheduleReminders(reminders);
    setScheduling(false);
    setScheduled(true);
  };

  const handleTestNotification = async () => {
    const ok = await os.sendTestNotification();
    if (ok) setTestSent(true);
  };

  // ── Submit handler ──────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setLoading(true);
    let prediction: MenstrualPrediction | null = null;
    let used = false;

    try {
      const payload = {
        age: form.age, bmi: form.bmi, sleep: form.sleep,
        stress: form.stress, pcos: form.pcos, thyroid: form.thyroid,
        period_duration: form.period_duration, flow: form.flow,
        cramps: form.cramps, pimples: form.pimples,
        prev1: form.prev1, prev2: form.prev2, prev3: form.prev3,
        last_period: form.last_period,
      };
      const controller = new AbortController();
      const timeoutId  = setTimeout(() => controller.abort(), 10000);
      const res = await fetch(`${ML_API_BASE}/menstrual/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        prediction = {
          result:          data.cycle_status as "Regular" | "Irregular",
          severity:        (data.severity ?? "Moderate") as "Moderate" | "High",
          medical_score:   data.medical_score ?? computeLiveRisk(form),
          ml_result:       data.ml_result ?? data.cycle_status,
          mean_cycle:      data.mean_cycle ?? (form.prev1 + form.prev2 + form.prev3) / 3,
          variation:       data.cycle_variation ?? (
            Math.max(form.prev1, form.prev2, form.prev3) -
            Math.min(form.prev1, form.prev2, form.prev3)
          ),
          predicted_cycle: data.predicted_cycle ??
            Math.floor(form.prev1 * 0.4 + form.prev2 * 0.3 + form.prev3 * 0.3),
          next_date:       data.next_period_date,
          next_date_obj:   new Date(data.next_period_date),
        };
        used = true;
      } else {
        console.warn("ML API non-OK:", res.status);
      }
    } catch (err) {
      console.warn("ML API unavailable, using local logic:", err);
    }

    if (!prediction) prediction = runAppPyLogic(form);

    if (user && prediction) {
      try {
        await supabase.from("health_assessments").insert([{
          user_id:         user.id,
          assessment_type: used ? "menstrual_ml_api" : "menstrual_ml_local",
          risk_score:      prediction.medical_score,
          risk_category:   prediction.result === "Regular" ? "low"
            : prediction.severity === "High" ? "high" : "medium",
          responses:       JSON.parse(JSON.stringify(form)),
          recommendations: JSON.parse(JSON.stringify({
            cycle_status:    prediction.result,
            severity:        prediction.severity,
            next_date:       prediction.next_date,
            predicted_cycle: prediction.predicted_cycle,
          })),
        }]);
      } catch (err) {
        console.error("Supabase save error:", err);
      }
    }

    setApiUsed(used);
    setResult(prediction);
    setScheduled(false); // reset schedule state on new result
    setTimeout(() => { setLoading(false); setTab("result"); }, used ? 0 : 800);
  };

  const handleReset = () => {
    setResult(null);
    setScheduled(false);
    setTestSent(false);
    setTab("assess");
    setForm({ ...DEFAULT_FORM });
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-20 sm:pt-24 pb-20">
        <div className="container mx-auto px-4 max-w-xl">

          {/* Page header */}
          <div className="text-center mb-5 relative">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-56 bg-gradient-radial from-primary/8 to-transparent pointer-events-none" />
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-primary/10">
              <Droplets className="w-8 h-8 sm:w-10 sm:h-10 text-primary" />
            </div>
            <h1 className="font-heading text-2xl sm:text-3xl font-bold text-foreground mb-1">
              Menstrual Cycle
              <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent"> Health</span>
            </h1>
            <p className="text-xs text-muted-foreground tracking-wide flex items-center justify-center gap-2">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-teal animate-pulse" />
              AI-powered analysis · LSTM + KNN · medical scoring
            </p>
          </div>

          {/* Tab bar */}
          {tab !== "result" && (
            <div className="flex gap-0 bg-card border border-border rounded-2xl p-1 mb-5 shadow-sm">
              {TABS.map(t => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={cn(
                    "flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 rounded-xl text-[11px] font-semibold uppercase tracking-wide transition-all duration-200",
                    tab === t.id
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                      : "text-muted-foreground hover:text-primary hover:bg-primary/5",
                  )}
                >
                  <t.icon className="w-4 h-4" />
                  {t.label}
                  <span className={cn(
                    "text-[8px] font-normal tracking-normal lowercase",
                    tab === t.id ? "text-primary-foreground/70" : "text-muted-foreground/60",
                  )}>{t.desc}</span>
                </button>
              ))}
            </div>
          )}

          {/* ════════════════════════ ASSESS ════════════════════════ */}
          {tab === "assess" && (
            <AssessmentForm form={form} setField={setField} onSubmit={handleSubmit} loading={loading} />
          )}

          {/* ════════════════════════ TRACKER ═══════════════════════ */}
          {tab === "tracker" && (
            <div className="space-y-4 animate-fade-up">
              <Card className="border-primary/10 shadow-md overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-primary via-teal to-accent" />
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Clock className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-heading text-sm font-semibold text-foreground">Current Phase</h3>
                      <p className="text-[11px] text-muted-foreground">
                        {form.last_period ? `Since ${form.last_period}` : "Set your last period date"}
                      </p>
                    </div>
                  </div>
                  <PhaseRing dayInCycle={dayInCycle} avgCycle={avgCycle} />
                </CardContent>
              </Card>

              <Card className="border-primary/10 shadow-md overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-primary to-teal" />
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-teal/10 flex items-center justify-center">
                      <Calendar className="w-4 h-4 text-teal" />
                    </div>
                    <div>
                      <h3 className="font-heading text-sm font-semibold text-foreground">Cycle Calendar</h3>
                      <p className="text-[11px] text-muted-foreground">Tap any day for details</p>
                    </div>
                  </div>
                  <CycleCalendar lastPeriod={form.last_period} avgCycle={avgCycle} periodDuration={form.period_duration} />
                </CardContent>
              </Card>

              {form.last_period && (
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: `${avgCycle}d`,            label: "Avg Cycle", color: "text-primary", bg: "bg-primary/5 border-primary/10" },
                    { value: `${form.period_duration}d`, label: "Period",    color: "text-accent",  bg: "bg-accent/5 border-accent/10"   },
                    { value: `Day ${dayInCycle}`,        label: "Current",   color: "text-teal",    bg: "bg-teal/5 border-teal/10"       },
                  ].map(s => (
                    <div key={s.label} className={cn("text-center p-3 rounded-xl border", s.bg)}>
                      <div className={cn("font-heading text-lg font-bold", s.color)}>{s.value}</div>
                      <div className="text-[9px] text-muted-foreground uppercase tracking-wider">{s.label}</div>
                    </div>
                  ))}
                </div>
              )}

              {!form.last_period && (
                <div className="text-center py-6 space-y-3 bg-muted/20 rounded-2xl border border-dashed border-border">
                  <Info className="w-8 h-8 text-muted-foreground/30 mx-auto" />
                  <p className="text-sm text-muted-foreground">Complete the assessment first to see your cycle data.</p>
                  <Button variant="outline" size="sm" onClick={() => setTab("assess")} className="gap-1.5">
                    <Heart className="w-3.5 h-3.5" /> Go to Assessment
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* ════════════════════════ INSIGHTS ══════════════════════ */}
          {tab === "insights" && (
            <div className="space-y-4 animate-fade-up">
              {result ? (
                <>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: avgCycle,             label: "Avg Cycle",  unit: "days", color: "text-primary", bg: "bg-primary/5 border-primary/10" },
                      {
                        value: result.medical_score,  label: "Risk Score", unit: "pts",
                        color: result.medical_score < 3 ? "text-teal" : "text-primary",
                        bg:    result.medical_score < 3 ? "bg-teal/5 border-teal/10" : "bg-primary/5 border-primary/10",
                      },
                      { value: form.period_duration, label: "Period",     unit: "days", color: "text-accent", bg: "bg-accent/5 border-accent/10" },
                    ].map(stat => (
                      <div key={stat.label} className={cn("text-center p-3 rounded-xl border", stat.bg)}>
                        <div className={cn("font-heading text-2xl font-bold", stat.color)}>{stat.value}</div>
                        <div className="text-[9px] text-muted-foreground uppercase tracking-wider mt-0.5">{stat.unit}</div>
                        <div className="text-[10px] text-muted-foreground font-medium">{stat.label}</div>
                      </div>
                    ))}
                  </div>
                  <Card className="border-primary/10 shadow-md">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <BarChart3 className="w-4 h-4 text-primary" />
                        <h3 className="font-heading text-sm font-semibold text-foreground">Analysis Summary</h3>
                      </div>
                      <div className="space-y-2">
                        {[
                          { label: "Cycle Status",    value: result.result,                   ok: result.result === "Regular" },
                          { label: "Predicted Cycle", value: `${result.predicted_cycle} days`, ok: true },
                          { label: "Next Period",     value: result.next_date,                 ok: true },
                          { label: "Variation",       value: `${result.variation} days`,       ok: result.variation <= 7 },
                          { label: "Severity",        value: result.severity,                  ok: result.severity === "Moderate" },
                          { label: "Source",          value: apiUsed ? "ML API (LSTM+KNN)" : "Local Logic", ok: apiUsed },
                        ].map(item => (
                          <div key={item.label} className="flex justify-between items-center py-2 px-3 rounded-lg bg-muted/30">
                            <span className="text-sm text-muted-foreground">{item.label}</span>
                            <Badge variant="secondary" className={cn("text-xs font-semibold",
                              item.ok ? "bg-teal/10 text-teal" : "bg-primary/10 text-primary",
                            )}>{item.value}</Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <div className="text-center py-12 space-y-4 bg-muted/20 rounded-2xl border border-dashed border-border">
                  <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto">
                    <TrendingUp className="w-7 h-7 text-muted-foreground/30" />
                  </div>
                  <h3 className="font-heading text-lg font-semibold text-foreground">No Data Yet</h3>
                  <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                    Complete an assessment to see your cycle insights.
                  </p>
                  <Button onClick={() => setTab("assess")} size="sm" className="shadow-lg shadow-primary/20 gap-1.5">
                    <Heart className="w-3.5 h-3.5" /> Start Assessment
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* ════════════════════════ NOTIFY ════════════════════════ */}
          {tab === "notify" && (
            <div className="space-y-4 animate-fade-up">

              {/* Section header */}
              <div className="text-center mb-1">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-3">
                  <Bell className="w-6 h-6 text-primary" />
                </div>
                <h2 className="font-heading text-lg font-bold text-foreground">Push Notifications</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Period &amp; ovulation reminders via OneSignal — free, no spam
                </p>
              </div>

              {/* Browser not supported */}
              {!os.isLoading && !os.isSupported && (
                <div className="rounded-2xl border border-dashed border-border p-5 text-center space-y-2">
                  <BellOff className="w-8 h-8 text-muted-foreground/30 mx-auto" />
                  <p className="text-sm text-muted-foreground">
                    Push notifications are not supported in this browser.
                  </p>
                </div>
              )}

              {/* Env key missing */}
              {!os.isLoading && os.error?.includes("VITE_ONESIGNAL_APP_ID") && (
                <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-destructive">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="text-sm font-semibold">OneSignal not configured</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Add{" "}
                    <code className="bg-muted px-1 rounded text-xs">VITE_ONESIGNAL_APP_ID=your_app_id</code>
                    {" "}to your <code className="bg-muted px-1 rounded text-xs">.env</code>.
                    Get a free App ID at{" "}
                    <a href="https://onesignal.com" target="_blank" rel="noopener noreferrer"
                      className="text-primary underline underline-offset-2">onesignal.com</a>.
                  </p>
                </div>
              )}

              {/* Subscription card */}
              {os.isSupported && !os.error?.includes("VITE_ONESIGNAL_APP_ID") && (
                <div className={cn(
                  "relative rounded-2xl p-5 overflow-hidden border",
                  os.isSubscribed
                    ? "bg-gradient-to-br from-teal/8 to-teal/3 border-teal/20"
                    : "bg-gradient-to-br from-primary/8 to-primary/3 border-primary/20",
                )}>
                  <div className="absolute -top-8 -right-8 w-28 h-28 rounded-full opacity-[0.06] bg-primary" />

                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-11 h-11 rounded-xl flex items-center justify-center shadow-sm",
                        os.isSubscribed ? "bg-teal/15" : "bg-primary/15",
                      )}>
                        {os.isLoading
                          ? <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                          : os.isSubscribed
                            ? <BellRing className="w-5 h-5 text-teal" />
                            : <Bell className="w-5 h-5 text-primary" />
                        }
                      </div>
                      <div>
                        <h3 className="font-heading text-sm font-bold text-foreground">Period Reminders</h3>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {os.isSubscribed
                            ? "Push notifications active via OneSignal"
                            : "Get notified before your period starts"}
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary" className={cn(
                      "text-[10px] px-2 py-1 flex-shrink-0",
                      os.isSubscribed ? "bg-teal/10 text-teal border-teal/20" : "bg-muted text-muted-foreground",
                    )}>
                      <Sparkles className="w-2.5 h-2.5 mr-1" />Free
                    </Badge>
                  </div>

                  {/* Status row */}
                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={cn("w-2 h-2 rounded-full",
                        os.isLoading                    ? "bg-muted-foreground animate-pulse"
                        : os.isSubscribed               ? "bg-teal animate-pulse"
                        : os.permissionState === "denied" ? "bg-destructive"
                        : "bg-muted-foreground",
                      )} />
                      <span className="text-xs text-muted-foreground">
                        {os.isLoading                     ? "Initializing…"
                        : os.isSubscribed                 ? "Subscribed"
                        : os.permissionState === "denied" ? "Permission denied"
                        : "Not subscribed"}
                      </span>
                    </div>

                    {!os.isSubscribed && !os.isLoading && os.permissionState !== "denied" && (
                      <Button
                        size="sm" onClick={() => os.subscribe()} disabled={!os.isInitialized}
                        className="h-8 text-xs gap-1.5 shadow-md shadow-primary/20"
                      >
                        <Bell className="w-3.5 h-3.5" /> Enable
                      </Button>
                    )}

                    {os.isSubscribed && (
                      <Button size="sm" variant="ghost" onClick={os.unsubscribe}
                        className="h-8 text-xs text-muted-foreground gap-1.5">
                        <BellOff className="w-3 h-3" /> Disable
                      </Button>
                    )}
                  </div>

                  {/* Permission denied */}
                  {os.permissionState === "denied" && (
                    <div className="mt-3 flex items-start gap-2 p-2.5 rounded-xl bg-destructive/5 border border-destructive/15">
                      <AlertTriangle className="w-3.5 h-3.5 text-destructive flex-shrink-0 mt-0.5" />
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        Notifications are blocked. Enable them in your browser settings, then refresh.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* ── All options below: only when subscribed ── */}
              {os.isSubscribed && (
                <>
                  {/* Predicted period banner */}
                  {result && predictedStartDate && (
                    <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-primary/5 border border-primary/15">
                      <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Calendar className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-[11px] text-muted-foreground">Next period predicted</p>
                        <p className="text-sm font-bold text-foreground">{result.next_date}</p>
                      </div>
                      <Badge variant="secondary" className="ml-auto bg-primary/10 text-primary border-primary/20 text-[10px]">
                        ~{result.predicted_cycle}d cycle
                      </Badge>
                    </div>
                  )}

                  {/* No assessment nudge */}
                  {!result && (
                    <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-muted/30 border border-dashed border-border">
                      <Info className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-semibold text-foreground">Complete assessment first</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Run the health assessment to get your predicted period date, then schedule reminders here.
                        </p>
                        <Button size="sm" variant="outline" className="mt-2 h-7 text-xs gap-1"
                          onClick={() => setTab("assess")}>
                          <Heart className="w-3 h-3" /> Go to Assessment
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Reminder timing grid */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
                      Remind me before period
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      {REMINDER_OPTIONS.map(opt => {
                        const active = selectedDays.includes(opt.days);
                        return (
                          <button key={opt.days} onClick={() => toggleDay(opt.days)}
                            className={cn(
                              "flex items-center gap-3 p-3 rounded-xl border text-left transition-all duration-200",
                              active ? "bg-primary/8 border-primary/30 shadow-sm" : "bg-muted/30 border-transparent hover:border-border",
                            )}>
                            <span className="text-xl leading-none">{opt.emoji}</span>
                            <div className="flex-1 min-w-0">
                              <p className={cn("text-xs font-semibold truncate", active ? "text-primary" : "text-foreground")}>
                                {opt.label}
                              </p>
                              <p className="text-[10px] text-muted-foreground">{opt.desc}</p>
                            </div>
                            <div className={cn(
                              "w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors",
                              active ? "border-primary bg-primary" : "border-border bg-transparent",
                            )}>
                              {active && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Ovulation toggle */}
                  <div className={cn(
                    "flex items-center justify-between p-3.5 rounded-xl border transition-colors",
                    includeOvulation ? "bg-teal/5 border-teal/20" : "bg-muted/30 border-transparent",
                  )}>
                    <div className="flex items-center gap-3">
                      <span className="text-xl">🥚</span>
                      <div>
                        <p className="text-xs font-semibold text-foreground">Ovulation reminder</p>
                        <p className="text-[10px] text-muted-foreground">Notify on estimated fertile window</p>
                      </div>
                    </div>
                    <Switch checked={includeOvulation}
                      onCheckedChange={(v) => { setIncludeOvulation(v); setScheduled(false); }} />
                  </div>

                  {/* Schedule button */}
                  <Button className="w-full h-12 gap-2 shadow-lg shadow-primary/20"
                    onClick={handleScheduleReminders}
                    disabled={scheduling || scheduled || selectedDays.length === 0 || !predictedStartDate}>
                    {scheduling ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Scheduling…</>
                    ) : scheduled ? (
                      <><CheckCircle2 className="w-4 h-4" /> {os.scheduledCount} Reminder{os.scheduledCount !== 1 ? "s" : ""} Scheduled!</>
                    ) : (
                      <><BellRing className="w-4 h-4" /> Schedule Reminders</>
                    )}
                  </Button>

                  {!predictedStartDate && (
                    <p className="text-center text-xs text-muted-foreground -mt-2">
                      Complete the assessment first to enable scheduling.
                    </p>
                  )}

                  {/* Test notification */}
                  <button onClick={handleTestNotification} disabled={testSent}
                    className="w-full flex items-center justify-center gap-1.5 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
                    {testSent
                      ? <><CheckCircle2 className="w-3.5 h-3.5 text-teal" /> Test notification sent!</>
                      : <><Zap className="w-3.5 h-3.5" /> Send a test notification</>
                    }
                  </button>
                </>
              )}

              {/* How it works — unsubscribed state */}
              {!os.isSubscribed && !os.isLoading && os.permissionState !== "denied"
                && !os.error?.includes("VITE_ONESIGNAL_APP_ID") && (
                <div className="rounded-xl border border-dashed border-border p-4 space-y-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">How it works</p>
                  {[
                    { emoji: "🔔", text: "Click Enable above to allow notifications" },
                    { emoji: "📅", text: "We'll remind you 5, 3 & 1 day before your period" },
                    { emoji: "🥚", text: "Optionally get ovulation window alerts" },
                    { emoji: "🔒", text: "Powered by OneSignal — free & privacy-first" },
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <span className="text-base leading-none mt-0.5">{item.emoji}</span>
                      <p className="text-xs text-muted-foreground leading-relaxed">{item.text}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Generic SDK error */}
              {os.error && !os.error.includes("VITE_ONESIGNAL") && (
                <p className="text-xs text-destructive text-center">{os.error}</p>
              )}

            </div>
          )}

          {/* ════════════════════════ RESULT ════════════════════════ */}
          {tab === "result" && result && (
            <MenstrualResults prediction={result} form={form} apiUsed={apiUsed} onReset={handleReset} />
          )}

        </div>
      </main>
      <Footer />
    </div>
  );
};

export default MenstrualModule;