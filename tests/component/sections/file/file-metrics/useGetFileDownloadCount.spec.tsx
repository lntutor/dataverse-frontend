import { FileRepository } from '@/files/domain/repositories/FileRepository'
import { useGetFileDownloadCount } from '@/sections/file/file-metrics/useGetFileDownloadCount'
import { renderHook } from '@testing-library/react'

const fileRepository: FileRepository = {} as FileRepository

describe('useGetFileDownloadCount', () => {
  it('should return the file download count', () => {
    fileRepository.getFileDownloadCount = cy.stub().resolves(8)

    const { result } = renderHook(() =>
      useGetFileDownloadCount({
        fileRepository,
        fileId: 1
      })
    )

    expect(result.current.isLoadingDownloadCount).to.deep.equal(true)
    expect(result.current.errorLoadingDownloadCount).to.deep.equal(null)
    expect(result.current.downloadCount).to.deep.equal(null)

    cy.wrap(null).should(() => {
      expect(result.current.isLoadingDownloadCount).to.deep.equal(false)
      expect(result.current.errorLoadingDownloadCount).to.deep.equal(null)
      expect(result.current.downloadCount).to.deep.equal(8)
      expect(fileRepository.getFileDownloadCount).to.have.been.calledWith(1)
    })
  })

  it('should call the repository with a persistent id', () => {
    const persistentId = 'doi:10.5072/FK2/AAA000'
    fileRepository.getFileDownloadCount = cy.stub().resolves(3)

    const { result } = renderHook(() =>
      useGetFileDownloadCount({
        fileRepository,
        fileId: persistentId
      })
    )

    expect(result.current.isLoadingDownloadCount).to.deep.equal(true)
    expect(result.current.downloadCount).to.deep.equal(null)

    cy.wrap(null).should(() => {
      expect(result.current.isLoadingDownloadCount).to.deep.equal(false)
      expect(result.current.downloadCount).to.deep.equal(3)
      expect(fileRepository.getFileDownloadCount).to.have.been.calledWith(persistentId)
    })
  })

  it('should return an error message when the repository fails', () => {
    fileRepository.getFileDownloadCount = cy.stub().rejects(new Error('Error message'))

    const { result } = renderHook(() =>
      useGetFileDownloadCount({
        fileRepository,
        fileId: 1
      })
    )

    expect(result.current.isLoadingDownloadCount).to.deep.equal(true)
    expect(result.current.errorLoadingDownloadCount).to.deep.equal(null)
    expect(result.current.downloadCount).to.deep.equal(null)

    cy.wrap(null).should(() => {
      expect(result.current.isLoadingDownloadCount).to.deep.equal(false)
      expect(result.current.downloadCount).to.deep.equal(null)
      expect(result.current.errorLoadingDownloadCount).to.deep.equal(
        'Something went wrong while getting the file download count. Try again later.'
      )
    })
  })

  it('should clear stale error and download count before fetching again', () => {
    let resolveSecondRequest: (downloadCount: number) => void = () => undefined
    const secondRequest = new Promise<number>((resolve) => {
      resolveSecondRequest = resolve
    })

    fileRepository.getFileDownloadCount = cy
      .stub()
      .onFirstCall()
      .rejects(new Error('Error message'))
      .onSecondCall()
      .returns(secondRequest)

    const { result, rerender } = renderHook(
      ({ fileId }) =>
        useGetFileDownloadCount({
          fileRepository,
          fileId
        }),
      {
        initialProps: {
          fileId: 1
        }
      }
    )

    cy.wrap(null).should(() => {
      expect(result.current.isLoadingDownloadCount).to.deep.equal(false)
      expect(result.current.downloadCount).to.deep.equal(null)
      expect(result.current.errorLoadingDownloadCount).to.deep.equal(
        'Something went wrong while getting the file download count. Try again later.'
      )
    })

    cy.then(() => {
      rerender({ fileId: 2 })

      expect(result.current.isLoadingDownloadCount).to.deep.equal(true)
      expect(result.current.downloadCount).to.deep.equal(null)
      expect(result.current.errorLoadingDownloadCount).to.deep.equal(null)

      resolveSecondRequest(4)
    })

    cy.wrap(null).should(() => {
      expect(result.current.isLoadingDownloadCount).to.deep.equal(false)
      expect(result.current.downloadCount).to.deep.equal(4)
      expect(result.current.errorLoadingDownloadCount).to.deep.equal(null)
      expect(fileRepository.getFileDownloadCount).to.have.been.calledWith(2)
    })
  })
})
