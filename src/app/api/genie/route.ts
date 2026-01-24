import { NextRequest, NextResponse } from "next/server";

interface GenieRequest {
  question: string;
  filters: {
    dateFrom?: string;
    dateTo?: string;
    branch?: string;
    consignee?: string;
    minFreightImpact?: number | null;
    onlyDiversions?: boolean;
  };
  meta: {
    lastRefreshedAt?: string;
    rowCount?: number;
  };
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

function generateMockResponse(question: string, filters: GenieRequest["filters"], meta: GenieRequest["meta"]): GenieResponse {
  const q = question.toLowerCase();
  const startTime = Date.now();

  let answerMarkdown = "";
  let questionCategory = "general";
  const matchedPatterns: string[] = [];
  const citations: GenieResponse["citations"] = [];

  // Branch-related questions
  if (q.includes("branch") && (q.includes("highest") || q.includes("top") || q.includes("most"))) {
    questionCategory = "branch_analysis";
    matchedPatterns.push("branch_ranking", "recovery_metric");

    answerMarkdown = `## Direct Answer
**Burdwan Depot** has the highest recovery potential at **₹45,230** across 12 diverted journeys.

## Supporting Data
| Branch | Diversions | Recovery | Avg Lead |
|--------|-----------|----------|----------|
| Burdwan Depot | 12 | ₹45,230 | 26.4 km |
| Durgapur Depot | 9 | ₹32,100 | 22.1 km |
| Asansol Depot | 7 | ₹28,450 | 19.8 km |

## Interpretation
- Burdwan accounts for **38%** of total potential recovery
- Higher average lead distance suggests systematic routing issues, not random deviations
- This does NOT necessarily indicate driver misconduct—could be GPS issues or consignee location errors

## Recommended Next Actions
1. **Audit** top 5 Burdwan journeys with highest individual recovery
2. **Verify** consignee GPS coordinates for WBQ4-BHATAR route
3. **Cross-check** driver assignment patterns for repeat diversions`;

    citations.push(
      { type: "aggregate", reference: "branch_summary", value: "Burdwan Depot" },
      { type: "filter", reference: "applied_filters", value: JSON.stringify(filters) }
    );
  }

  // Consignee-related questions
  else if (q.includes("consignee") && (q.includes("top") || q.includes("count") || q.includes("most"))) {
    questionCategory = "consignee_analysis";
    matchedPatterns.push("consignee_ranking", "diversion_count");

    answerMarkdown = `## Direct Answer
**WBQ4-BHATAR** leads with 8 diversions totaling ₹12,400 in recovery potential.

## Supporting Data
| Consignee | Diversions | Recovery | Repeat Rate |
|-----------|-----------|----------|-------------|
| WBQ4-BHATAR | 8 | ₹12,400 | 18.2% |
| WBQ2-MONGALKOT | 6 | ₹9,800 | 13.6% |
| WBQ1-KATWA | 5 | ₹7,200 | 11.4% |
| WBQ3-MEMARI | 4 | ₹5,600 | 9.1% |
| WBQ5-RAINA | 3 | ₹4,100 | 6.8% |

## Interpretation
- Top 5 consignees account for **59%** of all diversions
- High repeat rates suggest these are not isolated incidents
- This does NOT prove consignee collusion—location data may need verification

## Recommended Next Actions
1. **Audit** WBQ4-BHATAR delivery confirmations with GPS timestamps
2. **Map** actual drop locations vs registered consignee coordinates
3. **Interview** drivers who frequently serve these consignees`;

    citations.push(
      { type: "aggregate", reference: "consignee_summary", value: "WBQ4-BHATAR" }
    );
  }

  // Short lead / distance questions
  else if (q.includes("average") && (q.includes("short lead") || q.includes("distance"))) {
    questionCategory = "distance_analysis";
    matchedPatterns.push("avg_calculation", "distance_metric");

    answerMarkdown = `## Direct Answer
The **average short lead distance** is **24.3 km** across ${meta.rowCount || 156} filtered records.

## Supporting Data
- **Minimum**: 2.1 km (likely GPS variance)
- **Maximum**: 67.2 km (Journey JRN-3d71265f)
- **Median**: 18.7 km
- **Std Dev**: 14.2 km

| Range | Count | % of Total |
|-------|-------|------------|
| 0-10 km | 23 | 14.7% |
| 10-25 km | 68 | 43.6% |
| 25-50 km | 52 | 33.3% |
| 50+ km | 13 | 8.3% |

## Interpretation
- 43% of diversions fall in the 10-25 km range—significant but recoverable
- The 8.3% with 50+ km suggests planned route deviations
- This does NOT account for legitimate re-routing due to road conditions

## Recommended Next Actions
1. **Flag** all journeys with 50+ km deviation for manual review
2. **Compare** deviation patterns against known road closures/traffic
3. **Implement** real-time alerts for deviations > 30 km`;

    citations.push(
      { type: "aggregate", reference: "distance_stats", value: "24.3 km avg" }
    );
  }

  // Corridor questions
  else if (q.includes("corridor") || (q.includes("route") && q.includes("diversion"))) {
    questionCategory = "corridor_analysis";
    matchedPatterns.push("corridor_grouping", "route_analysis");

    answerMarkdown = `## Direct Answer
**BURDWAN-T2 → MONGALKOT** corridor has the most diversions with 15 occurrences.

## Supporting Data
| Corridor | Count | Recovery | Avg Lead |
|----------|-------|----------|----------|
| BURDWAN-T2 → MONGALKOT | 15 | ₹18,200 | 28.4 km |
| DURGAPUR-T1 → KATWA | 11 | ₹14,100 | 24.2 km |
| ASANSOL-T1 → MEMARI | 8 | ₹9,800 | 21.6 km |
| BURDWAN-T2 → KATWA | 6 | ₹7,200 | 19.3 km |

## Interpretation
- Top 3 corridors account for **45%** of all diversions
- BURDWAN-T2 origin appears in 2 of top 4—suggests terminal-level issue
- This does NOT mean other corridors are clean—may need broader date range

## Recommended Next Actions
1. **Review** BURDWAN-T2 dispatch procedures and route assignments
2. **Install** intermediate checkpoints on MONGALKOT route
3. **Analyze** time-of-day patterns for these corridors`;

    citations.push(
      { type: "aggregate", reference: "corridor_summary", value: "BURDWAN-T2 → MONGALKOT" }
    );
  }

  // Recovery / financial questions
  else if (q.includes("recovery") && (q.includes("total") || q.includes("month") || q.includes("potential"))) {
    questionCategory = "financial_analysis";
    matchedPatterns.push("recovery_sum", "financial_metric");

    answerMarkdown = `## Direct Answer
Total potential recovery: **₹1,24,560** across the current filter period.

## Supporting Data
| Period | Recovery | Journeys | Avg per Journey |
|--------|----------|----------|-----------------|
| Week 1 | ₹32,400 | 11 | ₹2,945 |
| Week 2 | ₹41,200 | 14 | ₹2,943 |
| Week 3 | ₹28,960 | 10 | ₹2,896 |
| Week 4 | ₹22,000 | 9 | ₹2,444 |

**By Branch:**
- Burdwan: ₹45,230 (36.3%)
- Durgapur: ₹32,100 (25.8%)
- Others: ₹47,230 (37.9%)

## Interpretation
- Consistent ~₹2,900 per diversion indicates systematic pricing gaps
- Week 4 shows lower average—could indicate improving compliance
- This does NOT represent actual recovered funds—only potential if actioned

## Recommended Next Actions
1. **Prioritize** top 10 highest-value recovery cases for immediate audit
2. **Calculate** ROI of implementing automated diversion alerts
3. **Set** monthly recovery targets by branch`;

    citations.push(
      { type: "aggregate", reference: "recovery_total", value: "₹1,24,560" }
    );
  }

  // Vehicle / driver questions
  else if (q.includes("vehicle") || q.includes("driver")) {
    questionCategory = "vehicle_analysis";
    matchedPatterns.push("vehicle_grouping", "repeat_detection");

    answerMarkdown = `## Direct Answer
**3 vehicles** show repeated diversions (3+ occurrences), led by **WB41J4135** with 5 diversions.

## Supporting Data
| Vehicle | Diversions | Total Impact | Driver Changes |
|---------|-----------|--------------|----------------|
| WB41J4135 | 5 | ₹8,200 | 1 driver |
| WB39K2847 | 4 | ₹6,100 | 1 driver |
| WB42L1923 | 3 | ₹4,800 | 2 drivers |

**WB41J4135 Details:**
- All 5 diversions on BURDWAN-T2 routes
- Same driver: DRV-4521
- Dates: 01/12, 05/12, 12/12, 18/12, 24/12

## Interpretation
- Single driver operating WB41J4135 suggests individual behavior pattern
- WB42L1923 with 2 drivers indicates possible vehicle tracking issue
- This does NOT confirm misconduct—GPS device malfunction possible

## Recommended Next Actions
1. **Interview** DRV-4521 with specific journey evidence
2. **Inspect** GPS device on WB41J4135 for tampering/malfunction
3. **Cross-reference** fuel consumption data for these journeys`;

    citations.push(
      { type: "row", reference: "vehicle_WB41J4135", value: "5 diversions" }
    );
  }

  // Penalty questions
  else if (q.includes("penalty") || q.includes("candidate")) {
    questionCategory = "penalty_analysis";
    matchedPatterns.push("penalty_threshold", "candidate_ranking");

    const threshold = q.match(/(\d+)/)?.[1] || "1000";

    answerMarkdown = `## Direct Answer
**12 penalty candidates** found with recovery > ₹${threshold}.

## Supporting Data
| Journey ID | Branch | Consignee | Recovery | Lead |
|------------|--------|-----------|----------|------|
| JRN-3d71265f | Burdwan | WBQ4-BHATAR | ₹2,340 | 45.2 km |
| JRN-8a92bc45 | Durgapur | WBQ1-KATWA | ₹1,890 | 38.7 km |
| JRN-5c61de78 | Asansol | WBQ3-MEMARI | ₹1,560 | 32.1 km |
| JRN-2b43af91 | Burdwan | WBQ2-MONGALKOT | ₹1,420 | 29.8 km |
| JRN-9e17cd82 | Durgapur | WBQ5-RAINA | ₹1,340 | 27.4 km |

**Summary:**
- Total penalty-eligible recovery: ₹18,450
- Average per candidate: ₹1,538
- Burdwan candidates: 5 (41.7%)

## Interpretation
- Top candidate (JRN-3d71265f) has 45.2 km deviation—clearly intentional
- Concentration in Burdwan aligns with branch-level findings
- This does NOT guarantee penalty recovery—requires driver acknowledgment

## Recommended Next Actions
1. **Document** evidence package for top 5 candidates
2. **Schedule** driver meetings with branch supervisors present
3. **Calculate** net recovery after penalty processing costs`;

    citations.push(
      { type: "row", reference: "JRN-3d71265f", value: "₹2,340" },
      { type: "row", reference: "JRN-8a92bc45", value: "₹1,890" }
    );
  }

  // Compare / comparison questions
  else if (q.includes("compare") || q.includes("vs") || q.includes("versus")) {
    questionCategory = "comparison_analysis";
    matchedPatterns.push("comparative", "benchmark");

    answerMarkdown = `## Direct Answer
**Burdwan Depot** shows **1.8x higher** diversion rate compared to average.

## Supporting Data
| Metric | Burdwan | Fleet Average | Variance |
|--------|---------|---------------|----------|
| Diversions | 28 | 15.5 | +80.6% |
| Recovery | ₹45,230 | ₹22,100 | +104.7% |
| Avg Lead | 26.4 km | 21.2 km | +24.5% |
| Repeat Rate | 23% | 14% | +64.3% |

**Trend (Last 4 Weeks):**
| Week | Burdwan | Others | Gap |
|------|---------|--------|-----|
| W1 | 8 | 14 | -6 |
| W2 | 9 | 12 | -3 |
| W3 | 6 | 9 | -3 |
| W4 | 5 | 8 | -3 |

## Interpretation
- Burdwan is a clear outlier across all metrics
- Week-over-week trend shows gap narrowing—possible early intervention effect
- This does NOT mean other depots are optimal—just relatively better

## Recommended Next Actions
1. **Replicate** successful practices from lower-diversion depots
2. **Assign** dedicated compliance officer to Burdwan
3. **Set** weekly diversion reduction targets with depot manager`;

    citations.push(
      { type: "aggregate", reference: "depot_comparison", value: "Burdwan vs Fleet" }
    );
  }

  // Default / general questions
  else {
    questionCategory = "general";
    matchedPatterns.push("fallback");

    answerMarkdown = `## Direct Answer
Based on current filters, there are **${meta.rowCount || 156} records** with potential diversion indicators.

## Supporting Data
**Current Filter State:**
${filters.branch ? `- Branch: ${filters.branch}` : "- Branch: All"}
${filters.consignee ? `- Consignee: ${filters.consignee}` : "- Consignee: All"}
${filters.dateFrom ? `- From: ${filters.dateFrom}` : "- Date range: All available"}
${filters.onlyDiversions !== false ? "- Showing: Diversions only" : "- Showing: All loads"}

**Quick Stats:**
- Total potential recovery: ₹1,24,560
- Average short lead: 24.3 km
- Affected branches: 6
- Affected consignees: 18

## Interpretation
- Data is current as of ${meta.lastRefreshedAt ? new Date(meta.lastRefreshedAt).toLocaleString() : "last refresh"}
- Use specific questions for deeper insights on branches, consignees, corridors, or recovery
- This overview does NOT highlight specific problem areas—ask targeted questions

## Recommended Next Actions
1. **Ask** "Which branch has highest recovery?" for branch-level insights
2. **Ask** "Top consignees by diversion count" for consignee analysis
3. **Use** filters above to narrow down to specific time periods or entities`;

    citations.push(
      { type: "filter", reference: "current_filters", value: JSON.stringify(filters) }
    );
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

    // Simulate processing delay (will be replaced with actual LLM call)
    await new Promise((resolve) => setTimeout(resolve, 300 + Math.random() * 400));

    const response = generateMockResponse(
      body.question,
      body.filters || {},
      body.meta || {}
    );

    return NextResponse.json(response);
  } catch (error) {
    console.error("Genie API error:", error);
    return NextResponse.json(
      { error: "Failed to process question" },
      { status: 500 }
    );
  }
}
