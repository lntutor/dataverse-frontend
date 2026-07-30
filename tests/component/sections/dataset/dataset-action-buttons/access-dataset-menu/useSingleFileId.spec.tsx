import { act, renderHook, waitFor } from '@testing-library/react'
import { DatasetVersionMother } from '@tests/component/dataset/domain/models/DatasetMother'
import { FileRepository } from '@/files/domain/repositories/FileRepository'
import { FilePreview } from '@/files/domain/models/FilePreview'
import { FilesWithCount } from '@/files/domain/models/FilesWithCount'
import { useSingleFileId } from '@/sections/dataset/dataset-action-buttons/access-dataset-menu/useSingleFileId'

describe('useSingleFileId', () => {
  const persistentId = 'doi:10.5072/FK2/ABC123'
  const version = DatasetVersionMother.createRealistic()

  it('resolves the single file ID', async () => {
    const repository = createRepositoryStub(
      Promise.resolve({ files: [{ id: 42 } as FilePreview], totalFilesCount: 1 })
    )

    const { result } = renderHook(() => useSingleFileId(repository, persistentId, version))

    await waitFor(() => expect(result.current).to.equal(42))
  })

  it('keeps the ID undefined for a multi-file dataset', async () => {
    const repository = createRepositoryStub(
      Promise.resolve({ files: [{ id: 42 } as FilePreview], totalFilesCount: 2 })
    )

    const { result } = renderHook(() => useSingleFileId(repository, persistentId, version))

    await waitFor(
      () => expect(repository.getAllByDatasetPersistentIdWithCount).to.have.been.calledOnce
    )
    expect(result.current).to.be.undefined
  })

  it('falls back to undefined when discovery fails', async () => {
    const repository = createRepositoryStub(Promise.reject(new Error('Unable to read files')))

    const { result } = renderHook(() => useSingleFileId(repository, persistentId, version))

    await waitFor(
      () => expect(repository.getAllByDatasetPersistentIdWithCount).to.have.been.calledOnce
    )
    expect(result.current).to.be.undefined
  })

  it('ignores a resolution after unmount', async () => {
    let resolveFiles: (files: FilesWithCount) => void = () => undefined
    const pendingFiles = new Promise<FilesWithCount>((resolve) => {
      resolveFiles = resolve
    })
    const repository = createRepositoryStub(pendingFiles)
    const consoleError = cy.stub(console, 'error')
    const { unmount } = renderHook(() => useSingleFileId(repository, persistentId, version))

    unmount()
    await act(async () => {
      resolveFiles({ files: [{ id: 42 } as FilePreview], totalFilesCount: 1 })
      await pendingFiles
    })

    expect(consoleError).not.to.have.been.called
  })
})

function createRepositoryStub(result: Promise<FilesWithCount>): FileRepository {
  return {
    getAllByDatasetPersistentIdWithCount: cy.stub().returns(result)
  } as unknown as FileRepository
}
