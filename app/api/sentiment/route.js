function getRuleBasedSentiment(reviews) {
  const safeReviews = Array.isArray(reviews) ? reviews : [];

  let positive = 0;
  let negative = 0;

  const positiveWords = [
    "amazing",
    "best",
    "great",
    "love",
    "loved",
    "awesome",
    "masterpiece",
    "fantastic",
    "incredible",
    "wonderful",
  ];

  const negativeWords = [
    "bad",
    "boring",
    "confusing",
    "overrated",
    "worst",
    "terrible",
    "awful",
    "disappointing",
    "poor",
  ];

  safeReviews.forEach((review) => {
    const text = String(review || "").toLowerCase();

    if (positiveWords.some((word) => text.includes(word))) {
      positive++;
    } else if (negativeWords.some((word) => text.includes(word))) {
      negative++;
    }
  });

  let overallSentiment = "mixed";

  if (positive === 0 && negative === 0) {
    overallSentiment = "mixed";
  } else if (positive >= negative * 1.5) {
    overallSentiment = "positive";
  } else if (negative >= positive * 1.5) {
    overallSentiment = "negative";
  }

  let summary;

  if (positive === 0 && negative === 0) {
    summary =
      "There are not enough clear signals in the available reviews to determine how audiences feel about this movie.";
  } else if (overallSentiment === "positive") {
    summary =
      "Most viewers are very positive about this movie, frequently praising elements like the story, visuals, and performances.";
  } else if (overallSentiment === "negative") {
    summary =
      "Many viewers are disappointed with this movie, often criticising aspects such as pacing, writing, or acting.";
  } else {
    summary =
      "Audience reactions are mixed, with a blend of strong praise and notable criticisms across the reviews.";
  }

  return {
    positive,
    negative,
    overallSentiment,
    summary,
  };
}

export async function POST(req) {
  const body = await req.json();
  const reviews = Array.isArray(body.reviews) ? body.reviews : [];

  const fallback = getRuleBasedSentiment(reviews);
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey || reviews.length === 0) {
    return Response.json(fallback);
  }

  try {
    const limitedReviews = reviews.slice(0, 20);

    const prompt = `
You are an AI assistant helping summarise audience sentiment for a movie based on user reviews.

Read the reviews below and:
1. Decide the overall audience sentiment as one of: "positive", "mixed", or "negative".
2. Write a short, 3–5 sentence natural-language summary of how people felt, mentioning what they liked and disliked.
3. Estimate how many reviews are generally positive vs generally negative.

Return ONLY a valid JSON object with this exact shape:
{
  "overallSentiment": "positive | mixed | negative",
  "summary": "short summary here",
  "positiveMentionsCount": number,
  "negativeMentionsCount": number
}

Reviews:
${limitedReviews.map((r, i) => `${i + 1}. ${r}`).join("\n\n")}
`.trim();

    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.3,
        messages: [
          {
            role: "system",
            content:
              "You are a precise movie sentiment analysis assistant. Always respond with strict, parseable JSON and nothing else.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });

    if (!openaiResponse.ok) {
      throw new Error("Failed to call OpenAI API");
    }

    const openaiJson = await openaiResponse.json();
    const content =
      openaiJson?.choices?.[0]?.message?.content &&
      String(openaiJson.choices[0].message.content).trim();

    let parsed;

    try {
      parsed = content ? JSON.parse(content) : null;
    } catch {
      parsed = null;
    }

    if (
      !parsed ||
      !parsed.summary ||
      !parsed.overallSentiment ||
      !["positive", "mixed", "negative"].includes(parsed.overallSentiment)
    ) {
      throw new Error("Invalid AI response");
    }

    return Response.json({
      summary: parsed.summary,
      overallSentiment: parsed.overallSentiment,
      positive:
        typeof parsed.positiveMentionsCount === "number"
          ? parsed.positiveMentionsCount
          : fallback.positive,
      negative:
        typeof parsed.negativeMentionsCount === "number"
          ? parsed.negativeMentionsCount
          : fallback.negative,
    });
  } catch (error) {
    return Response.json(fallback);
  }
}