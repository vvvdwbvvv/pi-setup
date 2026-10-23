import type { RuntimeContext, ToolResult } from "../core/types.js";
import { fail, ok } from "../core/errors.js";

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

async function searchBrave(
  apiKey: string,
  searchTerm: string,
): Promise<SearchResult[]> {
  const url = new URL("https://api.search.brave.com/res/v1/web/search");
  url.searchParams.set("q", searchTerm);
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "X-Subscription-Token": apiKey,
    },
  });
  if (!response.ok) {
    throw new Error(`Brave API error: ${response.status}`);
  }
  const data = (await response.json()) as {
    web?: { results?: Array<{ title: string; url: string; description?: string }> };
  };
  return (data.web?.results ?? []).map((r) => ({
    title: r.title,
    url: r.url,
    snippet: r.description ?? "",
  }));
}

export async function handleWebSearch(
  args: unknown,
  ctx: RuntimeContext,
): Promise<ToolResult> {
  const { search_term } = args as { search_term: string };
  if (!ctx.searchApiKey) {
    return fail(
      "not_configured",
      "Set AGENT_ESSENTIAL_SEARCH_API_KEY to enable WebSearch",
    );
  }
  try {
    if (ctx.searchProvider === "brave") {
      const results = await searchBrave(ctx.searchApiKey, search_term);
      return ok({ results });
    }
    return fail(
      "not_configured",
      `Unknown search provider: ${ctx.searchProvider}`,
    );
  } catch (err) {
    return fail("execution_failed", "Search failed", { error: String(err) });
  }
}
