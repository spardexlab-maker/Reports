export async function extractCoordinatesFromUrl(url: string): Promise<{ lat: number; lng: number } | null> {
  try {
    // 1. If it's a short link, resolve it first
    let finalUrl = url;
    if (url.includes("goo.gl") || url.includes("maps.app.goo.gl")) {
      const res = await fetch("/api/resolve-location", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      if (res.ok) {
        const data = await res.json();
        finalUrl = data.url || url;
      }
    }

    // 2. Try to match @lat,lng
    const atMatch = finalUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (atMatch && atMatch.length >= 3) {
      return {
        lat: parseFloat(atMatch[1]),
        lng: parseFloat(atMatch[2]),
      };
    }

    // 3. Try to match q=lat,lng
    const qMatch = finalUrl.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (qMatch && qMatch.length >= 3) {
      return {
        lat: parseFloat(qMatch[1]),
        lng: parseFloat(qMatch[2]),
      };
    }

    // 4. Try to match ll=lat,lng
    const llMatch = finalUrl.match(/[?&]ll=(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (llMatch && llMatch.length >= 3) {
      return {
        lat: parseFloat(llMatch[1]),
        lng: parseFloat(llMatch[2]),
      };
    }

    // 5. Try to match place/lat,lng
    const placeMatch = finalUrl.match(/\/place\/(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (placeMatch && placeMatch.length >= 3) {
      return {
        lat: parseFloat(placeMatch[1]),
        lng: parseFloat(placeMatch[2]),
      };
    }

    // 6. Try to match search/lat,lng
    const searchMatch = finalUrl.match(/\/search\/(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (searchMatch && searchMatch.length >= 3) {
      return {
        lat: parseFloat(searchMatch[1]),
        lng: parseFloat(searchMatch[2]),
      };
    }

    // 7. Try to match !3dLAT!4dLNG (common in Google Maps data parameter)
    const dataMatch = finalUrl.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
    if (dataMatch && dataMatch.length >= 3) {
      return {
        lat: parseFloat(dataMatch[1]),
        lng: parseFloat(dataMatch[2]),
      };
    }

    // 8. Try to match any lat,lng pair in the URL (last resort)
    const genericMatch = finalUrl.match(/(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (genericMatch && genericMatch.length >= 3) {
      const lat = parseFloat(genericMatch[1]);
      const lng = parseFloat(genericMatch[2]);
      // Basic validation to avoid matching random numbers
      if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        return { lat, lng };
      }
    }

    return null;
  } catch (error) {
    console.error("Error extracting coordinates:", error);
    return null;
  }
}
