import { useEffect, useState } from 'react'
import { DatasetVersion } from '@/dataset/domain/models/Dataset'
import { FileRepository } from '@/files/domain/repositories/FileRepository'
import { getSingleFileIdByDatasetPersistentId } from '@/files/domain/useCases/getSingleFileIdByDatasetPersistentId'

export function useSingleFileId(
  fileRepository: FileRepository,
  datasetPersistentId: string,
  datasetVersion: DatasetVersion
): number | undefined {
  const [singleFileId, setSingleFileId] = useState<number | undefined>()

  useEffect(() => {
    let cancelled = false

    setSingleFileId(undefined)
    void getSingleFileIdByDatasetPersistentId(fileRepository, datasetPersistentId, datasetVersion)
      .then((fileId) => {
        if (!cancelled) {
          setSingleFileId(fileId)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSingleFileId(undefined)
        }
      })

    return () => {
      cancelled = true
    }
  }, [fileRepository, datasetPersistentId, datasetVersion])

  return singleFileId
}
