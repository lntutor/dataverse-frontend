import { useCallback, useMemo, useState } from 'react'
import {
  FileTreeFile,
  FileTreeFolder,
  FileTreeItem,
  isFileTreeFile
} from '@/files/domain/models/FileTreeItem'

export type SelectionState = 'all' | 'partial' | 'none'

export interface FileTreeSelectionTotals {
  count: number
  bytes: number
  hasLogicalFolders: boolean
}

/**
 * Selection state for the lazy file tree.
 *
 * Three sets cooperate:
 *
 * - `selectedFolderPaths` — folders the user explicitly checked. Implies
 *   "all descendants are logically selected" without enumerating them.
 * - `selectedFilePaths` — individual files checked when no ancestor folder
 *   is selected.
 * - `deselectedFilePaths` — individual files unchecked within a folder that
 *   is in `selectedFolderPaths` (or under a selected ancestor).
 *
 * The component never enumerates an unvisited subtree; the download flow
 * walks the tree API to expand selected folders into concrete file IDs.
 */
export interface FileTreeSelection {
  selectedFilePaths: ReadonlySet<string>
  selectedFolderPaths: ReadonlySet<string>
  deselectedFilePaths: ReadonlySet<string>
  totals: FileTreeSelectionTotals
  fileState: (file: FileTreeFile) => SelectionState
  folderState: (folder: FileTreeFolder, knownChildren: FileTreeItem[]) => SelectionState
  toggleFile: (file: FileTreeFile) => void
  toggleFolder: (folder: FileTreeFolder, knownChildren: FileTreeItem[]) => void
  clear: () => void
  /**
   * Header "select-all" action: if anything is currently selected,
   * clears the selection; otherwise marks every supplied top-level
   * item as selected (files go into selectedFilePaths, folders into
   * selectedFolderPaths). Tree depth below the supplied items is
   * implicitly covered by ancestor-selected logic, matching the
   * row-checkbox semantics.
   */
  toggleAll: (topLevelItems: FileTreeItem[]) => void
  /**
   * Registry of every file the tree has rendered, keyed by path — the
   * key every consumer actually looks up by (selection sets store
   * paths). Registered by the host as rows become visible.
   */
  filesByPath: Map<string, FileTreeFile>
  registerFile: (file: FileTreeFile) => void
}

const isStrictlyUnder = (path: string, ancestor: string): boolean => path.startsWith(`${ancestor}/`)

const hasSelectedAncestor = (path: string, selectedFolders: ReadonlySet<string>): boolean => {
  for (const folder of selectedFolders) {
    if (isStrictlyUnder(path, folder)) {
      return true
    }
  }
  return false
}

export function useFileTreeSelection(): FileTreeSelection {
  const [selectedFilePaths, setSelectedFilePaths] = useState<Set<string>>(() => new Set())
  const [selectedFolderPaths, setSelectedFolderPaths] = useState<Set<string>>(() => new Set())
  const [deselectedFilePaths, setDeselectedFilePaths] = useState<Set<string>>(() => new Set())
  const [filesByPath] = useState<Map<string, FileTreeFile>>(() => new Map())

  const registerFile = useCallback(
    (file: FileTreeFile) => {
      filesByPath.set(file.path, file)
    },
    [filesByPath]
  )

  const isFileLogicallySelected = useCallback(
    (path: string): boolean => {
      if (deselectedFilePaths.has(path)) {
        return false
      }
      if (selectedFilePaths.has(path)) {
        return true
      }
      return hasSelectedAncestor(path, selectedFolderPaths)
    },
    [deselectedFilePaths, selectedFilePaths, selectedFolderPaths]
  )

  const fileState = useCallback(
    (file: FileTreeFile): SelectionState => (isFileLogicallySelected(file.path) ? 'all' : 'none'),
    [isFileLogicallySelected]
  )

  const folderState = useCallback(
    (folder: FileTreeFolder, knownChildren: FileTreeItem[]): SelectionState => {
      const explicitlySelected = selectedFolderPaths.has(folder.path)
      const ancestorSelected = hasSelectedAncestor(folder.path, selectedFolderPaths)
      const logicallySelected = explicitlySelected || ancestorSelected

      const knownFilesUnder = knownChildren.filter(
        (child): child is FileTreeFile =>
          isFileTreeFile(child) && isStrictlyUnder(child.path, folder.path)
      )

      if (logicallySelected) {
        const someDeselected = knownFilesUnder.some((file) => deselectedFilePaths.has(file.path))
        return someDeselected ? 'partial' : 'all'
      }

      if (knownChildren.length === 0) {
        return 'none'
      }

      const nestedFolderSelected = Array.from(selectedFolderPaths).some((other) =>
        isStrictlyUnder(other, folder.path)
      )
      const someFileSelected = knownFilesUnder.some((file) => isFileLogicallySelected(file.path))

      if (!nestedFolderSelected && !someFileSelected) {
        return 'none'
      }

      const allFilesSelected =
        knownFilesUnder.length > 0 &&
        knownFilesUnder.every((file) => isFileLogicallySelected(file.path))

      // 'all' only when every visited file is selected AND no nested
      // folder selection covers unvisited paths we cannot vouch for.
      return allFilesSelected && !nestedFolderSelected ? 'all' : 'partial'
    },
    [deselectedFilePaths, isFileLogicallySelected, selectedFolderPaths]
  )

  const toggleFile = useCallback(
    (file: FileTreeFile) => {
      filesByPath.set(file.path, file)
      const ancestorSelected = hasSelectedAncestor(file.path, selectedFolderPaths)
      if (ancestorSelected) {
        const next = new Set(deselectedFilePaths)
        if (next.has(file.path)) {
          next.delete(file.path)
        } else {
          next.add(file.path)
        }
        setDeselectedFilePaths(next)
        return
      }
      const next = new Set(selectedFilePaths)
      if (next.has(file.path)) {
        next.delete(file.path)
      } else {
        next.add(file.path)
      }
      setSelectedFilePaths(next)
    },
    [deselectedFilePaths, filesByPath, selectedFilePaths, selectedFolderPaths]
  )

  const toggleFolder = useCallback(
    (folder: FileTreeFolder, knownChildren: FileTreeItem[]) => {
      const explicitlySelected = selectedFolderPaths.has(folder.path)
      const ancestorSelected = hasSelectedAncestor(folder.path, selectedFolderPaths)
      const state = folderState(folder, knownChildren)

      if (state === 'all' && explicitlySelected) {
        // Deselect this folder and any nested artifacts under it.
        const nextFolders = new Set(selectedFolderPaths)
        const nextFiles = new Set(selectedFilePaths)
        const nextDeselected = new Set(deselectedFilePaths)
        nextFolders.delete(folder.path)
        // Defensive sweeps: both mutation sites (the select-all fold below
        // and toggleAll's top-level-only writes) maintain the invariant
        // that the selected sets never contain an ancestor together with
        // its descendants, so these loops cannot fire through the public
        // API — they only guard future mutation paths.
        for (const other of Array.from(nextFolders)) {
          /* istanbul ignore if */
          if (isStrictlyUnder(other, folder.path)) {
            nextFolders.delete(other)
          }
        }
        for (const path of Array.from(nextFiles)) {
          /* istanbul ignore if */
          if (path === folder.path || isStrictlyUnder(path, folder.path)) {
            nextFiles.delete(path)
          }
        }
        for (const path of Array.from(nextDeselected)) {
          if (isStrictlyUnder(path, folder.path)) {
            nextDeselected.delete(path)
          }
        }
        setSelectedFolderPaths(nextFolders)
        setSelectedFilePaths(nextFiles)
        setDeselectedFilePaths(nextDeselected)
        return
      }

      if (ancestorSelected) {
        // We're inside an already-logically-selected branch; flip the
        // deselect overrides for every known descendant file under this
        // folder.
        const nextDeselected = new Set(deselectedFilePaths)
        const knownFiles = collectKnownFilesUnder(folder, knownChildren)
        const allDeselected =
          knownFiles.length > 0 && knownFiles.every((f) => nextDeselected.has(f.path))
        for (const file of knownFiles) {
          if (allDeselected) {
            nextDeselected.delete(file.path)
          } else {
            nextDeselected.add(file.path)
          }
        }
        setDeselectedFilePaths(nextDeselected)
        return
      }

      // 'partial' or 'none' on a folder without selected ancestors -> select-all logically.
      const nextFolders = new Set(selectedFolderPaths)
      nextFolders.add(folder.path)
      // Folding nested explicitly-selected folders into the parent.
      for (const other of Array.from(nextFolders)) {
        if (other !== folder.path && isStrictlyUnder(other, folder.path)) {
          nextFolders.delete(other)
        }
      }
      const nextFiles = new Set(selectedFilePaths)
      const nextDeselected = new Set(deselectedFilePaths)
      for (const path of Array.from(nextFiles)) {
        if (path === folder.path || isStrictlyUnder(path, folder.path)) {
          nextFiles.delete(path)
        }
      }
      for (const path of Array.from(nextDeselected)) {
        if (isStrictlyUnder(path, folder.path)) {
          nextDeselected.delete(path)
        }
      }
      setSelectedFolderPaths(nextFolders)
      setSelectedFilePaths(nextFiles)
      setDeselectedFilePaths(nextDeselected)
    },
    [deselectedFilePaths, folderState, selectedFilePaths, selectedFolderPaths]
  )

  const clear = useCallback(() => {
    setSelectedFilePaths(new Set())
    setSelectedFolderPaths(new Set())
    setDeselectedFilePaths(new Set())
  }, [])

  const toggleAll = useCallback(
    (topLevelItems: FileTreeItem[]) => {
      const anySelected = selectedFilePaths.size > 0 || selectedFolderPaths.size > 0
      if (anySelected) {
        setSelectedFilePaths(new Set())
        setSelectedFolderPaths(new Set())
        setDeselectedFilePaths(new Set())
        return
      }
      const nextFiles = new Set<string>()
      const nextFolders = new Set<string>()
      for (const item of topLevelItems) {
        if (isFileTreeFile(item)) {
          filesByPath.set(item.path, item)
          nextFiles.add(item.path)
        } else {
          nextFolders.add(item.path)
        }
      }
      setSelectedFilePaths(nextFiles)
      setSelectedFolderPaths(nextFolders)
      setDeselectedFilePaths(new Set())
    },
    [filesByPath, selectedFilePaths, selectedFolderPaths]
  )

  const totals = useMemo<FileTreeSelectionTotals>(() => {
    let count = 0
    let bytes = 0
    for (const path of selectedFilePaths) {
      const file = filesByPath.get(path)
      count += 1
      if (file) {
        bytes += file.size
      }
    }
    return {
      count,
      bytes,
      hasLogicalFolders: selectedFolderPaths.size > 0
    }
  }, [filesByPath, selectedFilePaths, selectedFolderPaths.size])

  return {
    selectedFilePaths,
    selectedFolderPaths,
    deselectedFilePaths,
    totals,
    fileState,
    folderState,
    toggleFile,
    toggleFolder,
    clear,
    toggleAll,
    filesByPath,
    registerFile
  }
}

function collectKnownFilesUnder(
  folder: FileTreeFolder,
  knownChildren: FileTreeItem[]
): FileTreeFile[] {
  const out: FileTreeFile[] = []
  for (const child of knownChildren) {
    if (isFileTreeFile(child) && isStrictlyUnder(child.path, folder.path)) {
      out.push(child)
    }
  }
  return out
}
