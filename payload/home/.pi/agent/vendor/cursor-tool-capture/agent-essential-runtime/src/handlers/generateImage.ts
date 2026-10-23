import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import type { RuntimeContext, ToolResult } from "../core/types.js";
import { fail, ok } from "../core/errors.js";

export async function handleGenerateImage(
  args: unknown,
  ctx: RuntimeContext,
): Promise<ToolResult> {
  const input = args as {
    description: string;
    filename?: string;
    aspect_ratio?: string;
  };
  if (!ctx.imageApiKey) {
    return fail(
      "not_configured",
      "Set AGENT_ESSENTIAL_IMAGE_API_KEY to enable GenerateImage",
    );
  }
  const outDir = join(ctx.stateDir, "generated");
  mkdirSync(outDir, { recursive: true });
  const filename =
    input.filename ?? `image-${Date.now()}.png`;
  const safeName = filename.replace(/[/\\]/g, "_");
  const outPath = join(outDir, safeName);

  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ctx.imageApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "dall-e-3",
      prompt: input.description,
      n: 1,
      size: aspectToSize(input.aspect_ratio),
    }),
  });
  if (!response.ok) {
    const text = await response.text();
    return fail("execution_failed", "Image API request failed", {
      status: response.status,
      body: text,
    });
  }
  const data = (await response.json()) as {
    data?: Array<{ url?: string; b64_json?: string }>;
  };
  const item = data.data?.[0];
  if (!item) {
    return fail("execution_failed", "Image API returned no data");
  }
  if (item.b64_json) {
    writeFileSync(outPath, Buffer.from(item.b64_json, "base64"));
  } else if (item.url) {
    const img = await fetch(item.url);
    writeFileSync(outPath, Buffer.from(await img.arrayBuffer()));
  } else {
    return fail("execution_failed", "Image API returned no image payload");
  }
  return ok({ path: outPath, filename: safeName });
}

function aspectToSize(aspect?: string): "1024x1024" | "1792x1024" | "1024x1792" {
  switch (aspect) {
    case "16:9":
      return "1792x1024";
    case "9:16":
    case "3:4":
      return "1024x1792";
    default:
      return "1024x1024";
  }
}
