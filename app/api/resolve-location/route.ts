import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { url } = await request.json()

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 })
    }

    // If it's a short link, we need to follow the redirect
    if (url.includes("goo.gl") || url.includes("maps.app.goo.gl")) {
      const response = await fetch(url, {
        method: "GET",
        redirect: "manual", // Don't follow automatically, just get the location header
      })

      const location = response.headers.get("location")
      
      if (location) {
        return NextResponse.json({ url: location })
      } else if (response.status >= 300 && response.status < 400) {
        // Sometimes fetch follows redirect anyway if manual is not fully supported in the environment,
        // or we can just fetch normally and get the final URL
        const finalResponse = await fetch(url, { method: "GET" })
        return NextResponse.json({ url: finalResponse.url })
      } else {
        // Fallback: just fetch and get the final URL
        const finalResponse = await fetch(url, { method: "GET" })
        return NextResponse.json({ url: finalResponse.url })
      }
    }

    return NextResponse.json({ url })
  } catch (error) {
    console.error("Error resolving location URL:", error)
    return NextResponse.json({ error: "Failed to resolve URL" }, { status: 500 })
  }
}
