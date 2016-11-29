// @flow
import {
  isEqual, some, keys, isEmpty, filter, without, intersection, every, overSome, forEach, map, omit,
  curry, get, keyBy, concat, flow, mapValues, getOr, omitBy, toPairs, invertBy, identity, includes,
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
  changesForId: { [key:DocumentId]: Document },
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

const documentsWithinAccountsWithAccountType = (
  currentState,
  accounts,
  storageType
) => filter(id => {
  const accountId = get(['documentStorageLocations', id, 'accountId'], currentState);
  if (!includes(accountId, accounts)) return false;
  const accountType = get(['accountTypes', accountId], currentState);
  return accountType === storageType;
}, currentState.documents);

const addedDocuments = (
  nextState,
  previousState,
  nextDocuments,
  previousDocuments
) => {
  // Document wasn't loaded via loadDocuments
  const documentIsNew = documentId => !(documentId in previousState.documentStorageLocations);
  return filter(documentIsNew, without(previousDocuments, nextDocuments));
};

// When deleting an account, we delete the documents too---but these don't count as removals
const removedDocuments = (
  nextState,
  previousState,
  nextDocuments,
  previousDocuments
) => without(nextDocuments, previousDocuments);

const unloadedDocuments = (
  nextState,
  previousState,
  nextDocuments,
) => intersection(
  nextDocuments,
  without(nextState.loadedDocuments, previousState.loadedDocuments)
);

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
  const { accounts } = nextState;
  const previousDocumentIdsForStorageType =
    documentsWithinAccountsWithAccountType(previousState, accounts, storageType);
  const nextDocumentIdsForStorageType =
    documentsWithinAccountsWithAccountType(nextState, accounts, storageType);

  const args = [
    nextState,
    previousState,
    nextDocumentIdsForStorageType,
    previousDocumentIdsForStorageType,
  ];

  return {
    added: addedDocuments(...args),
    removed: removedDocuments(...args),
    unloaded: unloadedDocuments(...args),
    changed: changedDocuments(...args),
  };
};

const changesUpdatePriorityForStorageType = (nextState, previousState, storageTypes) => {
  const updatesForType = map(
    addedRemovedUnloadedChangedForStorageType(nextState, previousState),
    storageTypes
  );
  const updatesForStorageType = flow(
    objFrom(storageTypes),
    omitBy(every(isEmpty))
  )(updatesForType);

  const changesForStorageType = flow(
    mapValues(({ added, changed }) => concat(added, changed)),
    omitBy(isEmpty),
    mapValues(addedChanged => objFrom(addedChanged, map(getDocument(nextState), addedChanged)))
  )(updatesForStorageType);

  const updatePriorityForStorageType = mapValues(({ added, removed, unloaded }) => (
    (!isEmpty(added) || !isEmpty(removed) || !isEmpty(unloaded))
      ? UPDATE_PRIORITY_IMMEDIATE
      : UPDATE_PRIORITY_LAZY
  ), updatesForStorageType);
  const storageTypesForUpdatePriority = invertBy(identity, updatePriorityForStorageType);

  return { changesForStorageType, storageTypesForUpdatePriority };
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
  const lastDocumentForId = {};
  // Used by storage implementation to attempt recovery
  const lastRejectionForStorageType = {};
  // Used by this middleware to work out *what* documents changed
  const updateRecordsForStorageType: { [key:StorageType]: UpdateRecord } = {};

  const queuePromiseForStorageType = {};
  const queueImplementationStorageOperation = (
    storageType,
    callback: (storgae: StorageInterface) => Promise<any>
  ) => {
    const existingPromise = queuePromiseForStorageType[storageType] || Promise.resolve();
    const returnValue = existingPromise.then(() => callback(storages[storageType]));
    queuePromiseForStorageType[storageType] = returnValue.catch(() => {});
    return returnValue;
  };

  let didLoadAccounts = false;

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
    const accountAndStorageLocation = (state) => {
      const storageLocation = get(['documentStorageLocations', documentId], state);
      const account = getAccount(state, storageLocation.accountId);
      return { account, storageLocation };
    };

    const { id: previousAccountId, type } = accountAndStorageLocation(getState()).account;

    const document = await queueImplementationStorageOperation(type, async (storage) => {
      const { account, storageLocation } = accountAndStorageLocation(getState());

      if (account.id !== previousAccountId) {
        throw new Error('Document moved when attempting to load');
      }

      return await storage.loadDocument(account, storageLocation);
    });

    // document is sent without ids, and when we dispatch setDocumentContent, they are set
    dispatch(setDocumentContent(documentId, document));

    // Reconstruct the document from the state to get a document with ids
    const documentWithFixedIds = getDocument(getState(), documentId);
    lastDocumentForId[documentId] = documentWithFixedIds;

    return documentWithFixedIds;
  };

  const doLoadDocumentsList = async () => {
    if (!didLoadAccounts) {
      await doLoadAccounts();
      didLoadAccounts = true;
    }

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
      previousDocumentIds, changesForId: possibleChanges,
    } = updateRecordsForStorageType[storageType];

    const removed = without(currentDocumentIds, previousDocumentIds);

    const changesForId = flow(
      omit(removed),
      omitBy((document) => (
        document.id &&
          includes(document.id, previousDocumentIds) && // Omit newly added documents
          isEqual(lastDocumentForId[document.id], document) // Omit unchanged documents
      ))
    )(possibleChanges);

    const storageOperation = curry((
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
          ? getOrThrow(documentId, changesForId)
          : null,
        previousDocument: lastDocumentForId[documentId],
        lastRejection: lastRejectionForStorageType[storageType],
      };
    });

    const storageOperations = concat(
      map(storageOperation(STORAGE_ACTION_SAVE), keys(changesForId)),
      map(storageOperation(STORAGE_ACTION_REMOVE), removed)
    );

    // Don't reset lastRejection, lastState, or lastDocument
    if (isEmpty(storageOperations)) return;

    try {
      const storageLocations = await storage.updateStore(storageOperations, currentState);

      Object.assign(lastDocumentForId, changesForId);
      updateRecordsForStorageType[storageType] = {
        previousDocumentIds: currentDocumentIds,
        changesForId: {},
      };
      lastRejectionForStorageType[storageType] = null;

      const documents = map('document', storageOperations);
      const documentIds = map('id', documents);

      const newStorageLocations = objFrom(documentIds, storageLocations);
      dispatch(updateDocumentStorageLocations(newStorageLocations));
    } catch (e) {
      // Leave updateRecordsForStorageType so we can continue from there
      lastRejectionForStorageType[storageType] = e;
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
    const changesForId = {};
    updateRecordsForStorageType[storageType] = { previousDocumentIds, changesForId };
  }, storageTypes);

  return next => (action) => {
    const previousState: State = getState();
    const returnValue = next(action);

    if (action.type === LOAD_DOCUMENT) return doLoadDocument(action.documentId);
    if (action.type === LOAD_DOCUMENTS) return doLoadDocumentsList();
    if (action.type === FLUSH_STORAGE_TYPE_UPDATES) {
      flushStorageTypeUpdates(action.storageType);
      return returnValue;
    }

    const nextState: State = getState();

    if (accountsNeedsUpdating(nextState, previousState)) doSaveAccounts();

    const { changesForStorageType, storageTypesForUpdatePriority } =
      changesUpdatePriorityForStorageType(nextState, previousState, storageTypes);

    forEach(([storageType, changesForId]) => {
      Object.assign(updateRecordsForStorageType[storageType].changesForId, changesForId);
    }, toPairs(changesForStorageType));

    forEach(
      updateStorageImplementationImmediately,
      storageTypesForUpdatePriority[UPDATE_PRIORITY_IMMEDIATE]
    );
    forEach(
      queueUpdateStorageImplementation,
      storageTypesForUpdatePriority[UPDATE_PRIORITY_LAZY]
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
