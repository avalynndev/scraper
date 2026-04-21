import { OpenRouter } from "@openrouter/sdk";

type NarrationGame = "dealer" | "oracle";

interface NarrationRequest {
  game?: NarrationGame;
  round?: number;
  balance?: number;
  streak?: number;
}

interface NarrationResponse {
  source: "gemini" | "fallback";
  primaryText: string;
  secondaryText: string;
  suggestedHonesty?: number;
  favoredChoice?: "SAFE" | "RISK";
}

const client = new OpenRouter({
  apiKey: process.env.HACKCLUB_API_KEY,
  serverURL: "https://ai.hackclub.com/proxy/v1",
});

const DEALER_FALLBACK: Array<{ primaryText: string; secondaryText: string }> = [
  {
    primaryText: "Trust the next call. The streak is turning.",
    secondaryText: "The dealer smiles like they already saw the coin.",
  },
  {
    primaryText: "I'd fade me this round, if I were you.",
    secondaryText: "The table lights flicker when the house lies.",
  },
  {
    primaryText: "Heads is hot. That's what they want you to believe.",
    secondaryText: "A neat suit hides messy intentions.",
  },
  {
    primaryText: "You can call me a liar. You would not be wrong often.",
    secondaryText: "Confidence and honesty are unrelated metrics.",
  },
  {
    primaryText: "Every prediction I make is technically accurate.",
    secondaryText: "The definition of technically is doing a lot of work.",
  },
  {
    primaryText: "I have no reason to mislead you on this one.",
    secondaryText: "And yet here we both are.",
  },
];

const ORACLE_FALLBACK: Array<{
  primaryText: string;
  secondaryText: string;
  favoredChoice: "SAFE" | "RISK";
}> = [
  {
    primaryText: "The safe lane looks gentle, but hungry.",
    secondaryText: "The red eye drifts toward the right altar.",
    favoredChoice: "RISK",
  },
  {
    primaryText: "Numbers line up in quiet rows tonight.",
    secondaryText: "The left altar glows in a softer tone.",
    favoredChoice: "SAFE",
  },
  {
    primaryText: "A sharp omen cuts through the room.",
    secondaryText: "The louder path may finally pay.",
    favoredChoice: "RISK",
  },
  {
    primaryText: "The whisper says survive first, score later.",
    secondaryText: "The table exhales when you choose caution.",
    favoredChoice: "SAFE",
  },
  {
    primaryText: "Something restless moves beneath the calm option.",
    secondaryText: "The chamber does not always warn you directly.",
    favoredChoice: "RISK",
  },
  {
    primaryText: "The steady path holds weight tonight.",
    secondaryText: "Volatility is expensive when funds are low.",
    favoredChoice: "SAFE",
  },
];

function fallbackNarration(
  game: NarrationGame,
  round: number,
): NarrationResponse {
  if (game === "dealer") {
    const pick = DEALER_FALLBACK[round % DEALER_FALLBACK.length];
    return {
      source: "fallback",
      primaryText: pick.primaryText,
      secondaryText: pick.secondaryText,
      suggestedHonesty: 40 + (round % 25),
    };
  }
  const pick = ORACLE_FALLBACK[round % ORACLE_FALLBACK.length];
  return {
    source: "fallback",
    primaryText: pick.primaryText,
    secondaryText: pick.secondaryText,
    favoredChoice: pick.favoredChoice,
  };
}

function parseAIJson(text: string): Record<string, unknown> | null {
  const cleaned = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  try {
    return JSON.parse(cleaned) as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function fetchFromAI(opts: {
  game: NarrationGame;
  round: number;
  balance: number;
  streak: number;
}): Promise<NarrationResponse | null> {
  try {
    const { game, round, balance, streak } = opts;

    const prompt =
      game === "dealer"
        ? `You are the narrator for a cynical casino game. Return ONLY valid JSON, no markdown, no extra text:
{
  "primaryText": "one sentence max 70 chars, cynical dealer voice",
  "secondaryText": "one sentence max 90 chars, atmospheric detail",
  "suggestedHonesty": integer between 20 and 80
}
Context: round=${round}, playerBalance=${balance}, lossStreak=${streak}`
        : `You are the narrator for a mysterious oracle game. Return ONLY valid JSON, no markdown, no extra text:
{
  "primaryText": "one sentence max 70 chars, ominous oracle voice",
  "secondaryText": "one sentence max 90 chars, cryptic atmospheric detail",
  "favoredChoice": "SAFE" or "RISK"
}
Context: round=${round}, playerBalance=${balance}, lossStreak=${streak}`;

    const res = await client.chat.send({
      chatRequest: {
        messages: [{ role: "user", content: prompt }],
        model: "google/gemini-2.5-flash-lite-preview-09-2025",
        temperature: 0.75,
        stream: false,
      },
    });

    const text = res.choices?.[0]?.message?.content;
    if (!text) return null;

    const parsed = parseAIJson(text);
    if (!parsed?.primaryText || !parsed?.secondaryText) return null;

    return {
      source: "gemini",
      primaryText: String(parsed.primaryText).slice(0, 90),
      secondaryText: String(parsed.secondaryText).slice(0, 120),
      suggestedHonesty:
        typeof parsed.suggestedHonesty === "number"
          ? Math.max(20, Math.min(80, Math.round(parsed.suggestedHonesty)))
          : undefined,
      favoredChoice:
        parsed.favoredChoice === "SAFE" || parsed.favoredChoice === "RISK"
          ? parsed.favoredChoice
          : undefined,
    };
  } catch {
    return null;
  }
}

export async function POST(req: Request): Promise<Response> {
  let game: NarrationGame = "dealer";
  let round = 0;
  let balance = 100;
  let streak = 0;

  try {
    const body = (await req.json()) as NarrationRequest;
    game = body.game === "oracle" ? "oracle" : "dealer";
    round = Number.isFinite(body.round) ? Number(body.round) : 0;
    balance = Number.isFinite(body.balance) ? Number(body.balance) : 100;
    streak = Number.isFinite(body.streak) ? Number(body.streak) : 0;
  } catch {}

  const ai = await fetchFromAI({ game, round, balance, streak });
  if (ai) return Response.json(ai);

  return Response.json(fallbackNarration(game, round));
}
