import { DatasetVersionMother } from '@tests/component/dataset/domain/models/DatasetMother'
import { FileRepository } from '@/files/domain/repositories/FileRepository'
import { getSingleFileIdByDatasetPersistentId } from '@/files/domain/useCases/getSingleFileIdByDatasetPersistentId'
import { FilesWithCount } from '@/files/domain/models/FilesWithCount'
import { FilePreview } from '@/files/domain/models/FilePreview'

describe('getSingleFileIdByDatasetPersistentId', () => {
  const datasetPersistentId = 'doi:10.5072/FK2/ABC123'
  const datasetVersion = DatasetVersionMother.createRealistic()

  it('returns the repository file ID for a single-file dataset', async () => {
    const repository = createRepositoryStub(
      Promise.resolve({ files: [{ id: 42 } as FilePreview], totalFilesCount: 1 })
    )

    const fileId = await getSingleFileIdByDatasetPersistentId(
      repository,
      datasetPersistentId,
      datasetVersion
    )

    expect(fileId).to.equal(42)
  })

  it('returns undefined when the dataset does not contain exactly one file', async () => {
    const repository = createRepositoryStub(
      Promise.resolve({ files: [{ id: 42 } as FilePreview], totalFilesCount: 2 })
    )

    const fileId = await getSingleFileIdByDatasetPersistentId(
      repository,
      datasetPersistentId,
      datasetVersion
    )

    expect(fileId).to.be.undefined
  })
})

function createRepositoryStub(result: Promise<FilesWithCount>): FileRepository {
  return {
    getAllByDatasetPersistentIdWithCount: cy.stub().returns(result)
  } as unknown as FileRepository
}
