// @flow
import {
  isEqual, some, get, isEmpty, pick, filter, difference, intersection, every, overSome, forEach,
  mapValues, curry, keys, keyBy, map, concat,
} from 'lodash/fp';
import { debounce } from 'lodash';
import { getPromiseStorage, STORAGE_ACTION_SAVE, STORAGE_ACTION_REMOVE } from '../util';
import { mergeState } from '../index';
import asyncStorageImplementation from './asyncStorageImplementation';
import type { // eslint-disable-line
  PromiseStorage, Document, StorageType, StorageAction, StorageOperation,
} from '../util';
import type { State, DocumentId } from '../../types';


const LOAD_DOCUMENTS = 'persistence-middleware:LOAD_DOCUMENTS';
const LOAD_DOCUMENT = 'persistence-middleware:LOAD_DOCUMENT';

const documentsKey = 'documents';
const keysToSave = ['documents', 'documentStorageLocations', 'documentTitles'];

const documentsListNeedsUpdating = (nextState, previousState) => {
  const hasChange = some(key => !isEqual(nextState[key], previousState[key]), keysToSave);
  return hasChange;
};

const getPatchForDocument = (document: Document) => ({
  documentTitles: { [document.documentId]: document.documentTitle },
  documentSections: { [document.documentId]: document.documentSections },
  sectionTitles: document.sectionTitles,
  sectionTextInputs: document.sectionTextInputs,
});

const getDocumentFromState = (documentId: DocumentId, state: State): Document => ({
  documentTitle: state.documentTitles[documentId],
  documentSection: state.documentSections[documentId],
  sectionTitles: pick(state.documentSections[documentId], state.sectionTitles),
  sectionTextInputs: pick(state.documentSections[documentId], state.sectionTextInputs),
});

const documentKeysToPersist = ['documentStorageLocations', 'documentTitles', 'documentSections'];
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

  const valuesChangedBetweenStates = (keys, id) => key =>
    !every(isEqual(nextState[key][id], previousState[key][id]), keys);

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
    dispatch(mergeState(getPatchForDocument(document)));

    return document;
  };

  const doLoadDocumentsList = async () => {
    const savedDocuments = await storage.getItem(documentsKey);
    if (!savedDocuments) return;
    const patch = JSON.parse(savedDocuments);
    dispatch(mergeState(patch));
  };

  const doSaveDocumentsList = async () => {
    const { documents, documentTitles } = getState();
    await storage.setItem(documentsKey, JSON.stringify({ documents, documentTitles }));
  };

  const queueSaveDocumentsList = debounce(() => {
    queueStorageOperation(doSaveDocumentsList);
  }, 1000, { maxWait: 2000 });

  const doUpdateStorageImplementation = async (storageType) => {
    const lastState = lastStatePerStorageType[storageType];
    const currentState = getState();

    const { added, changed, removed } = getChangedDocumentsForStorageType(
      lastState,
      currentState,
      storageType
    );

    const addedChanged = concat(added, changed);

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
      if (!isEmpty(storageOperations)) {
        await storages[storageType].updateStore(storageOperations);
      }

      lastStatePerStorageType[storageType] = currentState;
      lastRejectionPerStorageType[storageType] = null;
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
