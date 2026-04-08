export type PipelineStage =
  | "intake"
  | "tear-sheet"
  | "building"
  | "qa"
  | "review"
  | "delivered"
  | "live"
  | "revision-requested";

export interface QACheck {
  name: string;
  passed: boolean;
  severity: "blocker" | "warning" | "optimization";
  message: string;
  autofix?: string;
}

export interface QAPass {
  name: string;
  passed: boolean;
  checks: QACheck[];
}

export interface QAReport {
  passed: boolean;
  score: number;
  passes: QAPass[];
  runAt: string;
}

export interface Message {
  from: string;
  text: string;
  timestamp: string;
}

export interface BuildLogEntry {
  from: PipelineStage;
  to: PipelineStage;
  timestamp: string;
  triggeredBy: string;
}

export interface ClientProfile {
  id: string;
  business_name: string;
  contact_name: string;
  contact_email: string;
  phone: string;
  city: string;
  zip: string;
  assigned_rep: string;
  stage: PipelineStage;
  created_at: string;
  approved_at: string | null;
  qa_passed_at: string | null;
  delivered_at: string | null;
  published_url: string | null;
  sbrData: Record<string, unknown> | null;
  selectedLook: string | null;
  intakeAnswers: Record<string, string> | null;
  tearSheetUrl: string | null;
  buildNotes: string[];
  qaReport: QAReport | null;
  messages: Message[];
  internalNotes: Message[];
  buildLog: BuildLogEntry[];
  assignedDev: string | null;
  hasLogo: boolean;
  logoUrl: string | null;
  interests?: Record<string, boolean | string>;
}

export const STAGE_ORDER: PipelineStage[] = [
  "intake",
  "tear-sheet",
  "building",
  "qa",
  "review",
  "delivered",
  "live",
];

export const STAGE_LABELS: Record<PipelineStage, string> = {
  intake: "Intake",
  "tear-sheet": "Tear Sheet",
  building: "Building",
  qa: "QA",
  review: "Review",
  delivered: "Delivered",
  live: "Live",
  "revision-requested": "Revision Requested",
};

export const STAGE_COLORS: Record<PipelineStage, string> = {
  intake: "bg-gray-500",
  "tear-sheet": "bg-blue-500",
  building: "bg-amber-500",
  qa: "bg-purple-500",
  review: "bg-amber-500",
  delivered: "bg-green-500",
  live: "bg-green-600",
  "revision-requested": "bg-red-500",
};

export const STAGE_TEXT_COLORS: Record<PipelineStage, string> = {
  intake: "text-gray-400",
  "tear-sheet": "text-blue-400",
  building: "text-amber-400",
  qa: "text-purple-400",
  review: "text-amber-400",
  delivered: "text-green-400",
  live: "text-green-500",
  "revision-requested": "text-red-400",
};
