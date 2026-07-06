import { useCallback, useEffect, useRef, useState } from 'react'
import {
  FileTreeRepository,
  GetFileTreeNodeParams
} from '@/files/domain/repositories/FileTreeRepository'
import { FileTreeItem } from '@/files/domain/models/FileTreeItem'
import { FileTreeInclude, FileTreeOrder } from '@/files/domain/models/FileTreePage'
import { DatasetVersion } from '@/dataset/domain/models/Dataset'

export interface FolderNode {
  path: string
  items: FileTreeItem[]
  nextCursor: string | null
  loading: boolean
  error?: string
  loaded: boolean
}

export interface UseFileTreeArgs {
  repository: FileTreeRepository
  datasetPersistentId: string
  datasetVersion: DatasetVersion
  pageSize?: number
  order?: FileTreeOrder
  include?: FileTreeInclude
  /**
   * Path to expand on mount — typically read from a `?path=` URL query
   * param so a deep link opens the tree at the bookmarked folder. The
   * hook expands every ancestor along the way (e.g. `data/raw/2024`
   * causes `data`, `data/raw`, and `data/raw/2024` all to be expanded).
   */
  initialPath?: string
}

export interface UseFileTreeApi {
  rootNode: FolderNode
  nodes: ReadonlyMap<string, FolderNode>
  expanded: ReadonlySet<string>
  /**
   * The deepest folder currently in the expanded set. Empty string means
   * only the root is expanded. Useful for surfacing a single canonical
   * path to a URL bookmark.
   */
  currentPath: string
  toggleExpanded: (path: string) => Promise<void>
  expand: (path: string) => Promise<void>
  collapse: (path: string) => void
  loadMore: (path: string) => Promise<void>
  refresh: (path?: string) => Promise<void>
  /**
   * Fetch a folder's first page if it has never loaded (or errored),
   * deduplicating concurrent calls. Exposed so the host can service
   * folders that became visible without an explicit expand — e.g. a
   * filter query force-opening a never-fetched folder.
   */
  ensureLoaded: (path: string) => Promise<void>
  visibleKnownChildren: (path: string) => FileTreeItem[]
}

const ROOT = ''

/**
 * Returns the chain of ancestor paths for a folder, including the folder
 * itself but excluding the empty root. For `data/raw/2024` →
 * `['data', 'data/raw', 'data/raw/2024']`.
 */
function ancestorChain(path: string): string[] {
  if (!path) {
    return []
  }
  const parts = path.split('/').filter((p) => p.length > 0)
  const out: string[] = []
  let acc = ''
  for (const part of parts) {
    acc = acc ? `${acc}/${part}` : part
    out.push(acc)
  }
  return out
}

/**
 * Picks the deepest folder from a set of expanded paths — used to derive
 * `currentPath` for URL bookmarking. Returns `''` if no non-root folder
 * is expanded.
 */
function deepestExpanded(set: ReadonlySet<string>): string {
  let deepest = ''
  let depth = 0
  for (const path of set) {
    if (!path) continue
    const d = path.split('/').length
    if (d > depth) {
      deepest = path
      depth = d
    }
  }
  return deepest
}

export function useFileTree({
  repository,
  datasetPersistentId,
  datasetVersion,
  pageSize = 200,
  order = FileTreeOrder.NAME_AZ,
  include = FileTreeInclude.ALL,
  initialPath = ''
}: UseFileTreeArgs): UseFileTreeApi {
  const [nodes, setNodes] = useState<Map<string, FolderNode>>(() => new Map())
  const initialExpanded = (() => {
    const set = new Set<string>([ROOT])
    for (const ancestor of ancestorChain(initialPath)) {
      set.add(ancestor)
    }
    return set
  })()
  const [expanded, setExpanded] = useState<Set<string>>(() => initialExpanded)
  const inFlight = useRef<Map<string, Promise<void>>>(new Map())
  const versionKey = `${datasetPersistentId}::${datasetVersion.number.toString()}::${order}::${include}`
  const previousKey = useRef<string>(versionKey)
  // True only while the hook's host component is mounted. Set to false
  // by the cleanup effect below so any fetch promise that resolves AFTER
  // unmount becomes a no-op instead of pushing state into a defunct
  // hook instance. Without this guard, switching rapidly between the
  // tree view and the table view occasionally left the next mount
  // showing the "loading" spinner forever, because a slow getNode that
  // started under the previous mount completed against the wrong
  // setState closure.
  const mountedRef = useRef(true)
  // Incremented on every versionKey reset. A fetch captures the value at
  // start and discards its response if the tree was reset while it was in
  // flight — without this, a slow response from the PREVIOUS version /
  // order / include lands in the fresh map with `loaded: true`, and
  // ensureLoaded then pins the stale items until a manual refresh.
  const generationRef = useRef(0)

  const setNode = useCallback((path: string, updater: (prev: FolderNode) => FolderNode) => {
    if (!mountedRef.current) return
    setNodes((prev) => {
      const next = new Map(prev)
      const current = prev.get(path) ?? {
        path,
        items: [],
        nextCursor: null,
        loading: false,
        loaded: false
      }
      next.set(path, updater(current))
      return next
    })
  }, [])

  const fetchPage = useCallback(
    async (path: string, cursor?: string) => {
      const params: GetFileTreeNodeParams = {
        datasetPersistentId,
        datasetVersion,
        path,
        limit: pageSize,
        cursor,
        order,
        include
      }
      const generation = generationRef.current
      setNode(path, (prev) => ({ ...prev, loading: true, error: undefined }))
      try {
        const page = await repository.getNode(params)
        if (generation !== generationRef.current) return
        setNode(path, (prev) => ({
          ...prev,
          items: cursor ? [...prev.items, ...page.items] : page.items,
          nextCursor: page.nextCursor,
          loading: false,
          loaded: true,
          error: undefined
        }))
      } catch (error) {
        if (generation !== generationRef.current) return
        setNode(path, (prev) => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error.message : String(error)
        }))
      }
    },
    [datasetPersistentId, datasetVersion, include, order, pageSize, repository, setNode]
  )

  const ensureLoaded = useCallback(
    (path: string): Promise<void> => {
      const existing = nodes.get(path)
      if (existing && existing.loaded && !existing.error) {
        return Promise.resolve()
      }
      const pending = inFlight.current.get(path)
      if (pending) {
        return pending
      }
      const promise = fetchPage(path).finally(() => {
        inFlight.current.delete(path)
      })
      inFlight.current.set(path, promise)
      return promise
    },
    [fetchPage, nodes]
  )

  useEffect(() => {
    if (previousKey.current !== versionKey) {
      previousKey.current = versionKey
      generationRef.current++
      setNodes(new Map())
      const reset = new Set<string>([ROOT])
      for (const ancestor of ancestorChain(initialPath)) {
        reset.add(ancestor)
      }
      setExpanded(reset)
      inFlight.current.clear()
      // Reset path: bypass ensureLoaded's cache check (which closes
      // over the pre-reset `nodes` map and would short-circuit because
      // the old root was `loaded: true`). fetchPage runs unconditionally
      // and uses the latest fetchPage closure (which is keyed off the
      // new versionKey via its useCallback deps).
      void fetchPage(ROOT)
      for (const ancestor of ancestorChain(initialPath)) {
        void fetchPage(ancestor)
      }
      return
    }
    void ensureLoaded(ROOT)
    // Pre-fetch every initial-path ancestor so the tree opens to the
    // bookmarked depth on mount without the user clicking through.
    for (const ancestor of ancestorChain(initialPath)) {
      void ensureLoaded(ancestor)
    }
    // Deliberately keyed on versionKey ALONE: fetchPage/ensureLoaded get
    // new identities on every nodes write, and re-running this effect on
    // those would refetch the root after every page load. initialPath is
    // mount-stable (read once from the URL). The reset branch above
    // handles every input that genuinely changes the tree's identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [versionKey])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const expand = useCallback(
    async (path: string) => {
      setExpanded((prev) => {
        if (prev.has(path)) {
          return prev
        }
        const next = new Set(prev)
        next.add(path)
        return next
      })
      await ensureLoaded(path)
    },
    [ensureLoaded]
  )

  const collapse = useCallback((path: string) => {
    setExpanded((prev) => {
      if (!prev.has(path)) {
        return prev
      }
      const next = new Set(prev)
      next.delete(path)
      // Also drop every descendant from the expanded set. Without this,
      // collapsing `data` after the user opened `data/sub` leaves
      // `data/sub` in the set; `currentPath` (deepest expanded) still
      // reports `data/sub`, so the URL bookmark and a subsequent reload
      // re-open the very branch the user just collapsed.
      const prefix = path === '' ? '' : `${path}/`
      for (const p of Array.from(next)) {
        if (p !== path && (path === '' ? p !== '' : p.startsWith(prefix))) {
          next.delete(p)
        }
      }
      return next
    })
  }, [])

  const toggleExpanded = useCallback(
    async (path: string) => {
      if (expanded.has(path)) {
        collapse(path)
      } else {
        await expand(path)
      }
    },
    [collapse, expand, expanded]
  )

  const loadMore = useCallback(
    async (path: string) => {
      const existing = nodes.get(path)
      if (!existing || !existing.nextCursor || existing.loading) {
        return
      }
      await fetchPage(path, existing.nextCursor)
    },
    [fetchPage, nodes]
  )

  const refresh = useCallback(
    async (path?: string) => {
      const target = path ?? ROOT
      setNodes((prev) => {
        const next = new Map(prev)
        next.delete(target)
        return next
      })
      await fetchPage(target)
    },
    [fetchPage]
  )

  const visibleKnownChildren = useCallback(
    (path: string): FileTreeItem[] => {
      const out: FileTreeItem[] = []
      for (const node of nodes.values()) {
        if (path === '' || node.path === path || node.path.startsWith(`${path}/`)) {
          out.push(...node.items)
        }
      }
      return out
    },
    [nodes]
  )

  const rootNode: FolderNode = nodes.get(ROOT) ?? {
    path: ROOT,
    items: [],
    nextCursor: null,
    loading: true,
    loaded: false
  }

  return {
    rootNode,
    nodes,
    expanded,
    currentPath: deepestExpanded(expanded),
    toggleExpanded,
    expand,
    collapse,
    loadMore,
    refresh,
    ensureLoaded,
    visibleKnownChildren
  }
}
