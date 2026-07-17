import { useMemo, useState } from 'react'
import cn from 'classnames'
import { FormattedCitation } from '@/dataset/domain/models/DatasetCitation'
import { CopyToClipboardButton } from '@/sections/dataset/dataset-files/files-table/file-info/file-info-cell/file-info-data/copy-to-clipboard-button/CopyToClipboardButton'
import { Alert, Button, Form, Modal, Spinner, Stack } from '@iqss/dataverse-design-system'
import { useTranslation } from 'react-i18next'
import { Utils } from '@/shared/helpers/Utils'
import styles from '../Citation.module.scss'
import { buildCslStyleOptions, DEFAULT_CSL_STYLE_SLUG } from './csl/cslStyleOptions'
import { useStyledCitation, StyledCitationSeed } from './csl/useStyledCitation'
import { CslJsonItem } from './csl/citeprocEngine'
import DOMPurify from 'dompurify'

interface ViewStyledCitationModalProps {
  show: boolean
  handleClose: () => void
  citation: FormattedCitation | null
  defaultStyleCitationSeed?: StyledCitationSeed | null
  isCitationLoading?: boolean
}

export const ViewStyledCitationModal = ({
  show,
  handleClose,
  citation,
  defaultStyleCitationSeed,
  isCitationLoading = false
}: ViewStyledCitationModalProps) => {
  const { t } = useTranslation('shared', { keyPrefix: 'downloadCitation' })
  const { t: tShared } = useTranslation('shared')
  const modalTitle = t('styledCitation')
  const [selectedStyleSlug, setSelectedStyleSlug] = useState(DEFAULT_CSL_STYLE_SLUG)

  const cslStyleOptions = useMemo(
    () => buildCslStyleOptions(t('commonStyles'), t('moreStyles')),
    [t]
  )
  const cslJsonItem = useMemo(() => parseCslJsonItem(citation), [citation])
  const { citationHtml, isLoading, error } = useStyledCitation(
    cslJsonItem,
    selectedStyleSlug,
    defaultStyleCitationSeed,
    isCitationLoading
  )
  const sanitizedCitationHtml = useMemo(
    () =>
      citationHtml
        ? DOMPurify.sanitize(citationHtml, {
            USE_PROFILES: { html: true }
          })
        : '',
    [citationHtml]
  )
  const plainTextCitation = sanitizedCitationHtml
    ? Utils.htmlToPlainText(sanitizedCitationHtml)
    : ''

  return (
    <Modal show={show} onHide={handleClose} centered ariaLabel={modalTitle}>
      <Modal.Header>
        <Modal.Title>{modalTitle}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form>
          <Form.Group.Label htmlFor="cslStyle">{t('selectCSLStyle')}</Form.Group.Label>
          <Form.Group.SelectAdvanced
            inputButtonId="cslStyle"
            options={cslStyleOptions}
            isSearchable
            hidePlaceholderOption
            isDisabled={isLoading}
            defaultValue={selectedStyleSlug}
            onChange={setSelectedStyleSlug}
          />
          <Form.Group.Label htmlFor="citationContent" className={styles['citationStyleLabel']}>
            {t('citationInStyle', { styleName: selectedStyleSlug })}
          </Form.Group.Label>
          <Stack direction="horizontal" gap={1}>
            <p className={cn('form-control', styles['styledCitationBox'])}>
              {isLoading && <Spinner variant="info" size="sm" />}
              {!isLoading && error && <Alert variant="danger">{t('styleFormatError')}</Alert>}
              {!isLoading && !error && (
                <span dangerouslySetInnerHTML={{ __html: sanitizedCitationHtml }} />
              )}
            </p>
            <CopyToClipboardButton
              text={plainTextCitation}
              showTruncateText={false}
              tooltipText={t('copyCitationToClipboard')}
              iconSize={24}
              disabled={isLoading || !!error}
            />
          </Stack>
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose} type="button">
          {tShared('cancel')}
        </Button>
      </Modal.Footer>
    </Modal>
  )
}

function parseCslJsonItem(citation: FormattedCitation | null): CslJsonItem | null {
  if (!citation) {
    return null
  }
  try {
    return JSON.parse(citation.content) as CslJsonItem
  } catch {
    return null
  }
}
