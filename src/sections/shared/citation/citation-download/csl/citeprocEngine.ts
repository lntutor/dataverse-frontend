import CSL from 'citeproc'
import { getResolvedStyleXml, getLocaleXml, DEFAULT_CSL_LOCALE } from './cslStyleFetcher'

export type CslJsonItem = Record<string, unknown> & { id?: string | number }

const FALLBACK_ITEM_ID = 'dataverse-citation-item'

export async function formatCitationAsHtml(
  cslJsonItem: CslJsonItem,
  styleSlug: string,
  locale: string = DEFAULT_CSL_LOCALE
): Promise<string> {
  const [styleXml, localeXml] = await Promise.all([
    getResolvedStyleXml(styleSlug),
    getLocaleXml(locale)
  ])

  const itemId = String(cslJsonItem.id ?? FALLBACK_ITEM_ID)
  const item: CslJsonItem = { ...cslJsonItem, id: itemId }

  const engine = new CSL.Engine(
    {
      retrieveLocale: () => localeXml,
      retrieveItem: () => item
    },
    styleXml
  )
  engine.updateItems([itemId])
  const bibliography = engine.makeBibliography()
  return bibliography ? bibliography[1][0] ?? '' : ''
}
