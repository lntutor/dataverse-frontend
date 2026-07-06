import {
  FileTreeFileNode as SDKFileTreeFileNode,
  FileTreeFolderNode as SDKFileTreeFolderNode,
  FileTreeInclude as SDKFileTreeInclude,
  FileTreeNode as SDKFileTreeNode,
  FileTreeOrder as SDKFileTreeOrder,
  FileTreePage as SDKFileTreePage,
  ReadError,
  isFileTreeFileNode,
  isFileTreeFolderNode
} from '@iqss/dataverse-client-javascript'
import {
  FileTreeFile,
  FileTreeFolder,
  FileTreeItem,
  FileTreeItemType
} from '../../domain/models/FileTreeItem'
import { FileTreeInclude, FileTreeOrder, FileTreePage } from '../../domain/models/FileTreePage'

/**
 * Translates the wire shape returned by the SDK helper
 * `listDatasetTreeNode` into the SPA's domain models, and (in the
 * other direction) maps the domain enums back onto the SDK enums for
 * outbound requests.
 *
 * Kept as a static-method class to match the prevailing pattern under
 * `infrastructure/mappers/` (see `JSFileMapper`, `JSFileMetadataMapper`).
 */
export class JSFileTreeMapper {
  static toFileTreePage(
    page: SDKFileTreePage,
    fallbackOrder?: FileTreeOrder,
    fallbackInclude?: FileTreeInclude
  ): FileTreePage {
    return {
      path: page.path,
      items: page.items.map((item) => JSFileTreeMapper.toFileTreeItem(item)),
      nextCursor: page.nextCursor,
      limit: page.limit,
      order: JSFileTreeMapper.toFileTreeOrder(page.order, fallbackOrder),
      include: JSFileTreeMapper.toFileTreeInclude(page.include, fallbackInclude),
      approximateCount: page.approximateCount
    }
  }

  static toFileTreeItem(item: SDKFileTreeNode): FileTreeItem {
    if (isFileTreeFolderNode(item)) {
      return JSFileTreeMapper.toFileTreeFolder(item)
    }
    if (isFileTreeFileNode(item)) {
      return JSFileTreeMapper.toFileTreeFile(item)
    }
    // The SDK's union is exhaustive; this is a defensive fallthrough
    // so a future server-side type addition doesn't crash the SPA.
    /* istanbul ignore next */
    throw new Error(`Unknown file tree node type: ${(item as { type: string }).type}`)
  }

  static toFileTreeFolder(item: SDKFileTreeFolderNode): FileTreeFolder {
    return {
      type: FileTreeItemType.FOLDER,
      name: item.name,
      path: item.path,
      counts: item.counts
    }
  }

  static toFileTreeFile(item: SDKFileTreeFileNode): FileTreeFile {
    return {
      type: FileTreeItemType.FILE,
      id: item.id,
      name: item.name,
      path: item.path,
      size: item.size,
      contentType: item.contentType,
      access: item.access
        ? {
            restricted: item.access !== 'public',
            latestVersionRestricted: item.access !== 'public',
            canBeRequested: item.access === 'restricted',
            requested: false
          }
        : undefined,
      // Preserve the three-way distinction (public / restricted /
      // embargoed) lost by the FileAccess flat shape above — needed for
      // the tree row's access column.
      accessStatus: item.access,
      checksum: item.checksum,
      downloadUrl: item.downloadUrl
    }
  }

  static toSDKFileTreeOrder(value?: FileTreeOrder): SDKFileTreeOrder | undefined {
    if (value === undefined) return undefined
    return value === FileTreeOrder.NAME_ZA ? SDKFileTreeOrder.NAME_ZA : SDKFileTreeOrder.NAME_AZ
  }

  static toSDKFileTreeInclude(value?: FileTreeInclude): SDKFileTreeInclude | undefined {
    if (value === undefined) return undefined
    switch (value) {
      case FileTreeInclude.FOLDERS:
        return SDKFileTreeInclude.FOLDERS
      case FileTreeInclude.FILES:
        return SDKFileTreeInclude.FILES
      case FileTreeInclude.ALL:
      default:
        return SDKFileTreeInclude.ALL
    }
  }

  static toFileTreeOrder(value: SDKFileTreeOrder, fallback?: FileTreeOrder): FileTreeOrder {
    return value === SDKFileTreeOrder.NAME_ZA
      ? FileTreeOrder.NAME_ZA
      : (value as unknown as FileTreeOrder) ?? fallback ?? FileTreeOrder.NAME_AZ
  }

  static toFileTreeInclude(value: SDKFileTreeInclude, fallback?: FileTreeInclude): FileTreeInclude {
    switch (value) {
      case SDKFileTreeInclude.FOLDERS:
        return FileTreeInclude.FOLDERS
      case SDKFileTreeInclude.FILES:
        return FileTreeInclude.FILES
      case SDKFileTreeInclude.ALL:
        return FileTreeInclude.ALL
      default:
        return fallback ?? FileTreeInclude.ALL
    }
  }

  /**
   * True when the response indicates the tree endpoint isn't available
   * on the target instance — older versions, alternate deployments —
   * so the host can transparently fall back to the previews-derived
   * tree implementation.
   */
  static isEndpointMissing(error: unknown): boolean {
    if (error instanceof ReadError) {
      // A 404 is only "endpoint not deployed" when it is a ROUTE miss.
      // Dataverse's WebApplicationExceptionHandler maps those to the
      // stable "API endpoint does not exist on this server" message,
      // while resource-level 404s (dataset/version not found, draft the
      // user cannot see) carry their own wording — treating them as
      // endpoint-missing would silently downgrade a perfectly good
      // server to the previews fallback and mask the real error.
      if (/\[404\]/.test(error.message)) {
        return /API endpoint does not exist/i.test(error.message)
      }
      return /\[(405|501)\]/.test(error.message)
    }
    // Defensive: pre-SDK-wrapped axios errors used by the previous
    // implementation. Kept so a transitional state (older browsers /
    // cached SDK build) doesn't regress.
    /* istanbul ignore next */
    const status = (error as { response?: { status?: number } })?.response?.status
    /* istanbul ignore next */
    return status === 404 || status === 405 || status === 501
  }
}
