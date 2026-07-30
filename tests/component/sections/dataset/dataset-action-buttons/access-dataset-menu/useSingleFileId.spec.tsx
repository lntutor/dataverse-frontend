import { act, renderHook, waitFor } from '@testing-library/react'
import { DatasetVersionMother } from '@tests/component/dataset/domain/models/DatasetMother'
import { FileRepository } from '@/files/domain/repositories/FileRepository'
import { useSingleFileId } from '@/sections/dataset/dataset-action-buttons/access-dataset-menu/useSingleFileId'

describe('useSingleFileId', () => {
  const persistentId = 'doi:10.5072/FK2/ABC123'
  const version = DatasetVersionMother.createRealistic()

  it('resolves the single file ID', async () => {
    const repository = createRepositoryStub(Promise.resolve(42))

    const { result } = renderHook(() => useSingleFileId(repository, persistentId, version))

    await waitFor(() => expect(result.current).to.equal(42))
  })

  it('keeps the ID undefined for a multi-file dataset', async () => {
    const repository = createRepositoryStub(Promise.resolve(undefined))

    const { result } = renderHook(() => useSingleFileId(repository, persistentId, version))

    await waitFor(
      () => expect(repository.getSingleFileIdByDatasetPersistentId).to.have.been.calledOnce
    )
    expect(result.current).to.be.undefined
  })

  it('falls back to undefined when discovery fails', async () => {
    const repository = createRepositoryStub(Promise.reject(new Error('Unable to read files')))

    const { result } = renderHook(() => useSingleFileId(repository, persistentId, version))

    await waitFor(
      () => expect(repository.getSingleFileIdByDatasetPersistentId).to.have.been.calledOnce
    )
    expect(result.current).to.be.undefined
  })

  it('ignores a resolution after unmount', async () => {
    let resolveFileId: (fileId: number | undefined) => void = () => undefined
    const pendingFileId = new Promise<number | undefined>((resolve) => {
      resolveFileId = resolve
    })
    const repository = createRepositoryStub(pendingFileId)
    const consoleError = cy.stub(console, 'error')
    const { unmount } = renderHook(() => useSingleFileId(repository, persistentId, version))

    unmount()
    await act(async () => {
      resolveFileId(42)
      await pendingFileId
    })

    expect(consoleError).not.to.have.been.called
  })
})

function createRepositoryStub(result: Promise<number | undefined>): FileRepository {
  return {
    getSingleFileIdByDatasetPersistentId: cy.stub().returns(result)
  } as unknown as FileRepository
}
