import type { MaturityResultsResponse } from "@/lib/types/maturity.types";
import type { LegacyMaturityResult } from "@/lib/types/maturity-legacy";

export function toLegacyMaturityResults(
  results: MaturityResultsResponse
): LegacyMaturityResult[] {
  return results.dimensions.map((dimension) => ({
    dimensionId: dimension.dimension_id,
    dimensionName: dimension.dimension_name,
    score: dimension.score,
    percent: dimension.percent,
    weight: dimension.weight,
    questionCount: dimension.question_count,
    subdomains: dimension.subdomains.map((subdomain) => ({
      subdomainId: subdomain.subdomain_id,
      subdomainName: subdomain.subdomain_name,
      score: subdomain.score,
      percent: subdomain.percent,
      questionCount: subdomain.question_count,
    })),
  }));
}

export function toMaturityRadarData(results: MaturityResultsResponse): Array<{
  dimension: string;
  score: number;
  fullMark: number;
}> {
  return results.dimensions.map((dimension) => ({
    dimension: dimension.dimension_name,
    score: dimension.score,
    fullMark: 5,
  }));
}
