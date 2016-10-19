// @flow
import {
  __, concat, map, fromPairs, isEmpty, isEqual, compact, zip, some, propertyOf, over, flow, reduce,
  set, mapValues, toPairs, update, get, curry, assign,
} from 'lodash/fp';
import {
  getAddedChangedRemovedSectionItems, getPromiseStorage, STORAGE_ACTION_SAVE, STORAGE_ACTION_REMOVE,
  STORAGE_LOCAL,
} from '../util';
import { append } from '../../util';
import type { PromiseStorage, Document, StorageInterface, LocalStorageLocation } from '../util'; // eslint-disable-line
import type { DocumentId, SectionId, StorageOperation } from '../../types';


/*
A document is saved as,

key: 'document:document-1'
value: {
  documentId: 'document-1',
  documentTitle: 'Document',
  documentSections: ['section-1', 'section-2'],
  sectionTitles: ['Section 1', 'Section 2'],
  storageLocations: [
    'document:document-1/section:section-1',
    'document:document-1/section:section-2'
  ],
}

Where the key is that defined in storageLocation (type: LocalStorageLocation), and the
storageLocations are arbitrary, but each entry in storageLocations corresponds to the same element
in documentSections. storageLocations will point to keys in the localStorageLocation.

Each section is saved as,

key: 'document:document-1/section:section-1'
value: ['3 + 4', '1 meter to yards']

The value is just the sectionTextInputs of the section.

It's done this way to minimise writes: you can add, change, and remove sections without writing
the values of other sections.

Also, we use the Patch type to get all write and remove operations before actually writing, again
to minimise reads, writes, and removes. When you load documents, you have one initial read to get
all the DocumentDescriptors, and then optionally one read and optionally one write to save
everything in one go.
*/

const simpleDocumentKeys = ['documentId', 'documentTitle', 'documentSections', 'sectionTitles'];

type DocumentDescriptor = {
  documentId: DocumentId,
  documentTitle: string,
  documentSections: SectionId[],
  sectionTitles: { [key:SectionId]: string },
  storageLocations: string[],
};

type Patch = {
  documentDescriptors: { [key:DocumentId]: DocumentDescriptor },
  storageLocations: LocalStorageLocation,
  keysToRemove: string[],
  objToSet: { [key:string]: any },
};

const getStorageLocationMap = (storageLocations: string[], documentSections: SectionId[]) =>
  fromPairs(zip(documentSections, storageLocations));

const getStoragePairs = flow(
  mapValues(JSON.stringify),
  toPairs
);

const getDescriptorForDocument = (document: Document, patch: Patch) =>
  get(['documentDescriptors', document.documentId], patch);

const createUpdateDocumentDescriptor: (
  storageOperation: StorageOperation,
  storageLocation: LocalStorageLocation,
  patch: Patch
) => Patch = curry((
  storageOperation: StorageOperation,
  storageLocation: LocalStorageLocation,
  patch: Patch
): Patch => {
  const getSectionStorageKey = (sectionId: SectionId) =>
    `${storageLocation.storageKey}/section:${sectionId}`;

  const { document } = storageOperation;
  const existingDocumentDescriptor = getDescriptorForDocument(document, patch);

  const existingStorageMap = getStorageLocationMap(
    get('storageLocations', existingDocumentDescriptor),
    get('documentSections', existingDocumentDescriptor)
  );

  const { documentId, documentTitle, documentSections, sectionTitles } = document;
  const storageLocations = map(sectionId => (
    (sectionId in existingStorageMap)
      ? existingStorageMap[sectionId]
      : getSectionStorageKey(sectionId)
  ), documentSections);

  const newDocumentDescriptor: DocumentDescriptor =
    { documentId, documentTitle, documentSections, sectionTitles, storageLocations };

  return flow(
    update('storageLocations', append(storageLocation)),
    set(['objToSet', storageLocation.storageKey], newDocumentDescriptor),
    set(['documentDescriptors', document.documentId], newDocumentDescriptor),
  )(patch);
});

const updateDocumentDescriptorIfChanged: (
  storageOperation: StorageOperation,
  patch: Patch
) => Patch = curry((
  storageOperation: StorageOperation,
  patch: Patch
): Patch => {
  const { document, previousDocument, storageLocation } = storageOperation;

  const documentDescriptorDidChange = Boolean(previousDocument) && some(key => (
    !isEqual(document[key], previousDocument[key])
  ), simpleDocumentKeys);

  return documentDescriptorDidChange
    ? createUpdateDocumentDescriptor(storageLocation, storageOperation, patch)
    : update('storageLocations', append(storageLocation), patch);
});

const saveSections: (
  documentSections: SectionId[],
  document: Document,
  patch: Patch
) => Patch = curry((
  documentSections: SectionId[],
  document: Document,
  patch: Patch
): Patch => {
  const documentDescriptor = getDescriptorForDocument(document, patch);
  const { storageLocations } = documentDescriptor;

  const sectionStorageMap = getStorageLocationMap(storageLocations, documentSections);

  const { sectionTextInputs } = document;

  const storagePairs = map(over([
    propertyOf(sectionStorageMap),
    propertyOf(sectionTextInputs),
  ]), documentSections);
  const storageObj = fromPairs(storagePairs);

  return update('objToSet', assign(__, storageObj), patch);
});

const removeSections: (
  documentSections: SectionId[],
  document: Document,
  patch: Patch
) => Patch = curry((
  documentSections: SectionId[],
  document: Document,
  patch: Patch
): Patch => {
  const documentDescriptor = getDescriptorForDocument(document, patch);
  const { storageLocations } = documentDescriptor;

  const sectionStorageMap = getStorageLocationMap(storageLocations, documentSections);
  const keysToRemove = map(propertyOf(sectionStorageMap), documentSections);

  return update('keysToRemove', concat(keysToRemove), patch);
});

const calculateMinimumSaveRemoveSections: (
  storageOperation: StorageOperation,
  patch: Patch,
) => Patch = curry((
  storageOperation: StorageOperation,
  patch: Patch,
): Patch => {
  const { document, previousDocument } = storageOperation;
  const { documentSections, sectionTextInputs } = document;

  if (!previousDocument) {
    return saveSections(documentSections, storageOperation, patch);
  }

  const { added, changed, removed } = getAddedChangedRemovedSectionItems(
    sectionTextInputs,
    previousDocument.sectionTextInputs
  );
  const addedChanged = concat(added, changed);

  return flow(
    saveSections(addedChanged, storageOperation),
    removeSections(removed, storageOperation)
  );
});

const applyCreateDocumentPatch = (
  patch: Patch,
  storageOperation: StorageOperation
): Patch => {
  const getDocumentStorageKey = (documentId: DocumentId) => `document:${documentId}`;

  const { documentId, documentSections } = storageOperation.document;
  const storageLocation = { type: STORAGE_LOCAL, storageKey: getDocumentStorageKey(documentId) };

  return flow(
    createUpdateDocumentDescriptor(storageLocation, storageOperation),
    saveSections(documentSections, storageOperation)
  )(patch);
};

const applySavePatch = (
  patch: Patch,
  storageOperation: StorageOperation
): Patch => {
  if (!getDescriptorForDocument(storageOperation.document, patch)) {
    return applyCreateDocumentPatch(patch, storageOperation);
  }
  return flow(
    updateDocumentDescriptorIfChanged(storageOperation),
    calculateMinimumSaveRemoveSections(storageOperation)
  )(patch);
};

const applyRemovePatch = (
  patch: Patch,
  storageOperation: StorageOperation
): Patch => {
  const { document } = storageOperation;
  const { documentSections } = storageOperation;

  return flow(
    removeSections(documentSections, document),
    update('keysToRemove', append(storageOperation.storageLocation.storageKey)),
    update('storageLocations', append(null))
  )(patch);
};


const storageModes = {
  [STORAGE_ACTION_SAVE]: applySavePatch,
  [STORAGE_ACTION_REMOVE]: applyRemovePatch,
};

export default (storage: PromiseStorage = getPromiseStorage()): StorageInterface => {
  const loadDocument = async (storageLocation: LocalStorageLocation): Document => {
    const item = storageLocation.storageKey
      ? await storage.getItem(storageLocation.storageKey)
      : null;
    const documentDescriptor: ?DocumentDescriptor = item ? JSON.parse(item) : null;

    if (!documentDescriptor) throw new Error('Failed to load document');

    const { documentId, documentTitle, documentSections, sectionTitles, storageLocations } =
      documentDescriptor;

    const sectionTextInputPairs = await storage.getItems(storageLocations);
    // Get correct ids
    const sectionTextInputValues = map(pair => pair[1], sectionTextInputPairs);
    const sectionTextInputs = fromPairs(zip(documentSections, sectionTextInputValues));

    return { documentId, documentTitle, documentSections, sectionTitles, sectionTextInputs };
  };

  const updateStore = async (storageOperations: StorageOperation[]): LocalStorageLocation[] => {
    const storageLocations = map('storageLocation', storageOperations);
    const storageLocationKeys = compact(map('storageKey', storageLocations));

    const documentDescriptorPairs = !isEmpty(storageLocationKeys)
      ? await storage.multiGet(compact(storageLocationKeys))
      : [];
    const documentDescriptorMap = fromPairs(documentDescriptorPairs);

    const documents = map('document', storageOperations);
    const documentIds = map('documentId', documents);

    const documentDescriptors = flow(
      map(documentId => [documentId, documentDescriptorMap(documentId)]),
      fromPairs
    )(documentIds);

    const patch: Patch = reduce((patch, storageOperation) => (
      storageModes[storageOperation.type](patch, storageOperation)
    ), ({
      documentDescriptors,
      storageLocations: [],
      keysToRemove: [],
      objToSet: {},
    }: Patch), storageOperations);

    const { keysToRemove, objToSet } = patch;

    const promises = compact([
      !isEmpty(keysToRemove) ? storage.multiRemove(keysToRemove) : null,
      !isEmpty(objToSet) ? storage.multiSet(getStoragePairs(objToSet)) : null,
    ]);

    if (!isEmpty(promises)) await Promise.all(promises);

    return patch.storageLocations;
  };

  return {
    type: 'local',
    delay: 1000,
    maxWait: 2000,
    loadDocument,
    updateStore,
  };
};
