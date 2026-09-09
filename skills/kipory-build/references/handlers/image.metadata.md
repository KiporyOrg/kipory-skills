<!-- generated: kipory-skills references · source: the deployment's handler catalog · version: d072dbbaba4c884693c307f89e8caf652dda27202fb703e86af59b78f690b003 · regenerated on every publish, so an edit here is overwritten; the deployment you are building on may serve a newer version — compare and prefer the live one -->

# `image.metadata` — Extract image metadata

Extract image dimensions and any EXIF, IPTC, or XMP metadata.

- **Group:** Files · **Phase:** `ingest` · **Effect class:** `read`
- **I/O:** `file` → `FileMetadata`
- **Reads:** One image file. The type is not checked — anything without readable metadata simply comes back empty. _(shape hint: `file`)_
- **Emits:** A `FileMetadata`, every field independently optional. An empty object means the file carried no metadata. A corrupt image fails rather than coming back empty.
- **Suggested input streams:** `currentFile`
- **Queue:** 1 attempt, no backoff; waits up to 60000ms; cache no expiry (custom-derive-source)

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `includeRawDebug` | boolean | no | `true` | Include a small curated raw debug object for fields that help troubleshoot parser output without storing everything the parser returned. |
| `segments` | string[] | no | `["tiff","exif","gps","iptc","xmp"]` | Metadata segment families to parse with the metadata parser. Default: TIFF + EXIF + GPS + IPTC + XMP. |

## Worked example

Whatever metadata an image carries, read and mapped. The variants show a phone photo, a screenshot, and a file with none.

Reads: exifr.parse. Emits: project to FileMetadata.

#### phone photo

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

#### screenshot

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

#### EXIF stripped

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
