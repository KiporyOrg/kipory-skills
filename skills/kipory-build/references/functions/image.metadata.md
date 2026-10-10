<!-- generated: kipory-skills references · source: the deployment's function catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `image.metadata` — Extract image details

Read an image's size and the camera details stored in it.

Dimensions come back for any image format that can be read; the tags only for the narrower set that carries them — so an image can legitimately have dimensions and no tags. It returns whatever was there and never fails on a file that downloaded.

- **Group:** files · **Phase:** `ingest` · **Effect class:** `read`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `converges`
- **I/O:** `file` → `FileMetadata`
- **Reads:** One image file. The type is not checked — anything that is not a readable image comes back with only its `byteSize`. _(shape hint: `file`)_
- **Emits:** A `FileMetadata`, every field optional. A corrupt image never fails — it comes back as `{ byteSize }` alone; one without EXIF still has its dimensions and format.
- **Suggested input streams:** `currentFile`
- **Queue:** 1 attempt, no backoff; waits up to 1 min; cache no expiry — the function's default; an action replaces it with `reuseResultsForMinutes` (`0` always fetches fresh)

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `includeRawDebug` | boolean | no | `true` | Include a small curated raw debug object for fields that help troubleshoot parser output without storing everything the parser returned. |
| `segments` | string[], at least 1 item | no | `["tiff","exif","gps","iptc","xmp"]` | Metadata segment families to parse with the metadata parser. Default: TIFF + EXIF + GPS + IPTC + XMP. |

## Worked example

Whatever metadata an image carries, read and mapped. The variants show a phone photo, a screenshot, and a file with none.

#### A phone photo

JPEG with the full EXIF + GPS + IPTC suite. Every supported field is populated.

Reads `file` → emits `FileMetadata` · 1 in → 1 out

Input:

```
photos/IMG_4231.jpg (image/jpeg)
```

Output:

```
{
  "capturedAt": "2026-04-12T17:43:08.000Z",
  "modifiedAt": "2026-04-12T18:01:22.000Z",
  "location": {
    "lat": 37.8199,
    "lng": -122.4783
  },
  "locationAccuracy": 12,
  "device": {
    "make": "Apple",
    "model": "iPhone 15 Pro",
    "software": "18.4.1"
  },
  "dimensions": {
    "width": 4032,
    "height": 3024
  },
  "title": "Sunset over the bridge",
  "keywords": ["sunset", "bridge", "san francisco"],
  "raw": {
    "GPSHPositioningError": 12
  }
}
```

#### A screenshot

PNG screenshot — no GPS, no device, no IPTC. Only `dimensions` and `capturedAt` survive.

Reads `file` → emits `FileMetadata` · 1 in → 1 out

Input:

```
screenshots/Screenshot 2026-04-12 at 14.23.png (image/png)
```

Output:

```
{
  "capturedAt": "2026-04-12T14:23:01.000Z",
  "dimensions": {
    "width": 2880,
    "height": 1800
  }
}
```

#### Details removed

An image whose metadata was stripped on the way in. There is nothing to read, so the result is empty.

Reads `file` → emits `FileMetadata` · 1 in → 1 out

Input:

```
photos/scrubbed.jpg (image/jpeg)
```

Output:

```
{}
```
