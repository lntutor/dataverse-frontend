import { ApiConfig, DataverseApiAuthMechanism } from '@iqss/dataverse-client-javascript'

export interface BearerTokenSource {
  /** Static token. Used directly if `getBearerToken` is not set. */
  bearerToken?: string
  /**
   * Per-request token getter. Wins over the static `bearerToken` when
   * present — return a fresh value to rotate auth without remounting.
   * Return `null`/`undefined` to fall through to `bearerToken`.
   */
  getBearerToken?: () => string | null | undefined
}

/**
 * Initialise the SDK's auth mechanism for a standalone bundle.
 *
 *  - Bearer token (static or getter) → `Authorization: Bearer <token>`
 *    on every API request. The right path for any host page that can
 *    produce a token: SPA hosts, third-party pages, cross-origin embeds.
 *  - Otherwise → session-cookie via `withCredentials: true`. The
 *    shortcut for same-origin JSF embeddings where the user is already
 *    authenticated and `DATAVERSE_FEATURE_API_SESSION_AUTH=1` is on.
 *
 * The bundle never inspects the token's contents — the host is
 * responsible for issuing it, scoping it, and refreshing it.
 */
export function configureSdkAuth(siteUrl: string, source: BearerTokenSource): void {
  const apiBaseUrl = `${siteUrl}/api/v1`

  // The getter wins per request, but a null/undefined result falls
  // through to the static token — the documented contract for hosts
  // whose refresh flow has a window where the getter has nothing yet.
  const tokenGetter: (() => string | null) | undefined =
    source.getBearerToken !== undefined || source.bearerToken !== undefined
      ? () => source.getBearerToken?.() ?? source.bearerToken ?? null
      : undefined

  if (tokenGetter !== undefined) {
    ApiConfig.init(
      apiBaseUrl,
      DataverseApiAuthMechanism.BEARER_TOKEN,
      undefined,
      undefined,
      tokenGetter
    )
    return
  }

  ApiConfig.init(apiBaseUrl, DataverseApiAuthMechanism.SESSION_COOKIE)
}
