/**
 * ml-predictions.ts
 * PCOS + Menopause → real FastAPI backend (localhost:8000)
 * Falls back to local TypeScript logic if API is unavailable
 */

const ML_API_BASE = (import.meta as any).env?.VITE_ML_API_URL ?? "http://localhost:8000";

// ── Shared ──────────────────────────────────────────────────────────────────
export interface MLPredictionMeta { usedAPI: boolean; error?: string; }

// ── PCOS Types ───────────────────────────────────────────────────────────────
export interface PCOSInputData {
  age: number; height: number; weight: number; bmi: number;
  cycleRegular: boolean; cycleLength: number;
  weightGain: boolean; hairGrowth: boolean; skinDarkening: boolean;
  hairLoss: boolean; pimples: boolean; fastFood: boolean; regularExercise: boolean;
  follicleLeft: number; follicleRight: number; endometrium: number;
  lh: number; fsh: number; testosterone: number; insulin: number;
}
export interface PCOSRecommendations { diet: string[]; exercise: string[]; lifestyle: string[]; needsDoctor: boolean; }
export interface PCOSResult {
  hasPCOS: boolean; riskPercentage: number;
  severity: 'none' | 'low' | 'medium' | 'high';
  breakdown: { cycleScore: number; hormonalScore: number; ultrasoundScore: number; metabolicScore: number; };
  recommendations: PCOSRecommendations;
}

// ── Menopause Types ──────────────────────────────────────────────────────────
export interface MenopauseInputData {
  age: number; estrogenLevel: number; fshLevel: number; yearsSinceLastPeriod: number;
  irregularPeriods: boolean; missedPeriods: boolean; hotFlashes: boolean;
  nightSweats: boolean; sleepProblems: boolean; vaginalDryness: boolean; jointPain: boolean;
}
export interface MenopauseRecommendations { diet: string[]; exercise: string[]; lifestyle: string[]; needsDoctor: boolean; }
export interface MenopauseResult {
  stage: 'Pre-Menopause' | 'Peri-Menopause' | 'Post-Menopause';
  riskPercentage: number; hasMenopauseSymptoms: boolean;
  breakdown: { ageScore: number; hormoneScore: number; symptomScore: number; periodScore: number; };
  recommendations: MenopauseRecommendations;
}

// ── Cycle Types (kept for compatibility) ─────────────────────────────────────
export interface CycleData {
  cycleHistory: number[]; lastPeriodStart: Date;
  symptoms?: { cramps?: 'none'|'mild'|'severe'; mood?: 'stable'|'irritable'|'depressed'; acne?: boolean; bloating?: boolean; fatigue?: boolean; };
  stressLevel?: number; sleepHours?: number;
}
export interface CyclePrediction {
  predictedStartDate: Date; confidenceLevel: 'high'|'medium'|'low';
  averageCycleLength: number; cycleVariability: number;
  isIrregular: boolean; pcosRiskFlag: boolean; delayAdjustment: number;
}

// ════════════════════════════════════════════════════════════════════════════
// LOCAL FALLBACK — PCOS
// ════════════════════════════════════════════════════════════════════════════
function getPCOSRecommendations(severity: 'none'|'low'|'medium'|'high'): PCOSRecommendations {
  const map: Record<string, PCOSRecommendations> = {
    none:   { diet: ['Maintain balanced diet with whole grains','Include fresh fruits and vegetables','Stay hydrated with 2-3 liters water daily','Include lean protein sources'], exercise: ['Continue regular physical activity','30 minutes of moderate exercise daily','Mix of cardio and strength training'], lifestyle: ['Maintain healthy sleep schedule','Regular health check-ups annually','Stress management practices'], needsDoctor: false },
    low:    { diet: ['Low glycemic index foods (millets, oats, brown rice)','Fresh vegetables (spinach, broccoli, carrot, cucumber)','Fruits in moderation (apple, berries, guava)','Lean protein sources (dal, paneer, eggs, fish)','Healthy fats (nuts, seeds, olive oil)','Drink 2–3 liters of water daily'], exercise: ['Brisk walking – 30 minutes daily','Yoga (Surya Namaskar, Anulom Vilom)','Light stretching exercises','Minimum 5 days per week'], lifestyle: ['Sleep 7–8 hours daily','Reduce stress through meditation','Avoid late-night meals','Maintain a regular daily routine'], needsDoctor: false },
    medium: { diet: ['Strict low-GI diet to reduce insulin resistance','High-fiber foods (vegetables, salads, sprouts)','Protein in every meal (eggs, pulses, fish)','Small and frequent meals','Anti-inflammatory foods (turmeric, berries, nuts)','Completely avoid sugar, fast food, bakery items'], exercise: ['Cardio workouts (walking/jogging) – 30–40 minutes','Strength training – 3 to 4 days per week','Yoga for hormone balance','Beginner-level HIIT exercises'], lifestyle: ['Fixed sleep and wake-up time','Weight monitoring every week','Reduce screen time','Stress management is mandatory'], needsDoctor: true },
    high:   { diet: ['Very strict low-glycemic-index diet','High-fiber vegetables in every meal','Lean protein with each meal','Anti-inflammatory foods only','Complete elimination of sugar, maida, fried food','Avoid alcohol, soft drinks, and packaged foods','Calorie-controlled meals under medical guidance'], exercise: ['HIIT workouts (doctor-approved)','Resistance training for insulin sensitivity','Cardio exercises – 45 to 60 minutes daily','Daily yoga for hormonal balance','Consistency is critical'], lifestyle: ['Strict daily routine','Mental health care and counseling if needed','Avoid crash dieting','Track menstrual cycle and symptoms monthly','Long-term lifestyle discipline required'], needsDoctor: true },
  };
  return map[severity];
}

export function predictPCOS(data: PCOSInputData): PCOSResult {
  const cycleScore      = data.cycleRegular ? 0 : 1;
  const hormonalScore   = +data.hairGrowth + +data.skinDarkening + +data.hairLoss + +data.pimples;
  const ultrasoundScore = (data.follicleLeft + data.follicleRight) >= 10 ? 1 : 0;
  const metabolicScore  = data.bmi >= 25 ? 1 : 0;
  const lifestyleScore  = (+data.weightGain * 0.5) + (+data.fastFood * 0.5) + (!data.regularExercise ? 0.5 : 0);
  const totalScore      = 2*cycleScore + 2*ultrasoundScore + hormonalScore + metabolicScore + lifestyleScore;
  const hasPCOS         = totalScore >= 4;
  let riskPercentage    = Math.min(100, Math.max(hasPCOS ? 30 : 0, Math.round((totalScore/9)*100)));
  const severity: PCOSResult['severity'] = !hasPCOS ? 'none' : riskPercentage < 50 ? 'low' : riskPercentage < 70 ? 'medium' : 'high';
  return { hasPCOS, riskPercentage, severity, breakdown: { cycleScore: cycleScore*2, hormonalScore, ultrasoundScore: ultrasoundScore*2, metabolicScore }, recommendations: getPCOSRecommendations(severity) };
}

// ════════════════════════════════════════════════════════════════════════════
// LOCAL FALLBACK — MENOPAUSE
// ════════════════════════════════════════════════════════════════════════════
function getMenopauseRecommendations(stage: MenopauseResult['stage']): MenopauseRecommendations {
  const map: Record<string, MenopauseRecommendations> = {
    'Pre-Menopause':  { diet: ['Maintain balanced nutrition','Include calcium-rich foods','Stay hydrated','Moderate caffeine intake'], exercise: ['Regular cardio and strength training','Maintain bone health with weight-bearing exercises','Stay active 30 minutes daily'], lifestyle: ['Regular health check-ups','Stress management','Quality sleep habits'], needsDoctor: false },
    'Peri-Menopause': { diet: ['Low-GI foods: oats, brown rice, whole wheat roti','High-fiber foods: salads, sprouts, flax seeds','Protein sources: eggs, pulses, soy, paneer','Healthy fats: nuts, seeds, olive oil','Calcium-rich foods: milk, curd, ragi','Vitamin-D foods or supplements (doctor advice)','Avoid: Sugar, bakery items, excess caffeine'], exercise: ['Brisk walking – 30 to 40 minutes daily','Yoga: Anulom-Vilom, Bhramari, Surya Namaskar','Strength training – 2 to 3 days per week','Light cardio (cycling, skipping)'], lifestyle: ['Fixed sleep and wake-up time','Daily meditation or breathing exercises','Stress management is very important','Maintain healthy body weight'], needsDoctor: true },
    'Post-Menopause': { diet: ['High-calcium foods: milk, cheese, curd, sesame seeds','Vitamin-D rich foods or supplements','High-protein diet: lentils, eggs, fish, tofu','Anti-inflammatory foods: turmeric, berries, green tea','Plenty of fruits and vegetables','Avoid: Fried food, excess salt, sugary foods'], exercise: ['Weight-bearing exercises: walking, stair climbing','Light strength training (resistance bands, dumbbells)','Balance exercises to prevent falls','Stretching and flexibility exercises'], lifestyle: ['Regular medical check-ups','Bone density test (doctor advice)','Avoid smoking and alcohol','Maintain a stress-free routine'], needsDoctor: true },
  };
  return map[stage];
}

export function predictMenopause(data: MenopauseInputData): MenopauseResult {
  let stage: MenopauseResult['stage'];
  if (data.yearsSinceLastPeriod >= 1) stage = 'Post-Menopause';
  else if (data.age >= 40 && (data.irregularPeriods || data.missedPeriods || data.hotFlashes)) stage = 'Peri-Menopause';
  else stage = 'Pre-Menopause';
  const ageScore     = data.age >= 55 ? 4 : data.age >= 50 ? 3 : data.age >= 45 ? 2 : data.age >= 40 ? 1 : 0;
  let hormoneScore   = 0;
  if (data.fshLevel >= 40) hormoneScore += 2; else if (data.fshLevel >= 25) hormoneScore += 1;
  if (data.estrogenLevel <= 30) hormoneScore += 2; else if (data.estrogenLevel <= 50) hormoneScore += 1;
  const symptomScore = [data.irregularPeriods,data.missedPeriods,data.hotFlashes,data.nightSweats,data.sleepProblems,data.vaginalDryness,data.jointPain].filter(Boolean).length;
  const periodScore  = data.yearsSinceLastPeriod >= 2 ? 4 : data.yearsSinceLastPeriod >= 1 ? 3 : data.yearsSinceLastPeriod >= 0.5 ? 2 : data.yearsSinceLastPeriod > 0 ? 1 : 0;
  const riskPercentage = Math.min(100, Math.max(0, Math.round(((ageScore+hormoneScore+symptomScore+periodScore)/19)*100)));
  return { stage, riskPercentage, hasMenopauseSymptoms: stage !== 'Pre-Menopause', breakdown: { ageScore, hormoneScore, symptomScore, periodScore }, recommendations: getMenopauseRecommendations(stage) };
}

// ════════════════════════════════════════════════════════════════════════════
// API — PCOS  →  POST /pcos/predict
// ════════════════════════════════════════════════════════════════════════════
export async function predictPCOSFromAPI(data: PCOSInputData): Promise<PCOSResult & { _meta: MLPredictionMeta }> {
  try {
    const res  = await fetch(`${ML_API_BASE}/pcos/predict`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (json.fallback) throw new Error(json.error ?? "fallback");
    const p        = json.prediction;
    const severity: PCOSResult['severity'] = p.severity === 'high' ? 'high' : p.severity === 'medium' ? 'medium' : p.severity === 'low' ? 'low' : 'none';
    const result: PCOSResult = { hasPCOS: p.hasPCOS ?? false, riskPercentage: p.riskPercentage ?? 0, severity, breakdown: p.breakdown ?? { cycleScore:0, hormonalScore:0, ultrasoundScore:0, metabolicScore:0 }, recommendations: p.recommendations ?? getPCOSRecommendations(severity) };
    return { ...result, _meta: { usedAPI: true } };
  } catch (err) {
    console.warn("PCOS API unavailable, local fallback:", err);
    return { ...predictPCOS(data), _meta: { usedAPI: false, error: err instanceof Error ? err.message : "Unknown" } };
  }
}

// ════════════════════════════════════════════════════════════════════════════
// API — MENOPAUSE  →  POST /menopause/predict
// ════════════════════════════════════════════════════════════════════════════
export async function predictMenopauseFromAPI(data: MenopauseInputData): Promise<MenopauseResult & { _meta: MLPredictionMeta }> {
  try {
    const res  = await fetch(`${ML_API_BASE}/menopause/predict`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (json.fallback) throw new Error(json.error ?? "fallback");
    const p     = json.prediction;
    const stage: MenopauseResult['stage'] = p.stage === 'Post-Menopause' ? 'Post-Menopause' : p.stage === 'Peri-Menopause' ? 'Peri-Menopause' : 'Pre-Menopause';
    const result: MenopauseResult = { stage, riskPercentage: p.riskPercentage ?? 0, hasMenopauseSymptoms: p.hasMenopauseSymptoms ?? stage !== 'Pre-Menopause', breakdown: p.breakdown ?? { ageScore:0, hormoneScore:0, symptomScore:0, periodScore:0 }, recommendations: p.recommendations ?? getMenopauseRecommendations(stage) };
    return { ...result, _meta: { usedAPI: true } };
  } catch (err) {
    console.warn("Menopause API unavailable, local fallback:", err);
    return { ...predictMenopause(data), _meta: { usedAPI: false, error: err instanceof Error ? err.message : "Unknown" } };
  }
}

// ════════════════════════════════════════════════════════════════════════════
// CYCLE (local only — menstrual uses separate MenstrualModule)
// ════════════════════════════════════════════════════════════════════════════
export function predictNextCycle(data: CycleData): CyclePrediction {
  const { cycleHistory, lastPeriodStart, stressLevel, sleepHours, symptoms } = data;
  if (cycleHistory.length === 0) { const d = new Date(lastPeriodStart); d.setDate(d.getDate()+28); return { predictedStartDate: d, confidenceLevel: 'low', averageCycleLength: 28, cycleVariability: 0, isIrregular: false, pcosRiskFlag: false, delayAdjustment: 0 }; }
  const recent = cycleHistory.slice(-6);
  const weights = recent.map((_,i)=>i+1); const totalW = weights.reduce((a,b)=>a+b,0);
  const wavg = recent.reduce((s,c,i)=>s+c*weights[i],0)/totalW;
  const mean = recent.reduce((a,b)=>a+b,0)/recent.length;
  const variability = Math.sqrt(recent.reduce((s,c)=>s+Math.pow(c-mean,2),0)/recent.length);
  const confidenceLevel: CyclePrediction['confidenceLevel'] = variability<=2&&cycleHistory.length>=3?'high':variability<=5||cycleHistory.length>=6?'medium':'low';
  const isIrregular = variability>7||recent.some(c=>c<21||c>35);
  const pcosRiskFlag = recent.filter(c=>c>35).length>=3||(isIrregular&&!!symptoms?.acne&&(symptoms?.cramps==='severe'||symptoms?.mood==='irritable'));
  let delayAdjustment=0; if(stressLevel&&stressLevel>=4)delayAdjustment+=2; if(sleepHours&&sleepHours<6)delayAdjustment+=1;
  const predictedDate = new Date(lastPeriodStart); predictedDate.setDate(predictedDate.getDate()+Math.round(wavg)+delayAdjustment);
  return { predictedStartDate: predictedDate, confidenceLevel, averageCycleLength: Math.round(wavg), cycleVariability: Math.round(variability*10)/10, isIrregular, pcosRiskFlag, delayAdjustment };
}
export async function predictCycleFromAPI(data: CycleData): Promise<CyclePrediction & { _meta: MLPredictionMeta }> {
  return { ...predictNextCycle(data), _meta: { usedAPI: false } };
}
export function getNotificationSchedule(predictedDate: Date, isIrregular: boolean): { date: Date; message: string; daysBefore: number }[] {
  return (isIrregular ? [5,3,1] : [3,2,1]).map(daysBefore => { const d=new Date(predictedDate); d.setDate(d.getDate()-daysBefore); return { date: d, message: `Your period may start in ${daysBefore} day${daysBefore>1?'s':''} 🌸`, daysBefore }; });
}