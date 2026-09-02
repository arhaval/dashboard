/**
 * SRT / VTT subtitle cleaner.
 *
 * Turns raw subtitle text into a flowing speech paragraph the model can learn
 * style from — without timestamps, cue numbers, tags, non-speech markers, or
 * the duplicated lines rolling captions produce. Pure function, no I/O.
 */

const TIMESTAMP_LINE = /-->/;
const SEQ_NUMBER_LINE = /^\d+$/;
const TAG = /<[^>]+>|\{[^}]+\}/g; // <i>, <c.color>, {\an8} ...
const CUE_SETTING = /\b(align|position|line|size|region):\S+/gi;
// Non-speech notation auto-captioners insert into the middle of sentences.
// It is caption markup, not spoken words, so it must not reach the model.
const NON_SPEECH_MARKER =
  /\[\s*(m[uü]zik|music|alk[ıi][sş]|applause|g[uü]l[uü][sş]|laughter|ses|sound|inaudible|belirsiz)[^\]]*\]/gi;
const SPEAKER_MARK = /^>>+\s*/; // ">> " speaker-change marker

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, ' ');
}

/** Extract the spoken text lines from raw subtitle content, in order. */
function extractLines(raw: string): string[] {
  const out: string[] = [];
  for (const rawLine of raw.split(/\r?\n/)) {
    let line = rawLine.trim();
    if (!line) continue;
    if (line === 'WEBVTT' || line.startsWith('NOTE')) continue;
    if (TIMESTAMP_LINE.test(line)) continue;      // 00:00:01,000 --> 00:00:04,000
    if (SEQ_NUMBER_LINE.test(line)) continue;     // cue index
    line = line.replace(TAG, '').replace(CUE_SETTING, '').trim();
    line = line.replace(NON_SPEECH_MARKER, ' ').replace(SPEAKER_MARK, '').trim();
    line = decodeEntities(line).replace(/\s+/g, ' ').trim();
    if (line) out.push(line);
  }
  return out;
}

/**
 * Collapse the repeats rolling captions create: exact consecutive duplicates,
 * and the "progressive" case where one line is a prefix of the next (auto
 * captions grow a sentence word by word across cues).
 */
function dedupeOverlap(lines: string[]): string[] {
  const result: string[] = [];
  for (const line of lines) {
    if (result.length === 0) {
      result.push(line);
      continue;
    }
    const prev = result[result.length - 1];
    const a = prev.toLowerCase();
    const b = line.toLowerCase();
    if (a === b) continue;               // exact repeat
    if (b.startsWith(a)) {               // this line extends the previous one
      result[result.length - 1] = line;
      continue;
    }
    if (a.startsWith(b)) continue;       // this line is an earlier partial
    result.push(line);
  }
  return result;
}

/**
 * Full clean: raw subtitle → flowing speech text. Returns '' when there's no
 * spoken content. Non-subtitle plain text passes through largely intact (no
 * timestamps to strip), just whitespace-normalised.
 */
export function cleanSubtitle(raw: string): string {
  if (!raw?.trim()) return '';
  const lines = dedupeOverlap(extractLines(raw));
  return lines.join(' ').replace(/\s+([,.!?;:])/g, '$1').replace(/\s+/g, ' ').trim();
}

/** Heuristic: does this text look like SRT/VTT (has cue timestamps)? */
export function looksLikeSubtitle(raw: string): boolean {
  return /\d{1,2}:\d{2}:\d{2}[,.]\d{3}\s*-->/.test(raw) || /^WEBVTT/m.test(raw);
}
