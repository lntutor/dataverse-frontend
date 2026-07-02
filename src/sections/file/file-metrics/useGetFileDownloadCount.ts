import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FileRepository } from '@/files/domain/repositories/FileRepository'
import { getFileDownloadCount } from '@/files/domain/useCases/getFileDownloadCount'

interface UseGetFileDownloadCountProps {
  fileRepository: FileRepository
  fileId: number | string
}

interface UseGetFileDownloadCountReturn {
  downloadCount: number | null
  isLoadingDownloadCount: boolean
  errorLoadingDownloadCount: string | null
}

export const useGetFileDownloadCount = ({
  fileRepository,
  fileId
}: UseGetFileDownloadCountProps): UseGetFileDownloadCountReturn => {
  const { t } = useTranslation('file')
  const [downloadCount, setDownloadCount] = useState<number | null>(null)
  const [isLoadingDownloadCount, setIsLoadingDownloadCount] = useState<boolean>(true)
  const [errorLoadingDownloadCount, setErrorLoadingDownloadCount] = useState<string | null>(null)

  useEffect(() => {
    const handleGetDownloadCount = async () => {
      setIsLoadingDownloadCount(true)

      try {
        const res = await getFileDownloadCount(fileRepository, fileId)

        setDownloadCount(res)
      } catch {
        setErrorLoadingDownloadCount(t('metrics.defaultGetDownloadCountError'))
      } finally {
        setIsLoadingDownloadCount(false)
      }
    }

    void handleGetDownloadCount()
  }, [fileRepository, fileId, t])

  return {
    downloadCount,
    isLoadingDownloadCount,
    errorLoadingDownloadCount
  }
}
