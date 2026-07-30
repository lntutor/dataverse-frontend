import { DatasetVersion } from '@/dataset/domain/models/Dataset'
import { FileRepository } from '../repositories/FileRepository'

export async function getSingleFileIdByDatasetPersistentId(
  fileRepository: FileRepository,
  datasetPersistentId: string,
  datasetVersion: DatasetVersion
): Promise<number | undefined> {
  return fileRepository
    .getSingleFileIdByDatasetPersistentId(datasetPersistentId, datasetVersion)
    .catch((error: Error) => {
      throw new Error(error.message)
    })
}
