import { DatasetRepository } from '@/dataset/domain/repositories/DatasetRepository'
import { CitationDownloadButton } from '../../../../../src/sections/shared/citation/citation-download/CitationDownloadButton'
import { FormattedCitation } from '@/dataset/domain/models/DatasetCitation'
import { ViewStyledCitationModal } from '@/sections/shared/citation/citation-download/ViewStyledCitationModal'
import {
  CSL_STYLES_BASE_URL,
  CSL_LOCALES_BASE_URL,
  clearCslCachesForTests
} from '@/sections/shared/citation/citation-download/csl/cslStyleFetcher'
import { WithRepositories } from '@tests/component/WithRepositories'
import i18next from '@/i18n'

const datasetRepository: DatasetRepository = {} as DatasetRepository
const mockCitation: FormattedCitation = {
  content: JSON.stringify({ id: 'mock-1', type: 'dataset', title: 'Mock Dataset Title' }),
  contentType: 'application/json'
}

describe('CitationDownloadButton', () => {
  beforeEach(() => {
    cy.wrap(i18next.loadNamespaces('files'))

    cy.window().then((win) => {
      cy.stub(win.URL, 'createObjectURL').as('createObjectURL').returns('mock-url')
      cy.stub(win.URL, 'revokeObjectURL').as('revokeObjectURL')
    })

    clearCslCachesForTests()
    cy.intercept('GET', `${CSL_STYLES_BASE_URL}/*.csl`, { fixture: 'citation/test-style.csl' })
    cy.intercept('GET', `${CSL_LOCALES_BASE_URL}/locales-en-US.xml`, {
      fixture: 'citation/locales-en-US.xml'
    })
  })

  it('renders the button', () => {
    cy.customMount(
      <WithRepositories datasetRepository={datasetRepository}>
        <CitationDownloadButton datasetId="" version="" />
      </WithRepositories>
    )
    cy.findByRole('button', { name: 'Cite Dataset' }).should('exist')
  })

  it('downloads EndNote XML citation', () => {
    datasetRepository.getDatasetCitationInOtherFormats = cy.stub().resolves(mockCitation)

    cy.customMount(
      <WithRepositories datasetRepository={datasetRepository}>
        <CitationDownloadButton datasetId="test-dataset" version="1.0" />
      </WithRepositories>
    )

    cy.findByRole('button', { name: 'Cite Dataset' }).click()
    cy.findByText('Download EndNote XML').click()

    cy.then(() => {
      expect(datasetRepository.getDatasetCitationInOtherFormats).to.have.been.calledWith(
        'test-dataset',
        '1.0',
        'EndNote'
      )
    })
    cy.get('@createObjectURL').should('have.been.called')
    cy.get('@revokeObjectURL').should('have.been.called')
  })

  it('downloads RIS citation and triggers file download', () => {
    datasetRepository.getDatasetCitationInOtherFormats = cy.stub().resolves(mockCitation)

    cy.customMount(
      <WithRepositories datasetRepository={datasetRepository}>
        <CitationDownloadButton datasetId="test-dataset" version="1.0" />
      </WithRepositories>
    )

    cy.findByRole('button', { name: 'Cite Dataset' }).click()
    cy.findByText('Download RIS').click()

    cy.then(() => {
      expect(datasetRepository.getDatasetCitationInOtherFormats).to.have.been.calledWith(
        'test-dataset',
        '1.0',
        'RIS'
      )
    })
    cy.get('@createObjectURL').should('have.been.called')
  })

  it('downloads BibTeX citation and creates download link', () => {
    datasetRepository.getDatasetCitationInOtherFormats = cy.stub().resolves(mockCitation)

    cy.customMount(
      <WithRepositories datasetRepository={datasetRepository}>
        <CitationDownloadButton datasetId="test-dataset" version="1.0" />
      </WithRepositories>
    )

    cy.findByRole('button', { name: 'Cite Dataset' }).click()
    cy.findByText('Download BibTeX').click()

    cy.then(() => {
      expect(datasetRepository.getDatasetCitationInOtherFormats).to.have.been.calledWith(
        'test-dataset',
        '1.0',
        'BibTeX'
      )
    })

    cy.get('@createObjectURL').should('have.been.called')
    cy.get('@revokeObjectURL').should('have.been.called')
  })

  it('verifies correct filename is used for download', () => {
    const createElementSpy = cy.spy(document, 'createElement')
    datasetRepository.getDatasetCitationInOtherFormats = cy.stub().resolves(mockCitation)

    cy.customMount(
      <WithRepositories datasetRepository={datasetRepository}>
        <CitationDownloadButton datasetId="my-dataset" version="2.0" />
      </WithRepositories>
    )

    cy.findByRole('button', { name: 'Cite Dataset' }).click()
    cy.findByText('Download EndNote XML').click()

    cy.then(() => {
      expect(createElementSpy).to.have.been.calledWith('a')
    })
  })

  it('opens the dropdown list and displays the citation download options', () => {
    datasetRepository.getDatasetCitationInOtherFormats = cy.stub().resolves(mockCitation)
    cy.customMount(
      <WithRepositories datasetRepository={datasetRepository}>
        <CitationDownloadButton datasetId="" version="" />
      </WithRepositories>
    )
    cy.findByRole('button', { name: 'Cite Dataset' }).click()
    cy.findByText('Download EndNote XML').should('exist')
    cy.findByText('Download RIS').should('exist')
    cy.findByText('Download BibTeX').should('exist')
    cy.findByText('View Styled Citation').should('exist')
  })

  it('shows a quick-copy icon next to the Cite Dataset dropdown that copies the chicago-author-date citation', () => {
    datasetRepository.getDatasetCitationInOtherFormats = cy.stub().resolves(mockCitation)

    cy.window().then((win) => {
      cy.stub(win.navigator.clipboard, 'writeText').resolves()
    })

    cy.customMount(
      <WithRepositories datasetRepository={datasetRepository}>
        <CitationDownloadButton datasetId="test-dataset" version="1.0" />
      </WithRepositories>
    )

    cy.findByRole('button', { name: 'Cite Dataset' }).should('exist')

    cy.findByRole('button', { name: /Copy to clipboard icon/ }).then(($copyButton) => {
      cy.findByRole('button', { name: 'Cite Dataset' }).then(($citeDatasetButton) => {
        const position = $copyButton[0].compareDocumentPosition($citeDatasetButton[0])
        expect(position & Node.DOCUMENT_POSITION_FOLLOWING).to.be.greaterThan(0)
      })
    })

    cy.findByRole('button', { name: /Copy to clipboard icon/ }).click()

    cy.window().then((win) => {
      // eslint-disable-next-line @typescript-eslint/unbound-method
      cy.wrap(win.navigator.clipboard.writeText).should('be.calledWithMatch', 'Mock Dataset Title')
    })
  })

  it('handles errors when downloading citation', () => {
    datasetRepository.getDatasetCitationInOtherFormats = cy
      .stub()
      .rejects(new Error('Download error'))
    cy.customMount(
      <WithRepositories datasetRepository={datasetRepository}>
        <CitationDownloadButton datasetId="" version="" />
      </WithRepositories>
    )
    cy.findByRole('button', { name: 'Cite Dataset' }).click()
    cy.findByText('Download EndNote XML').click()
    cy.findByText('An error occurred while downloading the citation').should('exist')
  })

  it('opens styled citation modal and renders the citation formatted in the default style', () => {
    cy.customMount(
      <ViewStyledCitationModal show={true} handleClose={() => {}} citation={mockCitation} />
    )

    cy.findByText('Styled Citation').should('exist')
    cy.findByText('Select a CSL Style').should('exist')
    cy.findByText('Mock Dataset Title').should('exist')
    cy.findByRole('button', { name: /Copy to clipboard icon/ }).should('exist')
    cy.findByRole('dialog').should('exist')
  })

  it('keeps the modal loading while its citation is being fetched', () => {
    cy.customMount(
      <ViewStyledCitationModal show handleClose={() => {}} citation={null} isCitationLoading />
    )

    cy.findByRole('dialog').should('exist')
    cy.findByLabelText('Toggle options menu').should('be.disabled')
    cy.findByRole('button', { name: /Copy to clipboard icon/ }).should(
      'have.attr',
      'aria-disabled',
      'true'
    )
    cy.get('[role="status"]').should('exist')
  })

  it('handles malformed CSL-JSON without trying to format or copy it', () => {
    const malformedCitation: FormattedCitation = {
      content: '{not valid json',
      contentType: 'application/json'
    }

    cy.customMount(
      <ViewStyledCitationModal show handleClose={() => {}} citation={malformedCitation} />
    )

    cy.findByLabelText('Toggle options menu').should('be.disabled')
    cy.findByRole('button', { name: /Copy to clipboard icon/ }).should(
      'have.attr',
      'aria-disabled',
      'true'
    )
    cy.get('[role="status"]').should('not.exist')
    cy.contains('An error occurred while formatting the citation in the selected style').should(
      'exist'
    )
  })

  it('sanitizes formatted citation HTML before rendering it', () => {
    cy.customMount(
      <ViewStyledCitationModal
        show
        handleClose={() => {}}
        citation={mockCitation}
        defaultStyleCitationSeed={{
          styleSlug: 'chicago-author-date',
          html: '<span data-safe="true" onclick="alert(1)">Safe text</span><script>alert(1)</script>'
        }}
      />
    )

    cy.findByText('Safe text').should('have.attr', 'data-safe', 'true')
    cy.findByText('Safe text').should('not.have.attr', 'onclick')
    cy.get('script').should('not.exist')
  })

  it('groups CSL styles into Common Styles and More Styles sections', () => {
    cy.customMount(
      <ViewStyledCitationModal show={true} handleClose={() => {}} citation={mockCitation} />
    )

    cy.get('#cslStyle').click()

    cy.findByText('Select...').should('not.exist')
    cy.findByText('Common Styles').should('exist')
    cy.findByText('More Styles').should('exist')
    cy.findByRole('option', {
      name: 'Chicago Manual of Style 17th edition (author-date)'
    }).should('exist')
    cy.findByRole('option', { name: 'IEEE' }).should('exist')

    cy.findByPlaceholderText('Search...').type('apa')

    cy.findByText('Common Styles').should('not.exist')
    cy.findByText('More Styles').should('not.exist')
    cy.findByRole('option', {
      name: 'American Psychological Association 7th edition'
    }).should('exist')
  })

  it('reformats the citation when a different CSL style is selected', () => {
    cy.intercept('GET', `${CSL_STYLES_BASE_URL}/apa.csl`, { fixture: 'citation/test-style-b.csl' })

    cy.customMount(
      <ViewStyledCitationModal show={true} handleClose={() => {}} citation={mockCitation} />
    )

    cy.findByText('Mock Dataset Title').should('exist')

    cy.get('#cslStyle').click()
    cy.findByPlaceholderText('Search...').type('apa')
    cy.findByRole('option', {
      name: 'American Psychological Association 7th edition'
    }).click()

    cy.findByText('STYLE-B: Mock Dataset Title').should('exist')
  })

  it('hides the bibliography entry number for numbered CSL styles', () => {
    cy.intercept('GET', `${CSL_STYLES_BASE_URL}/apa.csl`, {
      fixture: 'citation/numbered-style.csl'
    })

    cy.customMount(
      <ViewStyledCitationModal show={true} handleClose={() => {}} citation={mockCitation} />
    )

    cy.get('#cslStyle').click()
    cy.findByPlaceholderText('Search...').type('apa')
    cy.findByRole('option', {
      name: 'American Psychological Association 7th edition'
    }).click()

    cy.findByText('Mock Dataset Title').should('exist')
    cy.get('.csl-left-margin').should('exist').and('not.be.visible')
  })

  it('shows an error message when fetching the CSL style fails', () => {
    cy.intercept('GET', `${CSL_STYLES_BASE_URL}/*.csl`, { statusCode: 500 })

    cy.customMount(
      <ViewStyledCitationModal show={true} handleClose={() => {}} citation={mockCitation} />
    )

    cy.contains('An error occurred while formatting the citation in the selected style').should(
      'exist'
    )
  })

  it('closes styled citation modal when close is triggered', () => {
    datasetRepository.getDatasetCitationInOtherFormats = cy.stub().resolves(mockCitation)

    cy.customMount(
      <WithRepositories datasetRepository={datasetRepository}>
        <CitationDownloadButton datasetId="test-dataset" version="1.0" />
      </WithRepositories>
    )

    cy.findByRole('button', { name: 'Cite Dataset' }).click()
    cy.findByText('View Styled Citation').click()

    cy.findByRole('dialog').should('exist')
    cy.findByRole('button', { name: 'Cancel' }).click()
    cy.findByRole('dialog').should('not.exist')
  })

  it('remembers the selected CSL style after closing and reopening the modal', () => {
    cy.intercept('GET', `${CSL_STYLES_BASE_URL}/apa.csl`, { fixture: 'citation/test-style-b.csl' })
    datasetRepository.getDatasetCitationInOtherFormats = cy.stub().resolves(mockCitation)

    cy.customMount(
      <WithRepositories datasetRepository={datasetRepository}>
        <CitationDownloadButton datasetId="test-dataset" version="1.0" />
      </WithRepositories>
    )

    cy.findByRole('button', { name: 'Cite Dataset' }).click()
    cy.findByText('View Styled Citation').click()

    cy.get('#cslStyle').click()
    cy.findByPlaceholderText('Search...').type('apa')
    cy.findByRole('option', {
      name: 'American Psychological Association 7th edition'
    }).click()

    cy.findByText('Citation in apa style').should('exist')
    cy.findByText('STYLE-B: Mock Dataset Title').should('exist')
    cy.findByTestId('toggle-inner-content').should('contain.text', 'apa')

    cy.findByRole('button', { name: /close/i }).click()
    cy.findByRole('dialog').should('not.exist')

    cy.findByRole('button', { name: 'Cite Dataset' }).click()
    cy.findByText('View Styled Citation').click()

    cy.findByRole('dialog').should('exist')
    cy.findByText('Citation in apa style').should('exist')
    cy.findByTestId('toggle-inner-content').should('contain.text', 'apa')
    cy.findByText('STYLE-B: Mock Dataset Title').should('exist')
  })

  it('handles error when fetching styled citation', () => {
    datasetRepository.getDatasetCitationInOtherFormats = cy
      .stub()
      .rejects(new Error('Citation fetch error'))

    cy.customMount(
      <WithRepositories datasetRepository={datasetRepository}>
        <CitationDownloadButton datasetId="test-dataset" version="1.0" />
      </WithRepositories>
    )

    cy.findByRole('button', { name: 'Cite Dataset' }).click()
    cy.findByText('View Styled Citation').click()

    cy.findByText('An error occurred while downloading the citation').should('exist')
  })
})
