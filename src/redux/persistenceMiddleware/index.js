// @flow
import { isEqual, some, get, find } from 'lodash/fp';
import { debounce } from 'lodash';
import { getPromiseStorage } from '../util';
import { mergeState } from '../index';
import asyncStorageImplementation from './asyncStorageImplementation';
import type { PromiseStorage } from '../util'; // eslint-disable-line
import type { State, DocumentId } from '../../types';


const LOAD_DOCUMENTS = 'persintance-middleware:LOAD_DOCUMENTS';
const LOAD_DOCUMENT = 'persintance-middleware:LOAD_DOCUMENT';

const documentsKey = 'documents';
const keysToSave = ['documents', 'documentStorageLocations', 'documentTitles'];

export default (
  storage: PromiseStorage = getPromiseStorage(),
  implementations = [asyncStorageImplementation(storage)]
): any => ({ getState, dispatch }) => {
  let storagePromise = Promise.resolve();

  const promisesPerDocumentId = {};
  const previousDocumentPerDocumentId = {};
  const previousRejectionPerDocumentId = {};

  const queueStorageOperation = callback => {
    storagePromise = storagePromise.then(callback).catch(() => {});
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

  const documentsListNeedsUpdating = (nextState, previousState) => {
    const hasChange = some(key => !isEqual(nextState[key], previousState[key]), keysToSave);
    return hasChange;
  };

  const doLoadDocument = (documentId) => {
    const storageLocation = get(['documentStorageLocations', documentId], getState());
    const implementationType = get('type', storageLocation);
    const implementation = find({ type: implementationType }, implementations);
    if (!implementation) return;

    const existingPromise = promisesPerDocumentId[documentId] || Promise.resolve();
    promisesPerDocumentId[documentId] = existingPromise
      .then(() => implementation.loadDocument(storageLocation))
      .then((document) => {
        dispatch(setDocument(document));
      }, () => {});
  };

  const doSaveDocument = (document) => {
    const previousDocument = previousDocumentPerDocumentId[documentId];
    const previousRejection = previousRejectionPerDocumentId[documentId];

    const existingPromise = promisesPerDocumentId[documentId] || Promise.resolve();
    promisesPerDocumentId[documentId] = existingPromise
      .then(() => implementation.saveDocument(document, previousDocument, previousRejection))
      .catch(() => {});
  };

  const queueDoSaveDocumentsList = debounce(() => {
    queueStorageOperation(doSaveDocumentsList);
  }, 1000, { maxWait: 2000 });

  return next => (action) => {
    const previousState: State = getState();
    const returnValue = next(action);

    if (action.type === LOAD_DOCUMENTS) {
      queueStorageOperation(doLoadDocumentsList);
    } if (action.type === LOAD_DOCUMENT) {
      doLoadDocument(action.documentId);
    } else {
      const nextState: State = getState();
      if (documentsListNeedsUpdating(nextState, previousState)) queueDoSaveDocumentsList();
    }

    return returnValue;
  };
};

export const loadDocuments = () =>
  ({ type: LOAD_DOCUMENTS });
export const loadDocument = (documentId: DocumentId) =>
  ({ type: LOAD_DOCUMENT, documentId });
