import { useTranslation } from 'react-i18next'
import { DropdownButton, DropdownButtonItem, Stack } from '@iqss/dataverse-design-system'
import { ViewStyledCitationModal } from './ViewStyledCitationModal'
import { useState } from 'react'
import { CitationFormat } from '@/dataset/domain/models/DatasetCitation'
import { useDownloadCitation } from './useDownloadCitation'
import { FormattedCitation } from '@iqss/dataverse-client-javascript/dist/datasets/domain/models/FormattedCitation'
import { toast } from 'react-toastify'
import { useDatasetRepositories } from '@/shared/contexts/repositories/RepositoriesProvider'
import { CopyToClipboardButton } from '@/sections/dataset/dataset-files/files-table/file-info/file-info-cell/file-info-data/copy-to-clipboard-button/CopyToClipboardButton'
import { useDefaultStyleCitation } from './csl/useDefaultStyleCitation'
import { DEFAULT_CSL_STYLE_SLUG } from './csl/cslStyleOptions'
import styles from '../Citation.module.scss'

interface CitationDownloadProps {
  datasetId: string
  version: string
}

export function CitationDownloadButton({ datasetId, version }: CitationDownloadProps) {
  const { datasetRepository } = useDatasetRepositories()
  const { t } = useTranslation('shared', { keyPrefix: 'downloadCitation' })
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [styledCitation, setStyledCitation] = useState<FormattedCitation | null>(null)

  const { error, handleGetCitation, handleDownloadCitation } = useDownloadCitation({
    datasetRepository,
    datasetId,
    version
  })

  const {
    cslJsonCitation,
    defaultStyleCitationHtml,
    defaultStyleCitationText,
    isFetching: isFetchingDefaultStyleCitation
  } = useDefaultStyleCitation({ datasetRepository, datasetId, version })

  if (error) {
    toast.error(t('downloadError'))
  }

  const handleCloseModal = () => setIsModalOpen(false)
  const handleOpenModal = async () => {
    setIsModalOpen(true)
    const result = cslJsonCitation ?? (await handleGetCitation(CitationFormat.CSLJson))
    setStyledCitation(result)
  }

  return (
    <>
      <Stack direction="horizontal" gap={0} className={styles['citeDatasetGroup']}>
        <div className={styles['copyCitationButtonWrapper']}>
          <CopyToClipboardButton
            text={defaultStyleCitationText}
            showTruncateText={false}
            tooltipText={t('copyCitationToClipboard')}
            disabled={isFetchingDefaultStyleCitation || !defaultStyleCitationText}
          />
        </div>
        <DropdownButton title="Cite Dataset" id="dataset-actions" variant="link">
          <DropdownButtonItem
            style={{ textDecoration: 'underline' }}
            onClick={() => handleDownloadCitation(CitationFormat.EndNote, `${datasetId}.xml`)}>
            {t('downloadEndNoteXML')}
          </DropdownButtonItem>
          <DropdownButtonItem
            style={{ textDecoration: 'underline' }}
            onClick={() => handleDownloadCitation(CitationFormat.RIS, `${datasetId}.ris`)}>
            {t('downloadRIS')}
          </DropdownButtonItem>
          <DropdownButtonItem
            style={{ textDecoration: 'underline' }}
            onClick={() => handleDownloadCitation(CitationFormat.BibTeX, `${datasetId}.bib`)}>
            {t('downloadBibTeX')}
          </DropdownButtonItem>
          <DropdownButtonItem onClick={handleOpenModal} className={styles['styledCitationButton']}>
            {t('viewStyledCitation')}
          </DropdownButtonItem>
        </DropdownButton>
      </Stack>
      <ViewStyledCitationModal
        show={isModalOpen}
        handleClose={handleCloseModal}
        citation={styledCitation}
        defaultStyleCitationSeed={
          defaultStyleCitationHtml
            ? { styleSlug: DEFAULT_CSL_STYLE_SLUG, html: defaultStyleCitationHtml }
            : null
        }
      />
    </>
  )
}
