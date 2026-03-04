export interface ScrapeResult {
  content: string;
  error?: string;
}

/**
 * Scrape a company website and extract meaningful text content.
 * Returns truncated text (~1500 chars) suitable for passing to an LLM.
 */
export async function scrapeWebsite(url: string): Promise<ScrapeResult> {
  try {
    // Ensure URL has protocol
    const fullUrl = url.startsWith("http") ? url : `https://${url}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(fullUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; EmailCampaignBot/1.0; +https://example.com)",
        Accept: "text/html",
      },
      redirect: "follow",
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return { content: "", error: `HTTP ${response.status}` };
    }

    const html = await response.text();
    const text = extractTextFromHtml(html);

    if (!text.trim()) {
      return { content: "", error: "No meaningful content extracted" };
    }

    return { content: text };
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      return { content: "", error: "Timeout after 5s" };
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return { content: "", error: message };
  }
}

/**
 * Strip HTML tags and extract meaningful text content.
 * Removes nav, footer, script, style, and other non-content elements.
 */
function extractTextFromHtml(html: string): string {
  // Remove script, style, nav, footer, header, aside, and form elements
  let cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
    .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
    .replace(/<header[\s\S]*?<\/header>/gi, " ")
    .replace(/<aside[\s\S]*?<\/aside>/gi, " ")
    .replace(/<form[\s\S]*?<\/form>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ");

  // Remove all remaining HTML tags
  cleaned = cleaned.replace(/<[^>]+>/g, " ");

  // Decode common HTML entities
  cleaned = cleaned
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#\d+;/g, " ")
    .replace(/&\w+;/g, " ");

  // Collapse whitespace and trim
  cleaned = cleaned.replace(/\s+/g, " ").trim();

  // Truncate to ~1500 characters at a word boundary
  if (cleaned.length > 1500) {
    const truncated = cleaned.slice(0, 1500);
    const lastSpace = truncated.lastIndexOf(" ");
    cleaned = (lastSpace > 1200 ? truncated.slice(0, lastSpace) : truncated) + "...";
  }

  return cleaned;
}
