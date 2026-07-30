import { DatasetVersionMother } from '@tests/component/dataset/domain/models/DatasetMother'
import { FileRepository } from '@/files/domain/repositories/FileRepository'
import { getSingleFileIdByDatasetPersistentId } from '@/files/domain/useCases/getSingleFileIdByDatasetPersistentId'

describe('getSingleFileIdByDatasetPersistentId', () => {
  const datasetPersistentId = 'doi:10.5072/FK2/ABC123'
  const datasetVersion = DatasetVersionMother.createRealistic()

  it('returns the repository file ID for a single-file dataset', async () => {
    const repository = createRepositoryStub(Promise.resolve(42))

    const fileId = await getSingleFileIdByDatasetPersistentId(
      repository,
      datasetPersistentId,
      datasetVersion
    )

    expect(fileId).to.equal(42)
  })

  it('returns undefined when the dataset does not contain exactly one file', async () => {
    const repository = createRepositoryStub(Promise.resolve(undefined))

    const fileId = await getSingleFileIdByDatasetPersistentId(
      repository,
      datasetPersistentId,
      datasetVersion
    )

    expect(fileId).to.be.undefined
  })

  it('rejects with the repository error message', async () => {
    const repository = createRepositoryStub(Promise.reject(new Error('Unable to read files')))

    try {
      await getSingleFileIdByDatasetPersistentId(repository, datasetPersistentId, datasetVersion)
      throw new Error('Expected the use case to reject')
    } catch (error) {
      expect(error).to.be.instanceOf(Error)
      expect((error as Error).message).to.equal('Unable to read files')
    }
  })
})

function createRepositoryStub(result: Promise<number | undefined>): FileRepository {
  return {
    getSingleFileIdByDatasetPersistentId: cy.stub().returns(result)
  } as unknown as FileRepository
}
