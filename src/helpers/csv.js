// A minimal RFC-4180-ish CSV line parser (quoted fields, escaped "" inside quotes) - shared so
// every CSV-paste importer in the app (jobs, timesheets, ...) uses the same real parser instead
// of a naive .split(",") that breaks on any quoted field containing a comma.
export function parseCsvLine(line) {
  const cells = []; let cur = ""; let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else inQuotes = false; }
      else cur += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') { cells.push(cur); cur = ""; }
    else cur += c;
  }
  cells.push(cur);
  return cells.map(c => c.trim());
}
