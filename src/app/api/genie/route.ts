import { NextRequest, NextResponse } from "next/server";
import type { GenieContext } from "@/lib/genie/context";

interface GenieRequest {
  question: string;
  context: GenieContext | null;
}

interface GenieResponse {
  answerMarkdown: string;
  citations?: Array<{
    type: "row" | "aggregate" | "filter";
    reference: string;
    value?: string | number;
  }>;
  debug?: {
    processingTimeMs: number;
    questionCategory: string;
    matchedPatterns: string[];
  };
}

// Structured response format:
// 1) Direct Answer (1-2 lines)
// 2) Supporting Data (bullets or small table)
// 3) Interpretation (what it indicates + what it does NOT)
// 4) Recommended Next Actions (audit-first)

function formatCurrency(value: number): string {
  return `₹${value.toLocaleString("en-IN")}`;
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

function generateResponse(question: string, ctx: GenieContext): GenieResponse {
  const q = question.toLowerCase();
  const startTime = Date.now();

  let answerMarkdown = "";
  let questionCategory = "general";
  const matchedPatterns: string[] = [];
  const citations: GenieResponse["citations"] = [];

  const { scorecards, topBranches, topConsignees, topCorridors, topPenaltyCandidates, datasetStats, filterSummary } = ctx;

  // Branch-related questions
  if (q.includes("branch") && (q.includes("highest") || q.includes("top") || q.includes("most"))) {
    questionCategory = "branch_analysis";
    matchedPatterns.push("branch_ranking", "recovery_metric");

    if (topBranches.length === 0) {
      answerMarkdown = `## Direct Answer\nNo branch data available for the current filters.\n\n**Filters:** ${filterSummary}`;
    } else {
      const top = topBranches[0];
      const totalRecovery = topBranches.reduce((sum, b) => sum + b.recovery, 0);
      const topPct = totalRecovery > 0 ? ((top.recovery / totalRecovery) * 100).toFixed(1) : "0";

      answerMarkdown = `## Direct Answer
**${top.name}** has the highest recovery potential at **${formatCurrency(top.recovery)}** across ${top.journeys} diverted journeys.

## Supporting Data
| Branch | Diversions | Recovery | Avg Lead |
|--------|-----------|----------|----------|
${topBranches.slice(0, 5).map(b => `| ${b.name} | ${b.journeys} | ${formatCurrency(b.recovery)} | ${b.avgLeadKm} km |`).join("\n")}

## Interpretation
- ${top.name} accounts for **${topPct}%** of total recovery across top branches
- Higher average lead distance suggests systematic routing issues
- This does NOT necessarily indicate misconduct—could be GPS or location data errors

## Recommended Next Actions
1. **Audit** top 5 ${top.name} journeys with highest individual recovery
2. **Verify** consignee GPS coordinates for high-frequency routes
3. **Cross-check** driver assignment patterns for repeat diversions`;

      citations.push({ type: "aggregate", reference: "branch_summary", value: top.name });
    }
  }

  // Consignee-related questions
  else if (q.includes("consignee") && (q.includes("top") || q.includes("count") || q.includes("most"))) {
    questionCategory = "consignee_analysis";
    matchedPatterns.push("consignee_ranking", "diversion_count");

    if (topConsignees.length === 0) {
      answerMarkdown = `## Direct Answer\nNo consignee data available for the current filters.\n\n**Filters:** ${filterSummary}`;
    } else {
      const top = topConsignees[0];
      const totalDiversions = topConsignees.reduce((sum, c) => sum + c.journeys, 0);
      const top5Pct = totalDiversions > 0
        ? ((topConsignees.slice(0, 5).reduce((sum, c) => sum + c.journeys, 0) / totalDiversions) * 100).toFixed(0)
        : "0";

      answerMarkdown = `## Direct Answer
**${top.name}** leads with ${top.journeys} diversions totaling ${formatCurrency(top.recovery)} in recovery potential.

## Supporting Data
| Consignee | Diversions | Recovery | Repeat Rate |
|-----------|-----------|----------|-------------|
${topConsignees.slice(0, 5).map(c => `| ${c.name} | ${c.journeys} | ${formatCurrency(c.recovery)} | ${formatPercent(c.repeatPct)} |`).join("\n")}

## Interpretation
- Top 5 consignees account for **${top5Pct}%** of all diversions
- High repeat rates suggest these are not isolated incidents
- This does NOT prove consignee collusion—location data may need verification

## Recommended Next Actions
1. **Audit** ${top.name} delivery confirmations with GPS timestamps
2. **Map** actual drop locations vs registered consignee coordinates
3. **Interview** drivers who frequently serve these consignees`;

      citations.push({ type: "aggregate", reference: "consignee_summary", value: top.name });
    }
  }

  // Short lead / distance questions
  else if (q.includes("average") && (q.includes("short lead") || q.includes("distance") || q.includes("lead"))) {
    questionCategory = "distance_analysis";
    matchedPatterns.push("avg_calculation", "distance_metric");

    answerMarkdown = `## Direct Answer
The **average short lead distance** is **${scorecards.avgShortLeadDistanceKm} km** across ${datasetStats.filteredRows} filtered records.

## Supporting Data
- **Maximum deviation**: ${scorecards.maxDivertedDistanceKm} km
- **Total diverted journeys**: ${scorecards.totalDivertedJourneys}
- **Branches affected**: ${scorecards.totalBranchesWithDiversions}
- **Consignees involved**: ${scorecards.totalConsigneesInvolved}

## Interpretation
- Diversions averaging ${scorecards.avgShortLeadDistanceKm} km indicate systematic route deviations
- Maximum of ${scorecards.maxDivertedDistanceKm} km suggests some planned diversions
- This does NOT account for legitimate re-routing due to road conditions

## Recommended Next Actions
1. **Flag** all journeys with 50+ km deviation for manual review
2. **Compare** deviation patterns against known road closures/traffic
3. **Implement** real-time alerts for deviations > 30 km`;

    citations.push({ type: "aggregate", reference: "distance_stats", value: `${scorecards.avgShortLeadDistanceKm} km avg` });
  }

  // Corridor questions
  else if (q.includes("corridor") || (q.includes("route") && q.includes("diversion"))) {
    questionCategory = "corridor_analysis";
    matchedPatterns.push("corridor_grouping", "route_analysis");

    if (topCorridors.length === 0) {
      answerMarkdown = `## Direct Answer\nNo corridor data available for the current filters.\n\n**Filters:** ${filterSummary}`;
    } else {
      const top = topCorridors[0];
      const totalCount = topCorridors.reduce((sum, c) => sum + c.count, 0);
      const top3Pct = totalCount > 0
        ? ((topCorridors.slice(0, 3).reduce((sum, c) => sum + c.count, 0) / totalCount) * 100).toFixed(0)
        : "0";

      answerMarkdown = `## Direct Answer
**${top.corridor}** corridor has the most diversions with ${top.count} occurrences.

## Supporting Data
| Corridor | Count | Recovery | Avg Lead |
|----------|-------|----------|----------|
${topCorridors.slice(0, 5).map(c => `| ${c.corridor} | ${c.count} | ${formatCurrency(c.recovery)} | ${c.avgLeadKm} km |`).join("\n")}

## Interpretation
- Top 3 corridors account for **${top3Pct}%** of all diversions
- Repeated diversions on same corridors suggest systematic issues
- This does NOT mean other corridors are clean—may need broader date range

## Recommended Next Actions
1. **Review** dispatch procedures for high-frequency corridors
2. **Install** intermediate checkpoints on problem routes
3. **Analyze** time-of-day patterns for these corridors`;

      citations.push({ type: "aggregate", reference: "corridor_summary", value: top.corridor });
    }
  }

  // Recovery / financial questions
  else if (q.includes("recovery") && (q.includes("total") || q.includes("month") || q.includes("potential"))) {
    questionCategory = "financial_analysis";
    matchedPatterns.push("recovery_sum", "financial_metric");

    const branchBreakdown = topBranches.slice(0, 3).map(b => {
      const pct = scorecards.totalPotentialRecovery > 0
        ? ((b.recovery / scorecards.totalPotentialRecovery) * 100).toFixed(1)
        : "0";
      return `- ${b.name}: ${formatCurrency(b.recovery)} (${pct}%)`;
    }).join("\n");

    answerMarkdown = `## Direct Answer
Total potential recovery: **${formatCurrency(scorecards.totalPotentialRecovery)}** across the current filter period.

## Supporting Data
**Summary:**
- Total diverted journeys: ${scorecards.totalDivertedJourneys}
- Average recovery per journey: ${formatCurrency(scorecards.totalDivertedJourneys > 0 ? Math.round(scorecards.totalPotentialRecovery / scorecards.totalDivertedJourneys) : 0)}
- Branches with diversions: ${scorecards.totalBranchesWithDiversions}
- Consignees involved: ${scorecards.totalConsigneesInvolved}

**By Branch:**
${branchBreakdown}

## Interpretation
- Consistent per-journey amounts may indicate systematic pricing gaps
- This does NOT represent actual recovered funds—only potential if actioned

## Recommended Next Actions
1. **Prioritize** top 10 highest-value recovery cases for immediate audit
2. **Calculate** ROI of implementing automated diversion alerts
3. **Set** monthly recovery targets by branch`;

    citations.push({ type: "aggregate", reference: "recovery_total", value: formatCurrency(scorecards.totalPotentialRecovery) });
  }

  // Penalty questions
  else if (q.includes("penalty") || q.includes("candidate")) {
    questionCategory = "penalty_analysis";
    matchedPatterns.push("penalty_threshold", "candidate_ranking");

    if (topPenaltyCandidates.length === 0) {
      answerMarkdown = `## Direct Answer\nNo penalty candidates found for the current filters.\n\n**Filters:** ${filterSummary}`;
    } else {
      const totalPenaltyRecovery = topPenaltyCandidates.reduce((sum, p) => sum + p.recovery, 0);
      const avgPerCandidate = topPenaltyCandidates.length > 0
        ? Math.round(totalPenaltyRecovery / topPenaltyCandidates.length)
        : 0;

      answerMarkdown = `## Direct Answer
**${topPenaltyCandidates.length} penalty candidates** found with significant recovery potential.

## Supporting Data
| Journey ID | Branch | Consignee | Recovery | Lead |
|------------|--------|-----------|----------|------|
${topPenaltyCandidates.slice(0, 5).map(p => `| ${p.journeyId.substring(0, 12)}... | ${p.branch} | ${p.consignee} | ${formatCurrency(p.recovery)} | ${p.leadKm} km |`).join("\n")}

**Summary:**
- Total penalty-eligible recovery: ${formatCurrency(totalPenaltyRecovery)}
- Average per candidate: ${formatCurrency(avgPerCandidate)}
- Top candidate deviation: ${topPenaltyCandidates[0]?.leadKm ?? 0} km

## Interpretation
- Top candidates show significant deviation distances—likely intentional
- High concentration in certain branches aligns with branch-level findings
- This does NOT guarantee penalty recovery—requires driver acknowledgment

## Recommended Next Actions
1. **Document** evidence package for top 5 candidates
2. **Schedule** driver meetings with branch supervisors present
3. **Calculate** net recovery after penalty processing costs`;

      citations.push(
        { type: "row", reference: topPenaltyCandidates[0]?.journeyId ?? "", value: formatCurrency(topPenaltyCandidates[0]?.recovery ?? 0) }
      );
    }
  }

  // Default / general questions
  else {
    questionCategory = "general";
    matchedPatterns.push("overview");

    answerMarkdown = `## Direct Answer
Based on current filters, there are **${datasetStats.filteredRows} records** with diversion indicators.

## Supporting Data
**Current Filters:**
${filterSummary}

**Quick Stats:**
- Total potential recovery: ${formatCurrency(scorecards.totalPotentialRecovery)}
- Average short lead: ${scorecards.avgShortLeadDistanceKm} km
- Diverted journeys: ${scorecards.totalDivertedJourneys}
- Affected branches: ${scorecards.totalBranchesWithDiversions}
- Affected consignees: ${scorecards.totalConsigneesInvolved}

**Top Branch:** ${topBranches[0]?.name ?? "N/A"} (${formatCurrency(topBranches[0]?.recovery ?? 0)})
**Top Consignee:** ${topConsignees[0]?.name ?? "N/A"} (${topConsignees[0]?.journeys ?? 0} diversions)
**Top Corridor:** ${topCorridors[0]?.corridor ?? "N/A"} (${topCorridors[0]?.count ?? 0} occurrences)

## Interpretation
- Data range: ${datasetStats.dateRangeMin || "N/A"} to ${datasetStats.dateRangeMax || "N/A"}
- Last updated: ${new Date(datasetStats.lastUpdated).toLocaleString()}
- Use specific questions for deeper insights

## Recommended Next Actions
1. **Ask** "Which branch has highest recovery?" for branch-level insights
2. **Ask** "Top consignees by diversion count" for consignee analysis
3. **Use** filters to narrow down to specific time periods or entities`;

    citations.push({ type: "filter", reference: "current_filters", value: filterSummary });
  }

  return {
    answerMarkdown,
    citations,
    debug: {
      processingTimeMs: Date.now() - startTime,
      questionCategory,
      matchedPatterns,
    },
  };
}

export async function POST(request: NextRequest): Promise<NextResponse<GenieResponse | { error: string }>> {
  try {
    const body: GenieRequest = await request.json();

    // Validate request
    if (!body.question || typeof body.question !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid 'question' field" },
        { status: 400 }
      );
    }

    if (body.question.trim().length === 0) {
      return NextResponse.json(
        { error: "Question cannot be empty" },
        { status: 400 }
      );
    }

    if (body.question.length > 500) {
      return NextResponse.json(
        { error: "Question too long (max 500 characters)" },
        { status: 400 }
      );
    }

    if (!body.context) {
      return NextResponse.json(
        { error: "Missing context data" },
        { status: 400 }
      );
    }

    // Simulate processing delay (will be replaced with actual LLM call)
    await new Promise((resolve) => setTimeout(resolve, 200 + Math.random() * 300));

    const response = generateResponse(body.question, body.context);

    return NextResponse.json(response);
  } catch (error) {
    console.error("Genie API error:", error);
    return NextResponse.json(
      { error: "Failed to process question" },
      { status: 500 }
    );
  }
}
