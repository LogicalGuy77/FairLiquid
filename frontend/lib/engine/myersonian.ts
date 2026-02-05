/**
 * LEX-JUSTICIA: Myersonian Framework Implementation
 *
 * Implements optimal auction theory from Milionis et al. (2023)
 * for deriving MM tier commitments and performance scoring.
 *
 * Key Functions:
 * - Virtual value calculation (Eqs. 5-6)
 * - Optimal allocation rule (Theorem 3.2)
 * - No-trade gap boundaries (Corollary 3.3)
 * - IC reward design (Corollary 2.2)
 */

// ============================================================================
// CORE DATA STRUCTURES
// ============================================================================

export interface PerformanceDistribution {
  historicalScores: number[];
  mean: number;
  stddev: number;
  min: number;
  max: number;
}

export interface VirtualValueDecomposition {
  rawScore: number;
  informationRent: number;
  adverseSelectionPenalty: number;
  virtualValue: number;
}

export interface OptimalTierBoundaries {
  martyrMinimum: number;
  sovereignMaximum: number;
  noTradeGapWidth: number;
  upperVirtualRoot: number;
  lowerVirtualRoot: number;
}

export interface CrisisSpreadBreakdown {
  baseSpread: number;
  monopolyComponent: number;
  adverseSelectionComponent: number;
  totalSpread: number;
  volatilityMultiplier: number;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function computeMean(data: number[]): number {
  return data.reduce((a, b) => a + b, 0) / data.length;
}

function computeStddev(data: number[]): number {
  const mean = computeMean(data);
  const variance =
    data.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / data.length;
  return Math.sqrt(variance);
}

// ============================================================================
// EMPIRICAL DISTRIBUTION ESTIMATION
// ============================================================================

export function empiricalCDF(
  historicalScores: number[],
  point: number
): number {
  const count = historicalScores.filter((x) => x <= point).length;
  return count / (historicalScores.length || 1);
}

export function estimatePDF(
  historicalScores: number[],
  point: number,
  kernelBandwidth?: number
): number {
  if (historicalScores.length === 0) return 0.001;
  const n = historicalScores.length;
  const stddev = computeStddev(historicalScores);
  const h = kernelBandwidth || Math.pow(n, -0.2) * stddev + 0.001;

  let density = 0;
  for (const score of historicalScores) {
    const diff = point - score;
    const kernelValue = Math.exp(-0.5 * Math.pow(diff / h, 2));
    density += kernelValue / (h * Math.sqrt(2 * Math.PI));
  }
  return density / n;
}

export function hazardRate(
  historicalScores: number[],
  point: number
): number {
  const pdf = estimatePDF(historicalScores, point);
  const cdf = empiricalCDF(historicalScores, point);
  const survival = 1 - cdf;
  if (survival < 0.001) return 1000;
  return pdf / survival;
}

// ============================================================================
// VIRTUAL VALUE FUNCTIONS (Equations 5-6)
// ============================================================================

export function upperVirtualValue(
  mmScore: number,
  distribution: PerformanceDistribution,
  adverseSelectionParam: number = 0.05
): VirtualValueDecomposition {
  const cdf = empiricalCDF(distribution.historicalScores, mmScore);
  const pdf = estimatePDF(distribution.historicalScores, mmScore);
  const informationRent = (1 - cdf) / (pdf + 0.0001);
  const deviationFromMean = Math.abs(mmScore - distribution.mean);
  const adverseSelectionPenalty =
    adverseSelectionParam *
    (deviationFromMean / distribution.stddev) *
    informationRent;
  const virtualValue = mmScore - informationRent - adverseSelectionPenalty;
  return {
    rawScore: mmScore,
    informationRent,
    adverseSelectionPenalty,
    virtualValue: Math.max(0, virtualValue),
  };
}

export function lowerVirtualValue(
  mmScore: number,
  distribution: PerformanceDistribution,
  crisisCostParam: number = 0.1
): VirtualValueDecomposition {
  const cdf = empiricalCDF(distribution.historicalScores, mmScore);
  const pdf = estimatePDF(distribution.historicalScores, mmScore);
  const informationRent = cdf / (pdf + 0.0001);
  const deviationFromMean = Math.abs(mmScore - distribution.mean);
  const crisisCost =
    crisisCostParam *
    (deviationFromMean / distribution.stddev) *
    informationRent;
  const virtualValue = crisisCost - mmScore - informationRent;
  return {
    rawScore: mmScore,
    informationRent,
    adverseSelectionPenalty: crisisCost,
    virtualValue,
  };
}

// ============================================================================
// OPTIMAL ALLOCATION (Theorem 3.2)
// ============================================================================

export function findUpperVirtualRoot(
  distribution: PerformanceDistribution,
  adverseSelectionParam: number = 0.05,
  tolerance: number = 0.1
): number {
  let low = distribution.min;
  let high = distribution.max;
  for (let i = 0; i < 100; i++) {
    const mid = (low + high) / 2;
    const value = upperVirtualValue(mid, distribution, adverseSelectionParam)
      .virtualValue;
    if (Math.abs(value) < tolerance) return mid;
    if (value > 0) low = mid;
    else high = mid;
  }
  return (low + high) / 2;
}

export function findLowerVirtualRoot(
  distribution: PerformanceDistribution,
  crisisCostParam: number = 0.1,
  tolerance: number = 0.1
): number {
  let low = distribution.min;
  let high = distribution.max;
  for (let i = 0; i < 100; i++) {
    const mid = (low + high) / 2;
    const value = lowerVirtualValue(mid, distribution, crisisCostParam)
      .virtualValue;
    if (Math.abs(value) < tolerance) return mid;
    if (value < 0) high = mid;
    else low = mid;
  }
  return (low + high) / 2;
}

export function computeOptimalTierBoundaries(
  distribution: PerformanceDistribution
): OptimalTierBoundaries {
  const upperRoot = findUpperVirtualRoot(distribution);
  const lowerRoot = findLowerVirtualRoot(distribution);
  return {
    martyrMinimum: Math.max(distribution.min, upperRoot),
    sovereignMaximum: Math.min(distribution.max, lowerRoot),
    noTradeGapWidth: Math.max(0, upperRoot - lowerRoot),
    upperVirtualRoot: upperRoot,
    lowerVirtualRoot: lowerRoot,
  };
}

export function allocateOptimalTier(
  mmScore: number,
  boundaries: OptimalTierBoundaries
): "MARTYR" | "REJECT" | "SOVEREIGN" {
  if (mmScore >= boundaries.martyrMinimum) return "MARTYR";
  else if (mmScore <= boundaries.sovereignMaximum) return "SOVEREIGN";
  else return "REJECT";
}

// ============================================================================
// IC REWARDS (Corollary 2.2)
// ============================================================================

export function calculateICReward(
  mmScore: number,
  distribution: PerformanceDistribution,
  numberOfSegments: number = 100
): number {
  if (mmScore < distribution.min) return 0;
  const a = distribution.min;
  const b = Math.min(mmScore, distribution.max);
  const n = numberOfSegments;
  let sum = 0;
  const h = (b - a) / n;
  for (let i = 0; i <= n; i++) {
    const x = a + i * h;
    const y = upperVirtualValue(x, distribution).virtualValue;
    if (i === 0 || i === n) sum += y;
    else if (i % 2 === 1) sum += 4 * y;
    else sum += 2 * y;
  }
  return Math.max(0, (h / 3) * sum);
}

export function calculateMarginalICReward(
  mmScore: number,
  distribution: PerformanceDistribution
): number {
  return upperVirtualValue(mmScore, distribution).virtualValue;
}

// ============================================================================
// CRISIS SPREAD
// ============================================================================

export function calculateOptimalCrisisSpread(
  basePrice: number,
  currentVolatility: number,
  normalVolatility: number,
  mmInformationAdvantage: number,
  mmRiskAversion: number,
  adverseSelectionParam: number = 0.05
): CrisisSpreadBreakdown {
  const BASE_SPREAD_BPS = 10;
  if (normalVolatility === 0) normalVolatility = 0.01;
  const volatilityMultiplier = currentVolatility / normalVolatility;
  const monopolyComponent =
    BASE_SPREAD_BPS *
    volatilityMultiplier *
    (1 / (1 + mmInformationAdvantage)) *
    mmRiskAversion;
  const adverseSelectionComponent =
    BASE_SPREAD_BPS *
    volatilityMultiplier *
    adverseSelectionParam *
    (1 - mmInformationAdvantage) *
    mmRiskAversion *
    100;
  const totalSpread = monopolyComponent + adverseSelectionComponent;
  return {
    baseSpread: BASE_SPREAD_BPS,
    monopolyComponent,
    adverseSelectionComponent,
    totalSpread,
    volatilityMultiplier,
  };
}

export function applySpreadConstraint(
  spread: number,
  tier: "MARTYR" | "CITIZEN" | "SOVEREIGN"
): number {
  const constraints = { MARTYR: 40, CITIZEN: 100, SOVEREIGN: Infinity };
  return Math.min(spread, constraints[tier]);
}

// ============================================================================
// SLASHING
// ============================================================================

export function calculateSlashingAmount(
  claimedScore: number,
  actualScore: number,
  distribution: PerformanceDistribution,
  maxSlashPercentage: number = 0.5
): { slashAmount: number; justification: string } {
  const claimedVV = upperVirtualValue(claimedScore, distribution).virtualValue;
  const actualVV = upperVirtualValue(actualScore, distribution).virtualValue;
  const overclaimedValue = Math.max(0, claimedVV - actualVV);
  const cappedSlash = Math.min(overclaimedValue, maxSlashPercentage);
  let justification = "";
  if (overclaimedValue <= 0)
    justification = "MM was honest, no slashing";
  else
    justification = `Overclaimed ${overclaimedValue.toFixed(2)}, slashing ${cappedSlash.toFixed(2)}`;
  return { slashAmount: cappedSlash, justification };
}

// ============================================================================
// BELIEF UPDATE (Bayesian)
// ============================================================================

export function updateMMCredibility(
  priorBelief: number,
  proofOutcome: number,
  beliefUpdateWeight: number = 0.7
): number {
  return (
    beliefUpdateWeight * proofOutcome +
    (1 - beliefUpdateWeight) * priorBelief
  );
}

// ============================================================================
// DISTRIBUTION BUILDER
// ============================================================================

export function buildDistribution(
  historicalScores: number[]
): PerformanceDistribution {
  return {
    historicalScores,
    mean: computeMean(historicalScores),
    stddev: computeStddev(historicalScores),
    min: Math.min(...historicalScores),
    max: Math.max(...historicalScores),
  };
}
