// @flow
import {
  isEqual, some, get, isEmpty, filter, difference, intersection, every, overSome, propertyOf,
  forEach, mapValues, curry, keys, keyBy, map, concat, fromPairs, zip, without, includes,
} from 'lodash/fp';
import { debounce } from 'lodash';
import { append } from '../../util';
import { getPromiseStorage, STORAGE_ACTION_SAVE, STORAGE_ACTION_REMOVE } from '../util';
import { mergeState, setDocuments, setDocument } from '../index';
import asyncStorageImplementation from './asyncStorageImplementation';
import type { // eslint-disable-line
  PromiseStorage, Document, StorageType, StorageAction, StorageOperation,
} from '../util';
import type { State, DocumentId } from '../../types';

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

const LOAD_DOCUMENTS = 'persistence-middleware:LOAD_DOCUMENTS';
const LOAD_DOCUMENT = 'persistence-middleware:LOAD_DOCUMENT';

const documentsStorageKey = 'documents';
const keysToCheckForSave = ['documents', 'documentStorageLocations', 'documentTitles'];

const documentsListNeedsUpdating = (nextState, previousState) => (
  some(key => !isEqual(nextState[key], previousState[key]), keysToCheckForSave)
);

const getDocumentFromState = (documentId: DocumentId, state: State): ?Document => (
  includes(documentId, state.documents) ? {
    id: documentId,
    title: state.documentTitles[documentId],
    sections: map(sectionId => ({
      id: sectionId,
      title: get(['sectionTitles', sectionId], state),
      textInputs: get(['sectionTextInputs', sectionId], state),
    }), state.documentSections[documentId]),
  } : null
);

// TODO: if a storage location changes by type, persist; change in any other way, ignore
const documentKeysToPersist = ['documentTitles', 'documentSections'];
const sectionKeysToPersist = ['sectionTitles', 'sectionTextInputs'];

const documentsForType = (state, storageType) => filter(documentId => (
  get(['documentStorageLocations', documentId, 'type'], state) === storageType
), state.decuments);

const addedDocuments = (nextDocuments, previousDocuments) =>
  difference(nextDocuments, previousDocuments);

const removedDocuments = (nextDocuments, previousDocuments) =>
  difference(nextDocuments, previousDocuments);

const changedDocuments = (
  nextState,
  previousState,
  nextDocuments,
  previousDocuments,
) => {
  const possiblyChanged = intersection(nextDocuments, previousDocuments);

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

const hasDocumentChangesForStorageType = (
  nextState: State,
  previousState: State,
) => (storageType: StorageType) => {
  const previousDocumentsForStorageType =
    documentsForType(storageType, previousState.decuments);
  const nextDocumentsForStorageType =
    documentsForType(storageType, nextState.decuments);

  const added = addedDocuments(nextDocumentsForStorageType, previousDocumentsForStorageType);
  if (!isEmpty(added)) return true;

  const removed = removedDocuments(nextDocumentsForStorageType, previousDocumentsForStorageType);
  if (!isEmpty(removed)) return true;

  const changed = changedDocuments(
    nextState,
    previousState,
    nextDocumentsForStorageType,
    previousDocumentsForStorageType,
  );
  return !isEmpty(changed);
};

const getChangedDocumentsForStorageType = (
  nextState: State,
  previousState: State,
  storageType: StorageType,
) => {
  const previousDocumentsForStorageType =
    documentsForType(storageType, previousState.decuments);
  const nextDocumentsForStorageType =
    documentsForType(storageType, nextState.decuments);

  return {
    added: addedDocuments(nextDocumentsForStorageType, previousDocumentsForStorageType),
    removed: removedDocuments(nextDocumentsForStorageType, previousDocumentsForStorageType),
    changed: changedDocuments(
      nextState,
      previousState,
      nextDocumentsForStorageType,
      previousDocumentsForStorageType,
    ),
  };
};

export default (
  storage: PromiseStorage = getPromiseStorage(),
  storageImplementations = [asyncStorageImplementation(storage)]
): any => ({ getState, dispatch }) => {
  const storages = keyBy('type', storageImplementations);
  const storageTypes = keys(storages);

  let storagePromise = Promise.resolve();
  const promisesPerStorageType = {};

  const lastStatePerStorageType = {};
  const lastRejectionPerStorageType = {};
  // When a document is loaded, it is put in the state, so sections and stuff are created.
  // This normally triggers a save, when it shouldn't, so use this as a workaround.
  const loadedDocumentsPerStorageType = {};

  const queueStorageOperation = callback => {
    storagePromise = storagePromise.then(callback, () => {});
  };

  const queueImplementationStorageOperation = (storageType, callback) => {
    const existingPromise = promisesPerStorageType[storageType] || Promise.resolve();
    const returnValue = existingPromise.then(() => callback(storageType));
    promisesPerStorageType[storageType] = returnValue.catch(() => {});
    return returnValue;
  };

  const doLoadDocument = async (documentId) => {
    const storageLocation = get(['documentStorageLocations', documentId], getState());
    const storageType = get('type', storageLocation);
    const storageImplementation = storages[storageType];

    if (!storageImplementation) {
      throw new Error(`Cannot load document from ${storageType}`);
    }

    const document = await queueImplementationStorageOperation(storageType, () => (
      storageImplementation.loadDocument(storageLocation)
    ));

    loadedDocumentsPerStorageType[storageType] =
      append(document.id, loadedDocumentsPerStorageType[storageType]);

    dispatch(setDocument(document));

    return document;
  };

  const doLoadDocumentsList = async () => {
    const savedDocuments = await storage.getItem(documentsStorageKey);
    if (!savedDocuments) return;
    const documentRecords = JSON.parse(savedDocuments);
    dispatch(setDocuments(documentRecords));
  };

  const doSaveDocumentsList = async () => {
    const { documents, documentStorageLocations } = getState();
    const documentRecords = map(propertyOf(documentStorageLocations), documents);
    await storage.setItem(documentsStorageKey, JSON.stringify(documentRecords));
  };

  const queueSaveDocumentsList = debounce(() => {
    queueStorageOperation(doSaveDocumentsList);
  }, 1000, { maxWait: 2000 });

  const doUpdateStorageImplementation = async (storageType) => {
    const lastState = lastStatePerStorageType[storageType];
    const currentState = getState();
    const { documents } = currentState;

    const addedChangedRemoved = getChangedDocumentsForStorageType(
      lastState,
      currentState,
      storageType
    );

    const onlyDocumentsInState = intersection(documents);
    const { added, changed, removed } = mapValues(onlyDocumentsInState, addedChangedRemoved);

    const addedChanged = without(
      loadedDocumentsPerStorageType[storageType] || [],
      concat(added, changed)
    );

    const getStorageOperation = curry((
      action: StorageAction,
      documentId: DocumentId
    ): StorageOperation => ({
      action,
      storageLocation: get(['documentStorageLocations', documentId], currentState),
      document: getDocumentFromState(documentId, currentState),
      previousDocument: getDocumentFromState(documentId, lastState),
      lastRejection: lastRejectionPerStorageType[storageType],
    }));

    const storageOperations = concat(
      map(getStorageOperation(STORAGE_ACTION_SAVE), addedChanged),
      map(getStorageOperation(STORAGE_ACTION_REMOVE), removed)
    );

    try {
      const storageLocations = !isEmpty(storageOperations)
        ? await storages[storageType].updateStore(storageOperations)
        : null;

      lastStatePerStorageType[storageType] = currentState;
      lastRejectionPerStorageType[storageType] = null;
      loadedDocumentsPerStorageType[storageType] = [];

      if (storageLocations) {
        const documents = map('document', storageOperations);
        const documentIds = map('id', documents);

        const storageLocationPatch = fromPairs(zip(documentIds, storageLocations));
        const patch = { documentStorageLocations: storageLocationPatch };

        dispatch(mergeState(patch));
      }
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

  const queueUpdateStorageImplementation = previousState => storageType => {
    if (!lastStatePerStorageType[storageType]) {
      lastStatePerStorageType[storageType] = previousState;
    }

    // Can we set a list of all storageTypes that will be updated so that between now and until the
    // debounce callback is called, we don't bother checking for the document changes for this type
    storageImplementationQueueMap[storageType]();
  };

  return next => (action) => {
    const previousState: State = getState();
    const returnValue = next(action);

    if (action.type === LOAD_DOCUMENT) return doLoadDocument(action.documentId);
    if (action.type === LOAD_DOCUMENTS) return queueStorageOperation(doLoadDocumentsList);

    const nextState: State = getState();

    if (documentsListNeedsUpdating(nextState, previousState)) queueSaveDocumentsList();

    const storageTypesWithChanges = filter(
      hasDocumentChangesForStorageType(nextState, previousState),
      storageTypes
    );
    forEach(queueUpdateStorageImplementation(previousState), storageTypesWithChanges);

    return returnValue;
  };
};

export const loadDocuments = () =>
  ({ type: LOAD_DOCUMENTS });
export const loadDocument = (documentId: DocumentId) =>
  ({ type: LOAD_DOCUMENT, documentId });
