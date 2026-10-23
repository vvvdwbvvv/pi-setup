import type { RuntimeContext, ToolResult } from "../core/types.js";
import { fail, ok } from "../core/errors.js";

function htmlToPlainText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function handleWebFetch(
  args: unknown,
  ctx: RuntimeContext,
): Promise<ToolResult> {
  const { url } = args as { url: string };
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return fail("validation_error", "Invalid URL");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return fail("security_denied", "Only http and https URLs are allowed");
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ctx.fetchTimeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    const contentType = response.headers.get("content-type") ?? "";
    const buffer = Buffer.from(await response.arrayBuffer());
    let truncated = false;
    let body = buffer;
    if (body.length > ctx.fetchMaxBytes) {
      body = body.subarray(0, ctx.fetchMaxBytes);
      truncated = true;
    }
    const text = body.toString("utf8");
    const markdown =
      contentType.includes("html") ? htmlToPlainText(text) : text;
    return ok({
      url,
      markdown,
      contentType,
      truncated,
      status: response.status,
    });
  } catch (err) {
    return fail("execution_failed", "Fetch failed", { error: String(err) });
  } finally {
    clearTimeout(timer);
  }
}
