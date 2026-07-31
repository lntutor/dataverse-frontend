import { useEffect, useState } from 'react'
import { DatasetVersion } from '@/dataset/domain/models/Dataset'
import { FileRepository } from '@/files/domain/repositories/FileRepository'
import { getSingleFileIdByDatasetPersistentId } from '@/files/domain/useCases/getSingleFileIdByDatasetPersistentId'

interface SingleFileIdState {
  singleFileId: number | undefined
  isLoading: boolean
}

export function useSingleFileId(
  fileRepository: FileRepository,
  datasetPersistentId: string,
  datasetVersion: DatasetVersion
): SingleFileIdState {
  const [state, setState] = useState<SingleFileIdState>({
    singleFileId: undefined,
    isLoading: true
  })

  useEffect(() => {
    let cancelled = false

    setState({ singleFileId: undefined, isLoading: true })
    void getSingleFileIdByDatasetPersistentId(fileRepository, datasetPersistentId, datasetVersion)
      .then((fileId) => {
        if (!cancelled) {
          setState({ singleFileId: fileId, isLoading: false })
        }
      })
      .catch(() => {
        if (!cancelled) {
          setState({ singleFileId: undefined, isLoading: false })
        }
      })

    return () => {
      cancelled = true
    }
  }, [fileRepository, datasetPersistentId, datasetVersion])

  return state
}
