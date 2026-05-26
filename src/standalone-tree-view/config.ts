/**
 * Standalone Tree View Configuration
 *
 * Set window.dvTreeViewConfig before loading the script:
 *
 *   <script>
 *     window.dvTreeViewConfig = {
 *       siteUrl:          'https://your-dataverse.edu',
 *       datasetPid:       'doi:10.5072/FK2/XXXXX',
 *       datasetVersionId: ':latest',  // or '1.0', etc.
 *       bearerToken:      '...',      // optional — see Authentication below
 *       locale:           'en'        // optional, default 'en'
 *     }
 *   </script>
 *   <script type="module" src=".../reusable-components/dv-tree-view.js"></script>
 *   <div id="dv-tree-view"></div>
 *
 * Authentication. Two contracts, host picks one:
 *   1. Pass `bearerToken` (or `getBearerToken`) — used as
 *      `Authorization: Bearer <token>` on every API request. Works
 *      from any origin and any host page. How the host obtains the
 *      token (OIDC flow, server-side render, token-exchange, …) is
 *      out of scope of this bundle.
 *   2. Omit both — the SDK falls back to sending the browser's
 *      JSESSIONID cookie via `withCredentials: true`. This is the
 *      shortcut for same-origin JSF embeddings where the user is
 *      already logged in and `DATAVERSE_FEATURE_API_SESSION_AUTH=1`
 *      is enabled on the Dataverse instance.
 */

export interface DvTreeViewConfig {
  /** Base URL of the Dataverse instance, e.g. https://demo.dataverse.org */
  siteUrl: string
  /** Persistent ID of the dataset whose files to list */
  datasetPid: string
  /**
   * Dataset version to list. Accepts ':latest', ':draft',
   * ':latest-published' or a specific version like '1.0'. Default
   * ':latest'.
   */
  datasetVersionId?: string
  /**
   * Bearer token sent as `Authorization: Bearer <token>` on every API
   * request. Use this from any host page where you can produce a token
   * (cross-origin embed, non-JSF host, …). If you also pass
   * `getBearerToken`, the function takes precedence and is consulted on
   * every request — that's the right shape when the token needs to
   * refresh during the bundle's lifetime.
   */
  bearerToken?: string
  /**
   * Per-request bearer-token getter. Consulted on every API call, so
   * returning a freshly-refreshed token transparently rotates auth
   * without remounting the bundle. Return `null`/`undefined` to fall
   * through to `bearerToken` (or to session-cookie auth if neither is
   * set).
   */
  getBearerToken?: () => string | null | undefined
  /** Locale code for translations. Default: 'en' */
  locale?: string
  /**
   * URL template for translation files.
   * Default: `{siteUrl}/reusable-components/locales/{{lng}}/{{ns}}.json`
   */
  localesPath?: string
  /** ID of the DOM element to mount into. Default: 'dv-tree-view' */
  rootElementId?: string
  /**
   * Path of the JSF file metadata page that filename links should
   * point at. The bundle appends `?fileId=<id>&version=<v>`. Default:
   * '/file.xhtml'.
   */
  fileMetadataPath?: string
}

declare global {
  interface Window {
    dvTreeViewConfig?: DvTreeViewConfig
  }
}
