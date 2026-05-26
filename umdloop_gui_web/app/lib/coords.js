// GNSS coordinate parsing for the delivery mission.
// Rule 2.b.v: coordinates may be provided in DD, DDM, or DMS.

export const COORD_FORMATS = {
  DD: {
    label: "DD",
    name: "Decimal Degrees",
    hint: "single signed number",
    examplesLat: ["38.9897", "-41.844044"],
    examplesLon: ["-76.9378", "146.574150"],
    placeholderLat: "38.9897",
    placeholderLon: "-76.9378",
  },
  DDM: {
    label: "DDM",
    name: "Degrees Decimal Minutes",
    hint: "deg min, space-separated; optional N/S/E/W",
    examplesLat: ["38 59.382 N", "-41 50.643"],
    examplesLon: ["76 56.268 W", "146 34.449 E"],
    placeholderLat: "38 59.382 N",
    placeholderLon: "76 56.268 W",
  },
  DMS: {
    label: "DMS",
    name: "Degrees Minutes Seconds",
    hint: "deg min sec, space-separated; optional N/S/E/W",
    examplesLat: ["38 59 22.92 N", "-41 50 38.6"],
    examplesLon: ["76 56 16.08 W", "146 34 26.9 E"],
    placeholderLat: "38 59 22.92 N",
    placeholderLon: "76 56 16.08 W",
  },
};

// Strip degree / minute / second / cardinal markers; return tokens + hemisphere sign.
function tokenize(input) {
  const raw = String(input).trim();
  if (!raw) return null;

  // Detect hemisphere from a leading or trailing N/S/E/W (case-insensitive).
  let sign = 1;
  let body = raw;
  const hemi = body.match(/^\s*([NSEW])\b|\b([NSEW])\s*$/i);
  if (hemi) {
    const letter = (hemi[1] || hemi[2]).toUpperCase();
    if (letter === "S" || letter === "W") sign = -1;
    body = body.replace(hemi[0], " ").trim();
  }

  // Replace common symbols with spaces so split handles them uniformly.
  body = body.replace(/[°ºd]/gi, " ").replace(/[′'`]/g, " ").replace(/[″"]/g, " ").replace(/,/g, " ");
  const parts = body.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return null;

  const nums = parts.map(Number);
  if (nums.some((n) => Number.isNaN(n))) return null;

  // If the only number is signed, fold that sign in.
  if (nums.length >= 1 && nums[0] < 0) {
    sign *= -1;
    nums[0] = -nums[0];
  }
  return { sign, nums };
}

export function parseCoord(input, { axis = "lat", format = "DD" } = {}) {
  const t = tokenize(input);
  if (!t) return { ok: false, error: "Empty or invalid coordinate" };

  const { sign, nums } = t;
  let value;
  if (format === "DD") {
    if (nums.length !== 1) return { ok: false, error: "DD expects a single number" };
    value = nums[0];
  } else if (format === "DDM") {
    if (nums.length < 2) return { ok: false, error: "DDM expects degrees and minutes" };
    const [deg, min] = nums;
    if (min < 0 || min >= 60) return { ok: false, error: "Minutes must be in [0, 60)" };
    value = deg + min / 60;
  } else if (format === "DMS") {
    if (nums.length < 3) return { ok: false, error: "DMS expects degrees, minutes, and seconds" };
    const [deg, min, sec] = nums;
    if (min < 0 || min >= 60) return { ok: false, error: "Minutes must be in [0, 60)" };
    if (sec < 0 || sec >= 60) return { ok: false, error: "Seconds must be in [0, 60)" };
    value = deg + min / 60 + sec / 3600;
  } else {
    return { ok: false, error: `Unknown format ${format}` };
  }

  value *= sign;
  const limit = axis === "lat" ? 90 : 180;
  if (value < -limit || value > limit) {
    return { ok: false, error: `${axis === "lat" ? "Latitude" : "Longitude"} out of range` };
  }
  return { ok: true, value };
}
