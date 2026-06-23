import {
  assignDatasetGuestbook,
  createGuestbook,
  downloadGuestbookResponsesByCollectionId,
  downloadGuestbookResponsesOfAGuestbook as downloadGuestbookResponsesByGuestbookId,
  type CreateGuestbookDTO as JSDataverseCreateGuestbookDTO,
  editGuestbook,
  type EditGuestbookDTO as JSDataverseEditGuestbookDTO,
  type GuestbookResponseSubset,
  getGuestbooksByCollectionId,
  getGuestbook,
  getGuestbookResponsesByGuestbookId,
  setGuestbookEnabled,
  removeDatasetGuestbook
} from '@iqss/dataverse-client-javascript'
import { GuestbookRepository } from '../../domain/repositories/GuestbookRepository'
import { Guestbook } from '../../domain/models/Guestbook'
import { GuestbookDTO } from '../../domain/useCases/DTOs/GuestbookDTO'

export class GuestbookJSDataverseRepository implements GuestbookRepository {
  createGuestbook(collectionIdOrAlias: number | string, guestbook: GuestbookDTO): Promise<number> {
    return createGuestbook.execute(guestbook as JSDataverseCreateGuestbookDTO, collectionIdOrAlias)
  }

  editGuestbook(guestbookId: number, guestbook: GuestbookDTO): Promise<void> {
    return editGuestbook.execute(guestbookId, guestbook as JSDataverseEditGuestbookDTO)
  }

  getGuestbook(guestbookId: number): Promise<Guestbook> {
    return getGuestbook.execute(guestbookId).then((guestbook) => guestbook as Guestbook)
  }

  getGuestbooksByCollectionId(
    collectionIdOrAlias: number | string,
    includeStats = false,
    includeInherited = false
  ): Promise<Guestbook[]> {
    return getGuestbooksByCollectionId
      .execute(collectionIdOrAlias, includeStats, includeInherited)
      .then((guestbooks) => guestbooks as Guestbook[])
  }

  getGuestbookResponsesByGuestbookId(
    guestbookId: number,
    limit?: number,
    offset?: number
  ): Promise<GuestbookResponseSubset> {
    return getGuestbookResponsesByGuestbookId.execute(guestbookId, limit, offset)
  }

  setGuestbookEnabled(
    collectionIdOrAlias: number | string,
    guestbookId: number,
    enabled: boolean
  ): Promise<void> {
    return setGuestbookEnabled.execute(collectionIdOrAlias, guestbookId, enabled)
  }

  downloadGuestbookResponsesByCollectionId(collectionId: number | string): Promise<string> {
    return downloadGuestbookResponsesByCollectionId.execute(collectionId)
  }

  downloadGuestbookResponsesByGuestbookId(
    collectionId: number | string,
    guestbookId: number
  ): Promise<string> {
    return downloadGuestbookResponsesByGuestbookId.execute(collectionId, guestbookId)
  }

  assignDatasetGuestbook(datasetId: number | string, guestbookId: number): Promise<void> {
    return assignDatasetGuestbook.execute(datasetId, guestbookId)
  }

  removeDatasetGuestbook(datasetId: number | string): Promise<void> {
    return removeDatasetGuestbook.execute(datasetId)
  }
}
