import { FileSize, FileSizeUnit } from '@/files/domain/models/FileMetadata'
import { FileAccessStatus } from '@/files/domain/models/FileTreeItem'

export function formatBytes(input: number | undefined): string {
  if (input === undefined || input === null || Number.isNaN(input)) {
    return ''
  }
  // Delegate to the domain FileSize so the tree shows the same unit
  // ladder (B…PB) and rounding as the files table — a 2 TB folder must
  // not render as "2048.00 GB" here while the table says "2 TB".
  return new FileSize(input, FileSizeUnit.BYTES).toString()
}

export function formatCount(input: number | undefined): string {
  if (input === undefined || input === null || Number.isNaN(input)) {
    return ''
  }
  if (input < 1000) {
    return input.toString()
  }
  return `${(input / 1000).toFixed(1)}k`
}

/**
 * The non-public access states, i.e. everything the access column
 * should visually flag. Single source for the display precedence used
 * by both file and folder rows; labels come from the `tree.access.*`
 * i18n keys so the column is translatable like every other tree cell.
 */
export type AccessVariant = Exclude<FileAccessStatus, 'public'>

/**
 * Colour-cue variant for a file row: the access state itself, or
 * `undefined` for public/unknown (no cue — public is the default and
 * would be column noise).
 */
export function fileAccessVariant(access: FileAccessStatus | undefined): AccessVariant | undefined {
  return access === undefined || access === 'public' ? undefined : access
}

/**
 * Colour-cue variant for a folder row: the strongest state present in
 * the subtree, following the server's per-file resolution order —
 * retention-expired wins (those files cannot be served at all), then
 * restricted, then embargoed. The label lists every non-empty bucket
 * (see `folderAccessParts`); the colour flags only the strongest.
 */
export function folderAccessVariant(
  counts: { restricted?: number; embargoed?: number; retentionExpired?: number } | undefined
): AccessVariant | undefined {
  if ((counts?.retentionExpired ?? 0) > 0) return 'retentionExpired'
  if ((counts?.restricted ?? 0) > 0) return 'restricted'
  if ((counts?.embargoed ?? 0) > 0) return 'embargoed'
  return undefined
}

/**
 * The non-empty access buckets of a folder's subtree, in display order
 * (reading order, not severity — the cell text is a complete summary,
 * the colour carries the severity). The caller renders each part via
 * the plural-aware `tree.access.count.<key>` i18n keys and joins them.
 */
export function folderAccessParts(
  counts: { restricted?: number; embargoed?: number; retentionExpired?: number } | undefined
): { key: AccessVariant; count: number }[] {
  const parts: { key: AccessVariant; count: number }[] = []
  const restricted = counts?.restricted ?? 0
  const embargoed = counts?.embargoed ?? 0
  const retentionExpired = counts?.retentionExpired ?? 0
  if (restricted > 0) parts.push({ key: 'restricted', count: restricted })
  if (embargoed > 0) parts.push({ key: 'embargoed', count: embargoed })
  if (retentionExpired > 0) parts.push({ key: 'retentionExpired', count: retentionExpired })
  return parts
}
