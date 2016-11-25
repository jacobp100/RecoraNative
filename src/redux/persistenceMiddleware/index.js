// @flow
import {
  isEqual, some, get, isEmpty, filter, difference, intersection, every, overSome, forEach, map,
  curry, keys, keyBy, concat, flow, mapValues, without, getOr, omitBy, toPairs, invertBy, identity,
  includes, omit,
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
  State, Document, DocumentId, StorageType, StorageAction, StorageOperation, StorageInterface,
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

type UpdateRecord = {
  previousDocumentIds: DocumentId[],
  changesById: { [key:DocumentId]: Document },
};

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
// const UPDATE_PRIORITY_NO_CHANGES = 0;
const UPDATE_PRIORITY_LAZY = 1;
const UPDATE_PRIORITY_IMMEDIATE = 2;

const documentKeysToPersist = ['documentTitles', 'documentSections'];
const sectionKeysToPersist = ['sectionTitles', 'sectionTextInputs'];

const documentsForType = (state, storageType) => filter(id => {
  const accountId = get(['documentStorageLocations', id, 'accountId'], state);
  const accountType = get(['accountTypes', accountId], state);
  return accountType === storageType;
}, state.documents);

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

const unloadedDocuments = (
  nextState,
  previousState,
) => without(nextState.loadedDocuments, previousState.loadedDocuments);

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

const addedRemovedUnloadedChangedForStorageType = (
  nextState: State,
  previousState: State
) => (storageType: StorageType) => {
  const previousIdsocumentsForStorageType =
    documentsForType(previousState, storageType);
  const nextDocuIdsentsForStorageType =
    documentsForType(nextState, storageType);

  const args = [
    nextState,
    previousState,
    nextDocuIdsentsForStorageType,
    previousIdsocumentsForStorageType,
  ];

  return {
    added: addedDocuments(...args),
    removed: removedDocuments(...args),
    unloaded: unloadedDocuments(...args),
    changed: changedDocuments(...args),
  };
};

const changesUpdatePriorityPerStorageType = (nextState, previousState, storageTypes) => {
  const updatesByType = map(
    addedRemovedUnloadedChangedForStorageType(nextState, previousState),
    storageTypes
  );
  const updatesByStorageType = flow(
    objFrom(storageTypes),
    omitBy(every(isEmpty))
  )(updatesByType);

  const changesByStorageType = flow(
    mapValues(({ added, changed }) => concat(added, changed)),
    omitBy(isEmpty),
    mapValues(addedChanged => objFrom(addedChanged, map(getDocument(nextState), addedChanged)))
  )(updatesByStorageType);

  const updatePriorityByStorageType = mapValues(({ added, removed, unloaded }) => (
    (!isEmpty(added) || !isEmpty(removed) || !isEmpty(unloaded))
      ? UPDATE_PRIORITY_IMMEDIATE
      : UPDATE_PRIORITY_LAZY
  ), updatesByStorageType);
  const storageTypesByUpdatePriority = invertBy(identity, updatePriorityByStorageType);

  return { changesByStorageType, storageTypesByUpdatePriority };
};

const documentIdsForStorageType = (state, storageType) => filter(
  (documentId) => {
    const accountId = get(['documentStorageLocations', documentId, 'accountId'], state);
    const accountType = get(['accountTypes', accountId], state);
    return accountType === storageType;
  },
  getOr([], 'documents', state)
);

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
  const lastDocumentById = {};
  // Used by storage implementation to attempt recovery
  const lastRejectionPerStorageType = {};
  // Used by this middleware to work out *what* documents changed
  const updateRecordsPerStorageType: { [key:StorageType]: UpdateRecord } = {};

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
    const currentState = getState();

    const currentDocumentIds = documentIdsForStorageType(currentState, storageType);
    const {
      previousDocumentIds, changesById: possibleChanges,
    } = updateRecordsPerStorageType[storageType];

    const removed = without(currentDocumentIds, previousDocumentIds);

    const changesById = flow(
      omit(removed),
      omitBy((document) => (
        document.id &&
          includes(document.id, previousDocumentIds) && // Omit newly added documents
          isEqual(lastDocumentById[document.id], document) // Omit unchanged documents
      ))
    )(possibleChanges);

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
          ? getOrThrow(documentId, changesById)
          : null,
        previousDocument: lastDocumentById[documentId],
        lastRejection: lastRejectionPerStorageType[storageType],
      };
    });

    const storageOperations = concat(
      map(getStorageOperation(STORAGE_ACTION_SAVE), keys(changesById)),
      map(getStorageOperation(STORAGE_ACTION_REMOVE), removed)
    );

    // Don't reset lastRejection, lastState, or lastDocument
    if (isEmpty(storageOperations)) return;

    try {
      const storageLocations = await storage.updateStore(storageOperations, currentState);

      Object.assign(lastDocumentById, changesById);
      updateRecordsPerStorageType[storageType] = {
        previousDocumentIds: currentDocumentIds,
        changesById: {},
      };
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

  const initialState = getState();
  forEach((storageType) => {
    const previousDocumentIds = documentIdsForStorageType(initialState, storageType);
    const changesById = {};
    updateRecordsPerStorageType[storageType] = { previousDocumentIds, changesById };
  }, storageTypes);

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

    const { changesByStorageType, storageTypesByUpdatePriority } =
      changesUpdatePriorityPerStorageType(nextState, previousState, storageTypes);

    forEach(([storageType, changesById]) => {
      Object.assign(updateRecordsPerStorageType[storageType].changesById, changesById);
    }, toPairs(changesByStorageType));

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

export const loadDocuments = () =>
  ({ type: LOAD_DOCUMENTS });
export const loadDocument = (documentId: DocumentId) =>
  ({ type: LOAD_DOCUMENT, documentId });
// For testing
export const flushStorageTypeUpdates = (storageType: StorageType) =>
  ({ type: FLUSH_STORAGE_TYPE_UPDATES, storageType });
