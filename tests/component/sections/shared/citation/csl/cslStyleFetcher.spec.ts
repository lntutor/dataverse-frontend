import {
  getResolvedStyleXml,
  getLocaleXml,
  CslStyleResolutionError,
  CSL_STYLES_BASE_URL,
  CSL_LOCALES_BASE_URL
} from '@/sections/shared/citation/citation-download/csl/cslStyleFetcher'

describe('cslStyleFetcher', () => {
  it('resolves an independent style directly', () => {
    cy.intercept('GET', `${CSL_STYLES_BASE_URL}/independent-style-a.csl`, {
      fixture: 'citation/test-style.csl'
    }).as('getStyle')

    cy.then(() => getResolvedStyleXml('independent-style-a')).then((xml) => {
      expect(xml).to.include('Test Style')
    })
  })

  it('resolves a dependent style to its independent parent', () => {
    cy.intercept('GET', `${CSL_STYLES_BASE_URL}/dependent-style-a.csl`, { statusCode: 404 }).as(
      'getIndependentAttempt'
    )
    cy.intercept('GET', `${CSL_STYLES_BASE_URL}/dependent/dependent-style-a.csl`, {
      fixture: 'citation/dependent-style.csl'
    }).as('getDependent')
    cy.intercept('GET', `${CSL_STYLES_BASE_URL}/test-style.csl`, {
      fixture: 'citation/test-style.csl'
    }).as('getParent')

    cy.then(() => getResolvedStyleXml('dependent-style-a')).then((xml) => {
      expect(xml).to.include('Test Style')
      expect(xml).not.to.include('independent-parent')
    })
  })

  it('caches resolved style xml so repeated lookups do not hit the network again', () => {
    cy.intercept('GET', `${CSL_STYLES_BASE_URL}/independent-style-b.csl`, {
      fixture: 'citation/test-style.csl'
    }).as('getStyleB')

    cy.then(() => getResolvedStyleXml('independent-style-b'))
      .then(() => getResolvedStyleXml('independent-style-b'))
      .then(() => {
        cy.get('@getStyleB.all').should('have.length', 1)
      })
  })

  it('throws CslStyleResolutionError when a dependent style has no independent-parent link', () => {
    cy.intercept('GET', `${CSL_STYLES_BASE_URL}/orphan-dependent-style.csl`, {
      statusCode: 404
    }).as('getOrphanAttempt')
    cy.intercept('GET', `${CSL_STYLES_BASE_URL}/dependent/orphan-dependent-style.csl`, {
      fixture: 'citation/test-style.csl'
    }).as('getOrphanDependent')

    cy.then(() =>
      getResolvedStyleXml('orphan-dependent-style').then(
        () => Promise.reject(new Error('expected getResolvedStyleXml to throw')),
        (err: unknown) => err
      )
    ).then((err) => {
      expect(err).to.be.instanceOf(CslStyleResolutionError)
    })
  })

  it('fetches and caches the locale xml', () => {
    cy.intercept('GET', `${CSL_LOCALES_BASE_URL}/locales-en-US.xml`, {
      fixture: 'citation/locales-en-US.xml'
    }).as('getLocale')

    cy.then(() => getLocaleXml('en-US')).then((xml) => {
      expect(xml).to.include('xml:lang="en-US"')
    })
  })
})
