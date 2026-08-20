export interface AtsPillarScore {
  name: string;
  score: number;       // 0 to 100
  weight: number;      // 0.0 to 1.0 (sums to 1.0)
  weightedScore: number;
  label: string;
  status: 'excellent' | 'good' | 'average' | 'poor';
  summary: string;
  items: Array<{
    title: string;
    passed: boolean;
    detail: string;
    impact: 'critical' | 'moderate' | 'minor';
    scoreGain?: number;
  }>;
}

export type AtsSkillCategory =
  | 'languages'
  | 'frontend'
  | 'backend'
  | 'databases'
  | 'cloud'
  | 'devops'
  | 'ai_ml'
  | 'core_cs'
  | 'data_science'
  | 'mobile'
  | 'testing'
  | 'security'
  | 'architecture'
  | 'tools';

export interface AtsSkillMatch {
  name: string;
  category: AtsSkillCategory;
  count: number;
  inExperienceBullets?: boolean;
}

export interface AtsQuantifiedMetric {
  value: string;
  category: 'percentage' | 'financial' | 'multiplier_scale' | 'performance' | 'team_scope';
  contextSnippet: string;
}

export interface AtsVerbMatch {
  verb: string;
  category: 'leadership' | 'engineering' | 'optimization' | 'automation' | 'delivery' | 'architecture';
  count: number;
}

export interface AtsRuleViolation {
  id: string;
  severity: 'dealbreaker' | 'warning' | 'penalty';
  category: 'contact' | 'architecture' | 'linguistics' | 'formatting' | 'repetition' | 'pronouns';
  title: string;
  description: string;
  ruleCode: string;
  penaltyPoints: number;
  recommendation: string;
  contextSnippet?: string;
}

export interface AtsReadabilityMetrics {
  wordCount: number;
  readingTimeMinutes: number;
  bulletCount: number;
  avgWordsPerBullet: number;
  bulletsWithMetricsPercent: number;
  fleschKincaidEstimate: string;
  firstPersonPronounsCount: number;
  passiveVoicePhrasesCount: number;
  buzzwordsCount: number;
}

export interface AtsRoleMatch {
  role: string;
  matchScore: number; // 0 to 100
  matchedSkills: string[];
  missingSkills: string[];
  relevance: 'High Match' | 'Moderate Match' | 'Low Match';
}

export interface AtsIssue {
  id: string;
  category: string;
  type: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  recommendation: string;
  potentialPointsGain?: number;
}

export interface AtsScoreResult {
  overallScore: number;      // 0 to 100
  grade: 'A+' | 'A' | 'B+' | 'B' | 'C' | 'D';
  gradeColor: string;
  summaryTitle: string;
  summaryDescription: string;
  dealBreakersCount: number;
  totalViolationsCount: number;
  
  wordCount: number;
  readingTimeMinutes: number;
  hardSkillsCount: number;
  actionVerbsCount: number;
  metricsCount: number;
  
  readability: AtsReadabilityMetrics;
  
  pillars: {
    contactProfile: AtsPillarScore;
    sectionArchitecture: AtsPillarScore;
    actionImpact: AtsPillarScore;
    keywordsSkills: AtsPillarScore;
    formattingReadability: AtsPillarScore;
    linguisticHygiene: AtsPillarScore;
  };
  
  detectedSkills: AtsSkillMatch[];
  detectedMetrics: string[];
  detailedMetrics: AtsQuantifiedMetric[];
  detectedActionVerbs: string[];
  detailedVerbs: AtsVerbMatch[];
  roleMatches: AtsRoleMatch[];
  
  ruleViolations: AtsRuleViolation[];
  issues: AtsIssue[];
  strengths: string[];
  topRecommendations: string[];
  actionPlan: Array<{
    step: number;
    title: string;
    impact: 'high' | 'medium' | 'low';
    pointsBoost: string;
    instruction: string;
  }>;
  calculatedAt: number;
}
