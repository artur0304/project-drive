import assert from "node:assert/strict";
import { GeminiCarEditProvider } from "./geminiProvider";

async function main() {
  const originalFetch = globalThis.fetch;
  let capturedUrl = "";
  let capturedBody: any;
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    capturedUrl = String(input);
    capturedBody = JSON.parse(String(init?.body));
    assert.equal(new Headers(init?.headers).get("x-goog-api-key"), "fake-test-key");
    return new Response(JSON.stringify({
      steps: [{ type: "model_output", content: [{ type: "image", mime_type: "image/png", data: "AQID" }] }],
    }), { status: 200, headers: { "content-type": "application/json" } });
  }) as typeof fetch;
  try {
    const provider = new GeminiCarEditProvider({ apiKey: "fake-test-key", estimatedCostUsd: 0.05 });
    const result = await provider.generateCarEdit(
      "data:image/png;base64,AQID",
      "Keep the car and background unchanged.",
      [],
      [{ kind: "tint", level: "none" }],
    );
    assert.equal(capturedUrl, "https://generativelanguage.googleapis.com/v1beta/interactions");
    assert.equal(capturedBody.model, "gemini-3-pro-image");
    assert.equal(capturedBody.input[1].type, "image");
    assert.deepEqual(capturedBody.response_format, { type: "image" });
    assert.equal(result.outputImage, "data:image/png;base64,AQID");
  } finally {
    globalThis.fetch = originalFetch;
  }
  console.log("✅ Gemini adapter matches the verified Interactions request and image response shape.");
}

main();
