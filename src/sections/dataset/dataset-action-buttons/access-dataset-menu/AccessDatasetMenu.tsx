import { useState } from 'react'
import { DropdownButton, DropdownButtonItem, DropdownHeader } from '@iqss/dataverse-design-system'
import { Download as DownloadIcon } from 'react-bootstrap-icons'
import { useTranslation } from 'react-i18next'
import { toast } from 'react-toastify'
import {
  CustomTerms,
  DatasetLicense,
  DatasetPermissions,
  DatasetPublishingStatus,
  DatasetVersion,
  defaultLicense
} from '../../../../dataset/domain/models/Dataset'
import { FileDownloadSize, FileDownloadMode } from '../../../../files/domain/models/FileMetadata'
import { DatasetExploreOptions } from '../DatasetToolsOptions'
import { useAccessRepository } from '@/sections/access/AccessRepositoryContext'
import { DownloadWithTermsAndGuestbookModal } from '@/sections/dataset/dataset-files/files-table/file-actions/file-actions-cell/file-action-buttons/file-options-menu/DownloadWithTermsAndGuestbookModal'
import {
  downloadFromSignedUrl,
  EMPTY_GUESTBOOK_RESPONSE,
  requestSignedDownloadUrlFromAccessApi
} from '@/shared/helpers/DownloadHelper'
// TODO: add compute feature

interface AccessDatasetMenuProps {
  singleFileId?: number
  isSingleFileIdLoading?: boolean
  datasetNumericId?: number | string
  version: DatasetVersion
  permissions: DatasetPermissions
  hasOneTabularFileAtLeast: boolean
  fileDownloadSizes: FileDownloadSize[]
  fileStore: string | undefined
  persistentId: string
  guestbookId?: number
  license?: DatasetLicense
  customTerms?: CustomTerms
}

export function AccessDatasetMenu({
  singleFileId,
  isSingleFileIdLoading = false,
  datasetNumericId,
  version,
  permissions,
  hasOneTabularFileAtLeast,
  fileDownloadSizes,
  fileStore,
  persistentId,
  guestbookId,
  license,
  customTerms
}: AccessDatasetMenuProps) {
  const { t } = useTranslation('dataset')
  const [showDownloadWithTermsAndGuestbookModal, setShowDownloadWithTermsAndGuestbookModal] =
    useState(false)
  const [selectedDownloadFormat, setSelectedDownloadFormat] = useState<FileDownloadMode>(
    FileDownloadMode.ORIGINAL
  )
  const isDraft = version.publishingStatus === DatasetPublishingStatus.DRAFT
  const bypassTermsGuard = isDraft || permissions.canUpdateDataset
  const hasGuestbook = guestbookId !== undefined
  const hasNonDefaultLicense = license !== undefined && license.name !== defaultLicense.name
  const hasCustomTerms = customTerms !== undefined
  const shouldShowModal =
    !bypassTermsGuard && (hasGuestbook || hasCustomTerms || hasNonDefaultLicense)

  const flesToDownloadSizeIsZero =
    fileDownloadSizes.map(({ value }) => value).reduce((acc, curr) => acc + curr, 0) === 0

  if (
    flesToDownloadSizeIsZero ||
    !permissions.canDownloadFiles ||
    (version.publishingStatus === DatasetPublishingStatus.DEACCESSIONED &&
      !permissions.canUpdateDataset)
  ) {
    return <></>
  }

  // TODO: remove this when we can handle non-S3 files
  if (!fileStore?.startsWith('s3')) {
    return <></>
  }

  const handleDownloadWithGuestbook = (
    event: React.MouseEvent<HTMLElement>,
    mode: FileDownloadMode
  ) => {
    event.preventDefault()
    setSelectedDownloadFormat(mode)
    setShowDownloadWithTermsAndGuestbookModal(true)
  }

  return (
    <>
      <DropdownButton
        id={`access-dataset-menu`}
        title={t('datasetActionButtons.accessDataset.title')}
        asButtonGroup
        variant="primary">
        {!isSingleFileIdLoading && (
          <>
            <DropdownHeader className="d-flex align-items-center gap-1">
              {t('datasetActionButtons.accessDataset.downloadOptions.header')} <DownloadIcon />
            </DropdownHeader>
            <DatasetDownloadOptions
              singleFileId={singleFileId}
              datasetNumericId={datasetNumericId}
              hasOneTabularFileAtLeast={hasOneTabularFileAtLeast}
              fileDownloadSizes={fileDownloadSizes}
              requiresTermsOrGuestbook={shouldShowModal}
              onDownloadWithGuestbook={handleDownloadWithGuestbook}
            />
          </>
        )}
        <DatasetExploreOptions persistentId={persistentId} />
      </DropdownButton>
      {shouldShowModal && showDownloadWithTermsAndGuestbookModal && (
        <DownloadWithTermsAndGuestbookModal
          show={showDownloadWithTermsAndGuestbookModal}
          handleClose={() => setShowDownloadWithTermsAndGuestbookModal(false)}
          fileId={singleFileId}
          datasetId={singleFileId === undefined ? datasetNumericId : undefined} // TODO: we should allow this to pass persistentId when we have the backend support for guestbook submission with persistentId
          datasetPersistentId={persistentId}
          guestbookId={guestbookId}
          format={selectedDownloadFormat}
          datasetLicense={license}
          datasetCustomTerms={customTerms}
        />
      )}
    </>
  )
}

interface DatasetDownloadOptionsProps {
  singleFileId?: number
  datasetNumericId?: number | string
  hasOneTabularFileAtLeast: boolean
  fileDownloadSizes: FileDownloadSize[]
  requiresTermsOrGuestbook: boolean
  onDownloadWithGuestbook: (event: React.MouseEvent<HTMLElement>, mode: FileDownloadMode) => void
}

const DatasetDownloadOptions = ({
  singleFileId,
  datasetNumericId,
  hasOneTabularFileAtLeast,
  fileDownloadSizes,
  requiresTermsOrGuestbook,
  onDownloadWithGuestbook
}: DatasetDownloadOptionsProps) => {
  const { t } = useTranslation('dataset')
  const { t: tFiles } = useTranslation('files')
  const accessRepository = useAccessRepository()

  const handleDirectDownload = (
    event: React.MouseEvent<HTMLElement>,
    mode: FileDownloadMode
  ): void => {
    if (requiresTermsOrGuestbook) {
      onDownloadWithGuestbook(event, mode)
      return
    }

    if (singleFileId === undefined && datasetNumericId === undefined) {
      return
    }

    event.preventDefault()
    void requestSignedDownloadUrlFromAccessApi({
      accessRepository,
      fileId: singleFileId,
      datasetId: singleFileId === undefined ? datasetNumericId : undefined,
      fileIds: undefined,
      guestbookResponse: EMPTY_GUESTBOOK_RESPONSE,
      format: mode
    })
      .then(downloadFromSignedUrl)
      .then(() => {
        toast.success(tFiles('actions.optionsMenu.guestbookCollectModal.downloadStarted'))
      })
      .catch(() => {
        toast.error(tFiles('actions.optionsMenu.guestbookCollectModal.downloadError'))
      })
  }

  function getFormattedFileSize(mode: FileDownloadMode): string {
    const foundSize = fileDownloadSizes.find((size) => size.mode === mode)
    return foundSize ? foundSize.toString() : ''
  }

  return hasOneTabularFileAtLeast ? (
    <>
      <DropdownButtonItem
        onClick={(event) => handleDirectDownload(event, FileDownloadMode.ORIGINAL)}>
        {t(
          singleFileId === undefined
            ? 'datasetActionButtons.accessDataset.downloadOptions.originalZip'
            : 'datasetActionButtons.accessDataset.downloadOptions.file'
        )}{' '}
        ({getFormattedFileSize(FileDownloadMode.ORIGINAL)})
      </DropdownButtonItem>
      <DropdownButtonItem
        onClick={(event) => handleDirectDownload(event, FileDownloadMode.ARCHIVAL)}>
        {t(
          singleFileId === undefined
            ? 'datasetActionButtons.accessDataset.downloadOptions.archivalZip'
            : 'datasetActionButtons.accessDataset.downloadOptions.archivalFile'
        )}{' '}
        ({getFormattedFileSize(FileDownloadMode.ARCHIVAL)})
      </DropdownButtonItem>
    </>
  ) : (
    <DropdownButtonItem onClick={(event) => handleDirectDownload(event, FileDownloadMode.ORIGINAL)}>
      {t(
        singleFileId === undefined
          ? 'datasetActionButtons.accessDataset.downloadOptions.zip'
          : 'datasetActionButtons.accessDataset.downloadOptions.file'
      )}{' '}
      ({getFormattedFileSize(FileDownloadMode.ORIGINAL)})
    </DropdownButtonItem>
  )
}
