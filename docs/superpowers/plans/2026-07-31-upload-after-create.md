# Upload Files After Dataset Creation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Navigate users directly to the Upload Files page after successfully creating a dataset.

**Architecture:** Keep successful submission routing in `useSubmitDataset`. Reuse the existing upload-files route and query parameter contract, while preserving edit-mode and error behavior.

**Tech Stack:** React, TypeScript, React Router, Cypress component tests

---

### Task 1: Prove the create-mode destination

**Files:**

- Modify: `tests/component/sections/shared/dataset-metadata-form/DatasetMetadataForm.spec.tsx`

- [ ] **Step 1: Add a location observer and failing assertion**

Import `useLocation`, add a small observer component, mount it alongside the create form in the existing successful-create test, and assert the full in-memory router location:

```tsx
import { useLocation } from 'react-router-dom'

const LocationObserver = () => {
  const location = useLocation()

  return <div data-testid="router-location">{`${location.pathname}${location.search}`}</div>
}
```

```tsx
<>
  <DatasetMetadataForm
    mode="create"
    collectionId="root"
    metadataBlockInfoRepository={metadataBlockInfoRepository}
  />
  <LocationObserver />
</>
```

```tsx
cy.findByTestId('router-location').should(
  'have.text',
  '/datasets/upload-files?persistentId=persistentId&version=DRAFT'
)
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
npm run test:unit -- --spec tests/component/sections/shared/dataset-metadata-form/DatasetMetadataForm.spec.tsx
```

Expected: the successful-create test fails because the location is `/datasets?persistentId=persistentId&version=DRAFT`.

### Task 2: Redirect successful creation to Upload Files

**Files:**

- Modify: `src/sections/shared/form/DatasetMetadataForm/useSubmitDataset.ts`

- [ ] **Step 1: Change only the create-mode route**

Replace the current successful-create navigation with the existing upload route while preserving the query parameters:

```ts
navigate(
  `${Route.UPLOAD_DATASET_FILES}?${QueryParamKey.PERSISTENT_ID}=${persistentId}&${QueryParamKey.VERSION}=${DatasetNonNumericVersionSearchParam.DRAFT}`
)
```

- [ ] **Step 2: Run the focused component spec and verify GREEN**

Run:

```bash
npm run test:unit -- --spec tests/component/sections/shared/dataset-metadata-form/DatasetMetadataForm.spec.tsx
```

Expected: all tests in the spec pass, including the upload-files destination assertion.

- [ ] **Step 3: Add the changelog entry**

**Files:**

- Modify: `CHANGELOG.md`

Add under the current Unreleased fixes:

```markdown
- Creating a dataset now opens the Upload Files page for the new draft.
```

### Task 3: Verify and submit

**Files:**

- Verify: `CHANGELOG.md`
- Verify: `src/sections/shared/form/DatasetMetadataForm/useSubmitDataset.ts`
- Verify: `tests/component/sections/shared/dataset-metadata-form/DatasetMetadataForm.spec.tsx`

- [ ] **Step 1: Run lint**

Run `npm run lint`.

Expected: exit code 0, with no new errors.

- [ ] **Step 2: Run the production build**

Run `npm run build`.

Expected: exit code 0.

- [ ] **Step 3: Check the patch**

Run `git diff --check` and `git status --short`.

Expected: no whitespace errors and only the planned files are modified.

- [ ] **Step 4: Commit**

```bash
git add CHANGELOG.md src/sections/shared/form/DatasetMetadataForm/useSubmitDataset.ts tests/component/sections/shared/dataset-metadata-form/DatasetMetadataForm.spec.tsx
git commit -m "fix: open file upload after dataset creation"
```

- [ ] **Step 5: Push and open the pull request**

Push `fix/redirect-after-create-1031` to the fork and open a PR against `IQSS/dataverse-frontend:develop` with `Closes #1031`.
