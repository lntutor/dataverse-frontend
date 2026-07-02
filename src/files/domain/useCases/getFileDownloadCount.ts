import { FileRepository } from '../repositories/FileRepository'

export async function getFileDownloadCount(
  fileRepository: FileRepository,
  fileId: number | string
): Promise<number> {
  return fileRepository.getFileDownloadCount(fileId).catch((error: Error) => {
    throw new Error(error.message)
  })
}
