import { DatasetVersion } from '@/dataset/domain/models/Dataset'
import { FileRepository } from '../repositories/FileRepository'
import { FilePaginationInfo } from '../models/FilePaginationInfo'
import { getFilesByDatasetPersistentIdWithCount } from './getFilesByDatasetPersistentIdWithCount'

export async function getSingleFileIdByDatasetPersistentId(
  fileRepository: FileRepository,
  datasetPersistentId: string,
  datasetVersion: DatasetVersion
): Promise<number | undefined> {
  return getFilesByDatasetPersistentIdWithCount(
    fileRepository,
    datasetPersistentId,
    datasetVersion,
    new FilePaginationInfo(1, 1),
    undefined,
    true
  )
    .then(({ files, totalFilesCount }) => (totalFilesCount === 1 ? files[0]?.id : undefined))
    .catch((error: Error) => {
      throw new Error(error.message)
    })
}
