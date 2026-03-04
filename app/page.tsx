"use client";
import { useState } from "react";

export default function Home() {

  const [id, setId] = useState("");
  const [movie, setMovie] = useState<any | null>(null);
  const [sentiment, setSentiment] = useState<any | null>(null);
  const [reviews, setReviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function analyze() {

    const trimmed = id.trim();
    const imdbPattern = /^tt\d{7,8}$/;

    if (!trimmed) {
      setError("Enter IMDb ID (example: tt0133093).");
      return;
    }

    if (!imdbPattern.test(trimmed)) {
      setError("Invalid IMDb ID format. It should look like tt0133093.");
      return;
    }

    setError("");
    setLoading(true);
    setMovie(null);
    setSentiment(null);
    setReviews([]);

    try {
      const [movieRes, reviewsRes] = await Promise.all([
        fetch(`/api/movie?id=${encodeURIComponent(trimmed)}`),
        fetch(`/api/reviews?id=${encodeURIComponent(trimmed)}`),
      ]);

      if (!movieRes.ok) {
        const movieError = await movieRes.json().catch(() => null);
        throw new Error(
          movieError?.error || "Unable to fetch movie details. Please try again."
        );
      }

      const movieData = await movieRes.json();

      if (movieData.Response === "False") {
        throw new Error(movieData.Error || "Movie not found.");
      }

      setMovie(movieData);

      const reviewsData = await reviewsRes.json();
      const safeReviews = Array.isArray(reviewsData) ? reviewsData : [];
      setReviews(safeReviews);

      const sentimentRes = await fetch("/api/sentiment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reviews: safeReviews,
        }),
      });

      if (!sentimentRes.ok) {
        throw new Error("Unable to analyze sentiment right now. Please try again.");
      }

      const sentimentData = await sentimentRes.json();
      setSentiment(sentimentData);
    } catch (e: any) {
      setError(e?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#050608] text-slate-50 flex flex-col items-center px-4 py-8 md:py-10">
      <section className="w-full max-w-5xl">
        <header className="mb-6 md:mb-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="h-8 w-8 rounded-sm bg-yellow-500 flex items-center justify-center text-black font-extrabold text-lg">
              M
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-semibold tracking-tight">
                Movie Insight Builder
              </h1>
              <p className="text-[11px] md:text-xs uppercase tracking-widest text-slate-400">
                Inspired by IMDb · Audience data + AI
              </p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-4 text-[11px] text-slate-400">
            <span className="px-2 py-0.5 rounded-full border border-slate-700/80">
              IMDb ID search
            </span>
            <span className="px-2 py-0.5 rounded-full border border-slate-700/80">
              Real user reviews
            </span>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1.1fr)] items-start">
          <div className="relative overflow-hidden rounded-xl border border-slate-800/80 bg-[#111318] shadow-lg">
            <div className="relative p-5 md:p-6 space-y-5">
              <div className="space-y-2">
                <h2 className="text-base md:text-lg font-semibold flex items-center gap-2">
                  Search by IMDb ID
                  <span className="rounded-sm bg-yellow-500 px-1.5 py-[1px] text-[10px] font-bold text-black">
                    IMDB
                  </span>
                </h2>
                <p className="text-xs md:text-sm text-slate-300/80">
                  We fetch movie details from OMDb and real audience reviews directly from IMDb (with TMDB as
                  a backup), then run a light AI-style sentiment pass over that real text.
                </p>
              </div>

              <div className="space-y-3">
                <label className="block text-xs font-medium text-slate-300/90">
                  IMDb Movie ID
                </label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    value={id}
                    onChange={(e) => setId(e.target.value)}
                    placeholder="e.g. tt0133093"
                    className="flex-1 rounded-md border border-slate-700/80 bg-[#050608] px-3.5 py-2.5 text-sm outline-none ring-0 transition focus:border-yellow-400 focus:ring-1 focus:ring-yellow-500/70"
                  />
                  <button
                    type="button"
                    onClick={analyze}
                    disabled={loading}
                    className="inline-flex items-center justify-center rounded-md bg-yellow-500 px-5 py-2.5 text-sm font-semibold text-black shadow-md shadow-yellow-500/50 transition hover:bg-yellow-400 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {loading ? (
                      <span className="inline-flex items-center gap-2">
                        <span className="h-4 w-4 animate-spin rounded-full border-[2px] border-fuchsia-200 border-t-transparent" />
                        Analyzing…
                      </span>
                    ) : (
                      "Analyze movie"
                    )}
                  </button>
                </div>
                <p className="text-[11px] text-slate-400">
                  Tip: The IMDb ID is the code you see in the movie URL on{" "}
                  <span className="font-mono text-slate-200">imdb.com/title/ttXXXXXXX</span>.
                </p>
              </div>

              {error && (
                <p className="text-xs md:text-sm rounded-md border border-red-500/60 bg-red-500/10 px-3 py-2 text-red-100">
                  {error}
                </p>
              )}

              {!movie && !error && !loading && (
                <div className="rounded-md border border-slate-800/80 bg-[#050608] px-4 py-3 text-xs md:text-sm text-slate-300/85">
                  Enter an IMDb ID above to see the movie details, cast, ratings, plot, genuine user reviews and
                  a sentiment overview, similar in spirit to the IMDb detail page.
                </div>
              )}
            </div>
          </div>

          {movie && (
            <div className="space-y-4 animate-[fadeIn_0.5s_ease-out]">
              <div className="rounded-xl border border-slate-800/90 bg-[#111318] p-4 md:p-5 shadow-lg shadow-black/40">
                <div className="grid gap-5 md:grid-cols-[auto,minmax(0,1fr)]">
                  {movie.Poster && movie.Poster !== "N/A" && (
                    <div className="flex justify-center md:justify-start">
                      <img
                        src={movie.Poster}
                        alt={movie.Title}
                        className="h-52 w-auto rounded-xl border border-slate-800/80 object-cover shadow-md shadow-slate-900/80 transition-transform duration-200 ease-out hover:scale-[1.02] hover:shadow-2xl"
                      />
                    </div>
                  )}
                  <div className="space-y-3">
                    <div>
                      <h2 className="text-xl md:text-2xl font-semibold leading-tight">
                        {movie.Title}
                      </h2>
                      <p className="mt-1 flex flex-wrap items-center gap-2 text-xs md:text-sm text-slate-300/85">
                        {movie.Year && <span>{movie.Year}</span>}
                        {movie.Runtime && (
                          <>
                            <span className="text-slate-500">·</span>
                            <span>{movie.Runtime}</span>
                          </>
                        )}
                        {movie.Rated && (
                          <span className="inline-flex items-center rounded-[3px] border border-slate-700/80 px-1.5 py-[1px] text-[10px] uppercase tracking-widest text-slate-200">
                            {movie.Rated}
                          </span>
                        )}
                      </p>
                    </div>

                    <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-[11px] md:text-xs text-slate-200/90">
                      <div className="flex items-center gap-2">
                        <div className="inline-flex items-center rounded-[3px] bg-yellow-500 px-2 py-1 text-xs font-bold text-black">
                          IMDb
                        </div>
                        <div>
                          <dt className="text-slate-400">User rating</dt>
                          <dd className="mt-0.5 font-semibold">
                            {movie.imdbRating && movie.imdbRating !== "N/A"
                              ? `${movie.imdbRating} / 10`
                              : "Not available"}
                          </dd>
                        </div>
                      </div>
                      <div>
                        <dt className="text-slate-400">Runtime</dt>
                        <dd className="mt-0.5">{movie.Runtime || "—"}</dd>
                      </div>
                      <div className="col-span-2">
                        <dt className="text-slate-400">Cast</dt>
                        <dd className="mt-0.5">{movie.Actors || "Not listed"}</dd>
                      </div>
                      <div className="col-span-2">
                        <dt className="text-slate-400">Genres</dt>
                        <dd className="mt-0.5">{movie.Genre || "—"}</dd>
                      </div>
                    </dl>

                    {movie.Plot && movie.Plot !== "N/A" && (
                      <div className="mt-1 text-xs md:text-sm text-slate-200/95">
                        <p className="font-medium mb-0.5">Plot summary</p>
                        <p className="text-slate-200/90">{movie.Plot}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {sentiment && (
                <div className="rounded-xl border border-slate-800 bg-[#050608] p-4 md:p-5 shadow-md">
                  <h3 className="text-sm md:text-base font-semibold mb-2 flex items-center justify-between">
                    Audience sentiment
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-widest ${
                        sentiment.overallSentiment === "positive"
                          ? "border-emerald-400/60 bg-emerald-500/10 text-emerald-100"
                          : sentiment.overallSentiment === "negative"
                          ? "border-red-400/60 bg-red-500/10 text-red-100"
                          : "border-amber-300/60 bg-amber-400/10 text-amber-100"
                      }`}
                    >
                      {sentiment.overallSentiment || "mixed"}
                    </span>
                  </h3>
                  {sentiment.summary && (
                    <p className="text-xs md:text-sm text-slate-100/95 mb-3">
                      {sentiment.summary}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-3 text-[11px] md:text-xs text-slate-200/90">
                    <div className="inline-flex items-center gap-2 rounded-full bg-slate-900/80 px-3 py-1">
                      <span className="h-2 w-2 rounded-full bg-emerald-400" />
                      <span className="font-medium">
                        Positive mentions:{" "}
                        <span className="font-semibold">
                          {typeof sentiment.positive === "number" ? sentiment.positive : 0}
                        </span>
                      </span>
                    </div>
                    <div className="inline-flex items-center gap-2 rounded-full bg-slate-900/80 px-3 py-1">
                      <span className="h-2 w-2 rounded-full bg-red-400" />
                      <span className="font-medium">
                        Negative mentions:{" "}
                        <span className="font-semibold">
                          {typeof sentiment.negative === "number" ? sentiment.negative : 0}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {reviews.length > 0 && (
                <div className="rounded-xl border border-slate-800 bg-[#111318] p-4 md:p-5 shadow-md">
                  <h3 className="text-sm md:text-base font-semibold mb-3">
                    Sample audience reviews (from IMDb)
                  </h3>
                  <div className="max-h-64 overflow-y-auto space-y-3 pr-1 text-xs md:text-sm text-slate-100/95">
                    {reviews.slice(0, 6).map((review, index) => (
                      <article
                        key={index}
                        className="rounded-md border border-slate-800/80 bg-[#050608] px-3 py-2"
                      >
                        <p className="whitespace-pre-line leading-relaxed">{review}</p>
                      </article>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}