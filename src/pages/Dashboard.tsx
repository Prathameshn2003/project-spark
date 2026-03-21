import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { 
  Activity, Droplets, ChevronRight, Thermometer,
  Stethoscope, FileText, BookOpen, Calendar,
  Sun, Moon, Sparkles
} from "lucide-react";
import logoImg from "@/assets/logo.png";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useCycleTracking } from "@/hooks/useCycleTracking";
import { useHealthAssessments } from "@/hooks/useHealthAssessments";
import { differenceInDays, parseISO } from "date-fns";
import { useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";

const dashboardSections = [
  { icon: FileText, title: "Medical Reports", description: "Upload & manage documents", path: "/dashboard/documents", color: "text-accent", bgColor: "bg-accent/15" },
  { icon: Stethoscope, title: "Find Doctors", description: "Connect with specialists", path: "/doctors", color: "text-teal", bgColor: "bg-teal/15" },
  { icon: BookOpen, title: "Health Resources", description: "Educational content", path: "/health-resources", color: "text-primary", bgColor: "bg-primary/15" },
  { icon: FileText, title: "Govt. Schemes", description: "Explore health benefits", path: "/schemes", color: "text-accent", bgColor: "bg-accent/15" },
];

const getRiskColor = (category: string | null) => {
  if (!category) return "text-muted-foreground";
  const lower = category.toLowerCase();
  if (lower === "high" || lower === "severe") return "text-destructive";
  if (lower === "moderate" || lower === "medium") return "text-accent";
  return "text-teal";
};

const getRiskLabel = (category: string | null) => {
  if (!category) return null;
  const lower = category.toLowerCase();
  if (lower === "high" || lower === "severe") return "High Risk";
  if (lower === "moderate" || lower === "medium") return "Moderate Risk";
  if (lower === "low" || lower === "none") return "Low Risk";
  return category;
};

const getMenopauseStage = (category: string | null) => {
  if (!category) return null;
  const lower = category.toLowerCase();
  if (lower === "high") return "Post-Menopause";
  if (lower === "medium" || lower === "moderate") return "Peri-Menopause";
  return "Pre-Menopause";
};

const Dashboard = () => {
  const { user } = useAuth();
  const { cycleLogs, loading: cycleLoading, insights } = useCycleTracking();
  const { pcosAssessment, menopauseAssessment, menstrualAssessment, loading: assessmentLoading } = useHealthAssessments();
  const userName = user?.user_metadata?.full_name?.split(' ')[0] || 'there';
  const loading = cycleLoading || assessmentLoading;

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return { text: "Good morning", icon: Sun };
    if (hour < 18) return { text: "Good afternoon", icon: Sun };
    return { text: "Good evening", icon: Moon };
  }, []);

  const cycleData = useMemo(() => {
    if (cycleLogs.length === 0) {
      return { currentDay: null, cycleLength: 28, phase: "unknown" };
    }
    const latestCycle = cycleLogs[0];
    const cycleStart = parseISO(latestCycle.start_date);
    const today = new Date();
    const dayOfCycle = differenceInDays(today, cycleStart) + 1;
    const cycleLength = insights.averageCycleLength || 28;
    const periodLength = latestCycle.period_length || insights.averagePeriodLength || 5;
    const ovulationCenter = Math.round(cycleLength / 2);

    let phase = "follicular";
    if (dayOfCycle <= periodLength) phase = "menstrual";
    else if (dayOfCycle >= ovulationCenter - 2 && dayOfCycle <= ovulationCenter + 2) phase = "ovulation";
    else if (dayOfCycle > ovulationCenter + 2) phase = "luteal";

    return {
      currentDay: dayOfCycle > 0 && dayOfCycle <= cycleLength ? dayOfCycle : null,
      cycleLength,
      phase,
    };
  }, [cycleLogs, insights]);

  // Build health cards from real data
  const healthCards = useMemo(() => {
    const pcosRiskLabel = pcosAssessment ? getRiskLabel(pcosAssessment.risk_category) : null;
    const pcosScore = pcosAssessment?.risk_score != null ? Math.round(100 - pcosAssessment.risk_score) : null;
    
    const menopauseStage = menopauseAssessment ? getMenopauseStage(menopauseAssessment.risk_category) : null;

    // Menstrual assessment data
    const menstrualStatus = menstrualAssessment
      ? (menstrualAssessment.risk_category === "low" ? "Regular" : "Irregular")
      : (cycleData.currentDay ? `Day ${cycleData.currentDay} of Cycle` : null);
    const menstrualMetric = menstrualAssessment
      ? `${menstrualAssessment.risk_score != null ? Math.round(menstrualAssessment.risk_score) : 0}%`
      : (cycleLogs.length > 0 ? `${insights.averageCycleLength} days` : null);
    const menstrualMetricLabel = menstrualAssessment ? "Risk Score" : "Average Cycle";

    return [
      {
        title: "Menstrual Health",
        status: menstrualStatus || "Start tracking",
        statusColor: menstrualAssessment
          ? getRiskColor(menstrualAssessment.risk_category)
          : (cycleData.currentDay ? "text-teal" : "text-muted-foreground"),
        icon: Droplets,
        iconBg: "bg-teal/15",
        iconColor: "text-teal",
        path: "/modules/menstrual",
        metric: menstrualMetric,
        metricLabel: menstrualMetricLabel,
        hasData: !!menstrualAssessment || cycleLogs.length > 0,
      },
      {
        title: "PCOS Risk",
        status: pcosRiskLabel || null,
        statusColor: pcosAssessment ? getRiskColor(pcosAssessment.risk_category) : "text-muted-foreground",
        icon: Activity,
        iconBg: "bg-accent/15",
        iconColor: "text-accent",
        path: "/modules/pcos",
        metric: pcosScore != null ? `${pcosScore}%` : null,
        metricLabel: "Health Score",
        hasData: !!pcosAssessment,
      },
      {
        title: "Menopause Stage",
        status: menopauseStage || null,
        statusColor: menopauseAssessment ? getRiskColor(menopauseAssessment.risk_category) : "text-muted-foreground",
        icon: Thermometer,
        iconBg: "bg-primary/15",
        iconColor: "text-primary",
        path: "/modules/menopause",
        metric: menopauseAssessment?.risk_score != null ? `${Math.round(menopauseAssessment.risk_score)}%` : null,
        metricLabel: "Risk Score",
        hasData: !!menopauseAssessment,
      },
    ];
  }, [cycleData, cycleLogs, insights, pcosAssessment, menopauseAssessment, menstrualAssessment]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6 md:space-y-8">
          <Skeleton className="h-48 rounded-2xl" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-44 rounded-xl" />)}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 md:space-y-8 animate-fade-up">
        {/* Welcome Hero Section */}
        <div className="relative overflow-hidden glass-card rounded-2xl p-6 md:p-8 bg-gradient-to-br from-primary/10 via-secondary/10 to-teal/10">
          <div className="absolute top-0 right-0 w-32 h-32 md:w-48 md:h-48 bg-primary/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-24 h-24 md:w-32 md:h-32 bg-teal/20 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />
          
          <div className="relative z-10">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
                <Heart className="w-6 h-6 text-primary-foreground fill-current" />
              </div>
              <span className="font-heading font-bold text-xl text-foreground">
                Naari<span className="text-accent">Care</span>
              </span>
            </div>
            
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <greeting.icon className="w-4 h-4" />
              <span className="text-sm">{greeting.text}</span>
            </div>
            <h1 className="font-heading text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-3">
              Welcome back, {userName}! 👋
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base max-w-lg">
              Here's your personalized health summary. Track your cycle, monitor your health, and access resources all in one place.
            </p>
            
            <div className="flex flex-wrap gap-4 mt-6">
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-background/60 backdrop-blur-sm border border-border/50">
                <Calendar className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">
                  {cycleLogs.length} {cycleLogs.length === 1 ? 'Cycle' : 'Cycles'} Logged
                </span>
              </div>
              {cycleData.currentDay && (
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-background/60 backdrop-blur-sm border border-border/50">
                  <Heart className="w-4 h-4 text-accent" />
                  <span className="text-sm font-medium">Day {cycleData.currentDay}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Health Modules */}
        <div className="animate-fade-up" style={{ animationDelay: '100ms' }}>
          <h2 className="font-heading text-lg sm:text-xl font-semibold text-foreground mb-4">Health Modules</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {healthCards.map((card, index) => (
              <Link 
                key={card.title} 
                to={card.path} 
                className="glass-card card-hover rounded-xl p-5 group animate-fade-up"
                style={{ animationDelay: `${(index + 1) * 75}ms` }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-12 h-12 rounded-xl ${card.iconBg} flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg`}>
                    <card.icon className={`w-6 h-6 ${card.iconColor}`} />
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all duration-300" />
                </div>
                <h3 className="font-heading text-base font-semibold text-foreground mb-1">{card.title}</h3>
                
                {card.hasData ? (
                  <>
                    <p className={`text-sm font-medium ${card.statusColor} mb-3`}>{card.status}</p>
                    <div className="pt-3 border-t border-border">
                      <div className="text-xl font-bold gradient-text">{card.metric}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{card.metricLabel}</div>
                    </div>
                  </>
                ) : (
                  <div className="mt-2">
                    <p className="text-sm text-muted-foreground mb-3">No assessment yet</p>
                    <div className="pt-3 border-t border-border flex items-center gap-2 text-primary text-sm font-medium">
                      <Sparkles className="w-4 h-4" />
                      Start Assessment
                    </div>
                  </div>
                )}
              </Link>
            ))}
          </div>
        </div>

        {/* Quick Resources Grid */}
        <div className="animate-fade-up" style={{ animationDelay: '400ms' }}>
          <h2 className="font-heading text-lg sm:text-xl font-semibold text-foreground mb-4">Quick Access</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            {dashboardSections.map((section, index) => (
              <Link 
                key={section.title} 
                to={section.path} 
                className="glass-card card-hover rounded-xl p-4 sm:p-5 group text-center"
                style={{ animationDelay: `${(index + 5) * 50}ms` }}
              >
                <div className={`w-12 h-12 rounded-xl ${section.bgColor} flex items-center justify-center mx-auto mb-3 transition-all duration-300 group-hover:scale-110 group-hover:shadow-md`}>
                  <section.icon className={`w-6 h-6 ${section.color}`} />
                </div>
                <h3 className="font-medium text-foreground text-sm mb-1">{section.title}</h3>
                <p className="text-xs text-muted-foreground hidden sm:block">{section.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
