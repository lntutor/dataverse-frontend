# Upload Files After Dataset Creation

## Context

After creating a dataset, the frontend currently navigates to the new draft's dataset page. Issue #1031 asks to remove the extra click required to begin adding files by taking the user directly to the existing Upload Files page.

## Design

Keep the behavior in `useSubmitDataset`, where successful create and edit submissions already choose their destinations. On a successful create response, build the existing upload-files URL with the returned persistent ID and the `DRAFT` version search parameter, then navigate to it. Successful metadata edits continue to return to the draft dataset page.

This reuses the route and query contract already used by `DatasetUploadFilesButton`. It avoids adding callback props through `CreateDataset`, `DatasetMetadataForm`, and `MetadataForm`, and avoids loading the dataset page only to perform a second redirect.

## Data Flow

1. The user submits valid create-dataset metadata.
2. `datasetRepository.create` returns the new dataset's persistent ID.
3. Existing success state, notification refresh, and toast behavior run unchanged.
4. The router navigates to `/datasets/upload-files` with `persistentId` and `version=DRAFT` query parameters.
5. `UploadDatasetFilesFactory` reads those parameters and loads the new draft through `DatasetProvider`.

## Error Handling

Creation failures retain the current validation and fallback error handling. No navigation occurs when creation fails. The upload page retains responsibility for displaying missing or unavailable datasets.

## Testing

Add a component regression test that submits the create-mode metadata form with valid required fields and asserts that the browser location becomes the upload-files URL for the returned persistent ID and draft version. Run the focused component spec, lint, production build, and `git diff --check` before submission.

## Scope

This change does not alter backend APIs, file upload behavior, edit-mode navigation, cancellation, or dataset creation validation.
