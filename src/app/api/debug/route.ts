export async function GET() {
  return Response.json({
    hasClaude: !!process.env.CLAUDE_API_KEY,
    claudePrefix: process.env.CLAUDE_API_KEY?.substring(0, 10) || "NOT SET",
    claudeLen: process.env.CLAUDE_API_KEY?.length || 0,
    hasAnthropic: !!process.env.ANTHROPIC_API_KEY,
    anthropicPrefix: process.env.ANTHROPIC_API_KEY?.substring(0, 10) || "NOT SET",
    anthropicLen: process.env.ANTHROPIC_API_KEY?.length || 0,
    hasGoogle: !!process.env.GOOGLE_AI_API_KEY,
    hasDuffel: !!process.env.DUFFEL_API_KEY,
    hasSerpapi: !!process.env.SERPAPI_API_KEY,
    hasDb: !!process.env.DATABASE_URL,
  });
}
