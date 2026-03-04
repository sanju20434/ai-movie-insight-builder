export async function GET(req) {

  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")
  const apiKey = process.env.OMDB_API_KEY || "7ec7e5e5"

  if (!id || !/^tt\d{7,8}$/.test(id)) {
    return Response.json(
      { error: "Invalid IMDb ID. It should look like tt0133093." },
      { status: 400 }
    )
  }

  if (!apiKey) {
    return Response.json(
      { error: "OMDB API key is not configured on the server." },
      { status: 500 }
    )
  }

  try {
    const res = await fetch(
      `https://www.omdbapi.com/?i=${id}&apikey=${apiKey}`
    )

    if (!res.ok) {
      return Response.json(
        { error: "Failed to fetch movie details from OMDb." },
        { status: 502 }
      )
    }

    const data = await res.json()

    return Response.json(data)
  } catch (error) {
    return Response.json(
      { error: "Unexpected error while fetching movie details." },
      { status: 500 }
    )
  }

}