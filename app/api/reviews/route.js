function stripHtml(raw) {
  return raw
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractImdbReviews(html) {
  const result = [];

  const regex =
    /<div[^>]+class="text\s+show-more__control[^"]*"[^>]*>([\s\S]*?)<\/div>/gi;
  let match;

  while ((match = regex.exec(html)) !== null) {
    const cleaned = stripHtml(match[1] || "");
    if (cleaned.length > 0) {
      result.push(cleaned);
    }
    if (result.length >= 50) break;
  }

  return result;
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const imdbId = searchParams.get("id");

  if (!imdbId || !/^tt\d{7,8}$/.test(imdbId)) {
    return Response.json(
      { error: "Invalid IMDb ID. It should look like tt0133093." },
      { status: 400 }
    );
  }

  // 1. Try to fetch real reviews directly from IMDb
  try {
    const imdbRes = await fetch(
      `https://www.imdb.com/title/${imdbId}/reviews?ref_=tt_ov_rt`,
      {
        headers: {
          "Accept-Language": "en-US,en;q=0.9",
        },
      }
    );

    if (imdbRes.ok) {
      const html = await imdbRes.text();
      const imdbReviews = extractImdbReviews(html);

      if (imdbReviews.length > 0) {
        return Response.json(imdbReviews);
      }
    }
  } catch (error) {
    // fall through to TMDB fallback
  }

  // 2. Fallback: TMDB reviews (still real user reviews, just from TMDB)
  try {
    if (!process.env.TMDB_API_KEY) {
      return Response.json([]);
    }

    const findRes = await fetch(
      `https://api.themoviedb.org/3/find/${imdbId}?api_key=${process.env.TMDB_API_KEY}&external_source=imdb_id`
    );

    if (!findRes.ok) {
      return Response.json([]);
    }

    const findData = await findRes.json();
    const movie = findData.movie_results?.[0];

    if (!movie) {
      return Response.json([]);
    }

    const reviewsRes = await fetch(
      `https://api.themoviedb.org/3/movie/${movie.id}/reviews?api_key=${process.env.TMDB_API_KEY}`
    );

    if (!reviewsRes.ok) {
      return Response.json([]);
    }

    const reviewsData = await reviewsRes.json();
    const reviews = Array.isArray(reviewsData.results)
      ? reviewsData.results
          .map((r) => (r && typeof r.content === "string" ? r.content.trim() : ""))
          .filter((text) => text.length > 0)
      : [];

    return Response.json(reviews);
  } catch (err) {
    return Response.json([]);
  }
}