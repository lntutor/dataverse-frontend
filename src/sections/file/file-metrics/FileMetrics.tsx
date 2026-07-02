import { useTranslation } from 'react-i18next'
import Skeleton, { SkeletonTheme } from 'react-loading-skeleton'
import { QuestionMarkTooltip } from '@iqss/dataverse-design-system'
import { FileRepository } from '@/files/domain/repositories/FileRepository'
import { useGetFileDownloadCount } from './useGetFileDownloadCount'
import styles from './FileMetrics.module.scss'

interface FileMetricsProps {
  fileRepository: FileRepository
  fileId: number | string
}

export const FileMetrics = ({ fileRepository, fileId }: FileMetricsProps) => {
  const { t, i18n } = useTranslation('file')
  const { downloadCount, isLoadingDownloadCount, errorLoadingDownloadCount } =
    useGetFileDownloadCount({
      fileRepository,
      fileId
    })

  const count = downloadCount ?? 0
  const formatNumber = (value: number) =>
    new Intl.NumberFormat(i18n.languages[0] || undefined).format(value)

  if (isLoadingDownloadCount) {
    return <FileMetricsSkeleton />
  }

  if (errorLoadingDownloadCount) {
    return null
  }

  return (
    <div className={styles['file-metrics']}>
      <div className={styles.title}>
        <span>
          {t('metrics.title')}{' '}
          <QuestionMarkTooltip placement="top" message={t('metrics.tip.default')} />
        </span>
      </div>

      <div className={styles.results}>
        <span data-testid="file-download-count">
          {t('metrics.downloads.count.default', {
            count,
            formattedCount: formatNumber(count)
          })}{' '}
          <QuestionMarkTooltip placement="top" message={t('metrics.downloads.defaultTip')} />
        </span>
      </div>
    </div>
  )
}

const FileMetricsSkeleton = () => (
  <SkeletonTheme>
    <div className={styles['file-metrics']} data-testid="file-metrics-skeleton">
      <div className={styles.title}>
        <Skeleton height={18} width={95} />
      </div>
      <div className={styles.results}>
        <Skeleton height={18} width={90} />
      </div>
    </div>
  </SkeletonTheme>
)
