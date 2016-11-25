// @flow
import {
  __, isEqual, some, get, isEmpty, filter, difference, intersection, every, overSome, forEach, map,
  values, curry, keys, keyBy, concat, flow, assign, pick, omit, groupBy, mapValues, flatten,
  without, pickBy,
} from 'lodash/fp';
import { debounce } from 'lodash';
import { STORAGE_ACTION_SAVE, STORAGE_ACTION_REMOVE } from '../../types';
import { getOrThrow, objFrom } from '../../util';
import {
  updateDocumentStorageLocations, setDocumentStorageLocations, setDocumentContent, getDocument,
  setAccounts, getAccounts, getAccount,
} from '../index';
import { getPromiseStorage } from './promiseStorage';
import asyncStorageImplementation from './asyncStorageImplementation';
import dropboxStorageImplementation from './dropboxStorageImplementation';
import type { PromiseStorage } from './promiseStorage'; // eslint-disable-line
import type { // eslint-disable-line
  State, DocumentId, Document, StorageType, StorageAction, StorageOperation, StorageInterface,
} from '../../types';

/*
This handles both saving the documents records (only the ids, storage locations, and titles) to the
local storage, and the contents of the documents (ids, titles, sections, sectionTitles,
sectionTextInputs) to whatever implementation they use. The implementation could simply be local
storage, or it could be something like Dropbox or Google Drive.

For both document records and document contents, diffing between two states is used to determine
what changed.

For the saving of the document records, we just use the next and previous state.

For document contents, we work out if a document changed using the next and previous state, and
create a timeout for the implementation to save all changed documents after a certain time. When
the timeout is fired, we use what the state was the last time the implementation saved and the
now current state to determine what documents changed, and request that the implementation saves
those documents. For the first timeout, we use the previous redux state in the reducer.

All document updates are sent as a batch, and we don't allow a single implementation to have
multiple requests happening at a time.
*/

const FLUSH_STORAGE_TYPE_UPDATES = 'persistence-middleware:FLUSH_STORAGE_TYPE_UPDATES';
const LOAD_DOCUMENTS = 'persistence-middleware:LOAD_DOCUMENTS';
const LOAD_DOCUMENT = 'persistence-middleware:LOAD_DOCUMENT';

const accountsStorageKey = 'accounts';
const accountKeysToCheckForSave =
  ['accounts', 'accountTypes', 'accountTokens', 'accountNames'];

const accountsNeedsUpdating = (nextState, previousState) => (
  some(key => !isEqual(nextState[key], previousState[key]), accountKeysToCheckForSave)
);

// TODO: if a storage location changes by type, persist; change in any other way, ignore
const UPDATE_PRIORITY_NO_CHANGES = 0;
const UPDATE_PRIORITY_LAZY = 1;
const UPDATE_PRIORITY_IMMEDIATE = 2;

const documentKeysToPersist = ['documentTitles', 'documentSections'];
const sectionKeysToPersist = ['sectionTitles', 'sectionTextInputs'];

const documentsForType = (state, storageType) => filter(id => {
  const accountId = get(['documentStorageLocations', id, 'accountId'], state);
  const accountType = get(['accountTypes', accountId], state);
  return accountType === storageType;
}, state.documents);

const getUnloadedDocuments = (
  nextState,
  previousState,
) => without(nextState.loadedDocuments, previousState.loadedDocuments);

const addedDocuments = (
  nextState,
  previousState,
  nextDocuments,
  previousDocuments
) => {
  // Document wasn't loaded via loadDocuments
  const documentIsNew = documentId => !(documentId in previousState.documentStorageLocations);
  return filter(documentIsNew, difference(nextDocuments, previousDocuments));
};

const removedDocuments = (
  nextState,
  previousState,
  nextDocuments,
  previousDocuments
) => difference(previousDocuments, nextDocuments);

const changedDocuments = (
  nextState,
  previousState,
  nextDocuments,
  previousDocuments,
) => {
  const loadedDocuments = intersection(nextState.loadedDocuments, previousState.loadedDocuments);
  const allPossiblyChangedDocuments = intersection(nextDocuments, previousDocuments);
  const possiblyChanged = intersection(loadedDocuments, allPossiblyChangedDocuments);

  const valuesChangedBetweenStates = curry((keys, id) => !every(key => (
    isEqual(get([key, id], nextState), get([key, id], previousState))
  ), keys));

  const documentChanged = valuesChangedBetweenStates(documentKeysToPersist);
  const sectionsChanged = documentId => some(
    valuesChangedBetweenStates(sectionKeysToPersist),
    nextState.documentSections[documentId]
  );

  const changed = filter(overSome([
    documentChanged,
    sectionsChanged,
  ]), possiblyChanged);

  return changed;
};

const addedRemovedChangedArgsForType = (nextState, previousState, storageType) => {
  const previousDocumentsForStorageType =
    documentsForType(previousState, storageType);
  const nextDocumentsForStorageType =
    documentsForType(nextState, storageType);

  const args = [
    nextState,
    previousState,
    nextDocumentsForStorageType,
    previousDocumentsForStorageType,
  ];

  return args;
};

const changePriorityForDocumentsOfType = (
  nextState: State,
  previousState: State,
) => (storageType: StorageType) => {
  if (!isEmpty(getUnloadedDocuments(nextState, previousState))) return UPDATE_PRIORITY_IMMEDIATE;

  const args = addedRemovedChangedArgsForType(nextState, previousState, storageType);

  if (!isEmpty(addedDocuments(...args))) return UPDATE_PRIORITY_IMMEDIATE;
  if (!isEmpty(removedDocuments(...args))) return UPDATE_PRIORITY_IMMEDIATE;
  if (!isEmpty(changedDocuments(...args))) return UPDATE_PRIORITY_LAZY;
  return UPDATE_PRIORITY_NO_CHANGES;
};

const getChangedDocumentsForStorageType = (
  nextState: State,
  previousState: State,
  storageType: StorageType,
) => {
  const args = addedRemovedChangedArgsForType(nextState, previousState, storageType);

  return {
    added: addedDocuments(...args),
    removed: removedDocuments(...args),
    changed: changedDocuments(...args),
  };
};

export default (
  persistentStorage: PromiseStorage = getPromiseStorage(),
  storageImplementations: StorageInterface[] = [
    asyncStorageImplementation(persistentStorage),
    dropboxStorageImplementation(),
  ]
): any => ({ getState, dispatch }) => {
  const storages = keyBy('type', storageImplementations);
  const storageTypes = keys(storages);

  // Used by storage implementations to work out *how* a document changed
  let lastDocumentById = {};
  // Used by storage implementation to attempt recovery
  const lastRejectionPerStorageType = {};
  // Used by this middleware to work out *what* documents changed
  const lastStatePerStorageType = {};
  // If a document is loaded, modified, and unloaded
  let unloadedDocumentsToSaveById = {};

  const promisesPerStorageType = {};
  const queueImplementationStorageOperation = (
    storageType,
    callback: (storgae: StorageInterface) => Promise<any>
  ) => {
    const existingPromise = promisesPerStorageType[storageType] || Promise.resolve();
    const returnValue = existingPromise.then(() => callback(storages[storageType]));
    promisesPerStorageType[storageType] = returnValue.catch(() => {});
    return returnValue;
  };

  const doLoadAccounts = async () => {
    const item = await persistentStorage.getItem(accountsStorageKey);
    if (!item) return;
    const accounts = JSON.parse(item);

    dispatch(setAccounts(accounts));
  };

  const doSaveAccounts = async () => {
    const accounts = getAccounts(getState());
    await persistentStorage.setItem(accountsStorageKey, JSON.stringify(accounts));
  };

  const doLoadDocument = async (documentId: DocumentId) => {
    const getAccountStorageLocation = (state) => {
      const storageLocation = get(['documentStorageLocations', documentId], state);
      const account = getAccount(state, storageLocation.accountId);
      return { account, storageLocation };
    };

    const { id: previousAccountId, type } = getAccountStorageLocation(getState()).account;

    const document = await queueImplementationStorageOperation(type, async (storage) => {
      const { account, storageLocation } = getAccountStorageLocation(getState());

      if (account.id !== previousAccountId) {
        throw new Error('Document moved when attempting to load');
      }

      return await storage.loadDocument(account, storageLocation);
    });

    // document is sent without ids, and when we dispatch setDocumentContent, they are set
    dispatch(setDocumentContent(documentId, document));

    // Reconstruct the document from the state to get a document with ids
    const documentWithFixedIds = getDocument(getState(), documentId);
    lastDocumentById[documentId] = documentWithFixedIds;

    return documentWithFixedIds;
  };

  const doLoadDocumentsList = async (loadAccounts: bool) => {
    if (loadAccounts) await doLoadAccounts();

    const accounts = getAccounts(getState());

    await Promise.all(map(account => queueImplementationStorageOperation(account.type, storage => (
      storage.loadDocuments(account)
        .then(documents => dispatch(setDocumentStorageLocations(documents)))
    )), accounts));
  };

  const doUpdateStorageImplementation = async (storage: StorageInterface) => {
    const storageType = storage.type;
    const lastState = lastStatePerStorageType[storageType];
    const currentState = getState();

    const { added, changed, removed } = getChangedDocumentsForStorageType(
      currentState,
      lastState,
      storageType
    );
    // console.log({ added, changed, removed });

    const addedChanged = concat(added, changed);

    const addedChangedDocumentsById = flow(
      map(getDocument(currentState)),
      objFrom(addedChanged)
    )(addedChanged);

    const unloadedDocumentsForStorageById = pickBy((document: Document) => {
      const accountId = get(['documentStorageLocations', document.id, 'accountId'], currentState);
      const accountType = get(['accountTypes', accountId], currentState);
      return accountType === storageType;
    }, unloadedDocumentsToSaveById);

    const unloadedDocumentsWithChangesById = pickBy((document: Document) => (
      document.id && !isEqual(lastDocumentById[document.id], document)
    ), unloadedDocumentsForStorageById);

    const documentsToSaveById = assign(addedChangedDocumentsById, unloadedDocumentsWithChangesById);

    const getStorageOperation = curry((
      action: StorageAction,
      documentId: DocumentId
    ): StorageOperation => {
      const storageLocation = get(['documentStorageLocations', documentId], currentState);
      const account = getAccount(currentState, storageLocation.accountId);

      return {
        action,
        storageLocation,
        account,
        document: action === STORAGE_ACTION_SAVE
          ? getOrThrow(documentId, documentsToSaveById)
          : null,
        previousDocument: lastDocumentById[documentId],
        lastRejection: lastRejectionPerStorageType[storageType],
      };
    });

    const unloadedWithChanges = keys(unloadedDocumentsWithChangesById);
    const addedChangedUnloaded = concat(addedChanged, unloadedWithChanges);
    const storageOperations = concat(
      map(getStorageOperation(STORAGE_ACTION_SAVE), addedChangedUnloaded),
      map(getStorageOperation(STORAGE_ACTION_REMOVE), removed)
    );

    // Don't reset lastRejection, lastState, or lastDocument
    if (isEmpty(storageOperations)) return;

    try {
      const storageLocations = await storage.updateStore(storageOperations, currentState);

      const unloaded = keys(unloadedDocumentsForStorageById);
      const removedUnloaded = concat(removed, unloaded);

      lastDocumentById = flow(
        omit(removedUnloaded),
        assign(__, pick(addedChanged, documentsToSaveById))
      )(lastDocumentById);

      unloadedDocumentsToSaveById = omit(unloaded, unloadedDocumentsToSaveById);

      lastStatePerStorageType[storageType] = currentState;
      lastRejectionPerStorageType[storageType] = null;

      const documents = map('document', storageOperations);
      const documentIds = map('id', documents);

      const newStorageLocations = objFrom(documentIds, storageLocations);
      dispatch(updateDocumentStorageLocations(newStorageLocations));
    } catch (e) {
      // leave lastStatePerStorageType so we can pick up from there
      lastRejectionPerStorageType[storageType] = e;
    }
  };

  const ensureLastStateForStorageType = previousState => (storageType) => {
    if (!lastStatePerStorageType[storageType]) lastStatePerStorageType[storageType] = previousState;
  };

  const storageImplementationQueueMap = mapValues(storageImplementation => (
    debounce(() => {
      queueImplementationStorageOperation(
        storageImplementation.type,
        doUpdateStorageImplementation
      );
    }, storageImplementation.delay, { maxWait: storageImplementation.maxWait })
  ), storages);

  const queueUpdateStorageImplementation = (storageType) => {
    // Can we set a list of all storageTypes that will be updated so that between now and until the
    // debounce callback is called, we don't bother checking for the document changes for this type
    storageImplementationQueueMap[storageType]();
  };

  const flushStorageTypeUpdates = (storageType) => {
    storageImplementationQueueMap[storageType].flush();
  };

  const updateStorageImplementationImmediately = (storageType) => {
    queueUpdateStorageImplementation(storageType);
    flushStorageTypeUpdates(storageType);
  };

  return next => (action) => {
    const previousState: State = getState();
    const returnValue = next(action);

    if (action.type === LOAD_DOCUMENT) return doLoadDocument(action.documentId);
    if (action.type === LOAD_DOCUMENTS) return doLoadDocumentsList(true);
    if (action.type === FLUSH_STORAGE_TYPE_UPDATES) {
      flushStorageTypeUpdates(action.storageType);
      return returnValue;
    }

    const nextState: State = getState();

    if (accountsNeedsUpdating(nextState, previousState)) doSaveAccounts();

    const storageTypesByUpdatePriority = flow(
      groupBy(changePriorityForDocumentsOfType(nextState, previousState)),
      omit([UPDATE_PRIORITY_NO_CHANGES])
    )(storageTypes);
    const allChanges = flatten(values(storageTypesByUpdatePriority));

    const unlaodedDocumentIds = getUnloadedDocuments(nextState, previousState);
    if (!isEmpty(unlaodedDocumentIds)) {
      const unloadedDocuments = map(getDocument(previousState), unlaodedDocumentIds);
      unloadedDocumentsToSaveById =
        assign(unloadedDocumentsToSaveById, objFrom(unlaodedDocumentIds, unloadedDocuments));
    }

    forEach(ensureLastStateForStorageType(previousState), allChanges);
    forEach(
      updateStorageImplementationImmediately,
      storageTypesByUpdatePriority[UPDATE_PRIORITY_IMMEDIATE]
    );
    forEach(
      queueUpdateStorageImplementation,
      storageTypesByUpdatePriority[UPDATE_PRIORITY_LAZY]
    );

    return returnValue;
  };
};

// For testing
export const flushStorageTypeUpdates = (storageType: StorageType) =>
  ({ type: FLUSH_STORAGE_TYPE_UPDATES, storageType });
export const loadDocuments = () =>
  ({ type: LOAD_DOCUMENTS });
export const loadDocument = (documentId: DocumentId) =>
  ({ type: LOAD_DOCUMENT, documentId });
