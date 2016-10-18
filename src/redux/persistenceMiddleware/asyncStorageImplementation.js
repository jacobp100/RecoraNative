// @flow
import {
  concat, map, fromPairs, isEmpty, isEqual, compact, zip, some, propertyOf, over, flow,
} from 'lodash/fp';
import { getAddedChangedRemovedSectionItems, getPromiseStorage } from '../util';
import type { PromiseStorage, Document, StorageInterface, LocalStorageLocation } from '../util'; // eslint-disable-line
import type { DocumentId, SectionId } from '../../types';


/*
TL;DR

A document is saved as,

key: 'document:document-1'
value: {
  id: 'document-1',
  title: 'Document',
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
*/

const simpleDocumentKeys = ['id', 'title', 'documentSections', 'sectionTitles'];

type DocumentDescriptor = {
  id: DocumentId,
  title: string,
  documentSections: SectionId[],
  sectionTitles: { [key:SectionId]: string },
  storageLocations: string[],
};

const getStorageLocationMap = (storageLocations: string[], documentSections: SectionId[]) =>
  fromPairs(zip(documentSections, storageLocations));


export default (storage: PromiseStorage = getPromiseStorage()): StorageInterface => {
  const getDocumentDescriptor = async (
    storageLocation: LocalStorageLocation
  ): ?DocumentDescriptor => {
    const item = await storage.getItem(storageLocation.storageKey);
    return item ? JSON.parse(item) : null;
  };

  const saveDocumentDescriptor = async (
    storageLocation: LocalStorageLocation,
    existingDocumentDescriptor: DocumentDescriptor,
    currentDocument: Document,
  ): DocumentDescriptor => {
    const getSectionStorageKey = (sectionId: SectionId) =>
      `${storageLocation.storageKey}/section:${sectionId}`;

    const existingStorageMap = getStorageLocationMap(
      existingDocumentDescriptor.storageLocations,
      existingDocumentDescriptor.documentSections
    );

    const { id, title, documentSections, sectionTitles } = currentDocument;
    const storageLocations = map(sectionId => (
      (sectionId in existingStorageMap)
        ? existingDocumentDescriptor[sectionId]
        : getSectionStorageKey(sectionId)
    ), documentSections);

    const newDocumentDescriptor: DocumentDescriptor =
      { id, title, documentSections, sectionTitles, storageLocations };

    await storage.saveItem(storageLocation.storageKey, JSON.stringify(newDocumentDescriptor));

    return newDocumentDescriptor;
  };

  const saveSections = async (
    sectionTextInputs: Object,
    storageLocations: string[],
    documentSections: SectionId[]
  ) => {
    const sectionStorageMap = getStorageLocationMap(storageLocations, documentSections);

    const storagePairs = map(over([
      propertyOf(sectionStorageMap),
      flow(propertyOf(sectionTextInputs), JSON.stringify),
    ]), documentSections);

    await storage.saveItems(storagePairs);
  };

  const removeSections = async (storageLocations: string[], documentSections: SectionId) => {
    const sectionStorageMap = getStorageLocationMap(storageLocations, documentSections);

    const sectionsToRemove = propertyOf(sectionStorageMap);

    await storage.removeITems(sectionsToRemove);
  };

  const loadDocument = async (storageLocation: LocalStorageLocation): Document => {
    const documentDescriptor: DocumentDescriptor = getDocumentDescriptor(storageLocation);
    const { id, title, documentSections, sectionTitles, storageLocations } = documentDescriptor;

    const sectionTextInputPairs = await storage.getItems(storageLocations);
    // Get correct ids
    const sectionTextInputValues = map(pair => pair[1], sectionTextInputPairs);
    const sectionTextInputs = fromPairs(zip(documentSections, sectionTextInputValues));

    return { id, title, documentSections, sectionTitles, sectionTextInputs };
  };

  const createDocument = async (currentDocument: Document): LocalStorageLocation => {
    const getDocumentStorageKey = (documentId: DocumentId) => `document:${documentId}`;

    const { id, sectionTextInputs } = currentDocument;
    const storageLocation = getDocumentStorageKey(id);

    const documentDescriptor: DocumentDescriptor =
      saveDocumentDescriptor(storageLocation, currentDocument);

    const { documentSections, storageLocations } = documentDescriptor;
    await saveSections(sectionTextInputs, storageLocations, documentSections);

    return documentDescriptor;
  };

  const saveDocument = async (
    storageLocation: LocalStorageLocation,
    currentDocument: Document,
    previousDocument: Document,
  ): LocalStorageLocation => {
    let documentDescriptor = getDocumentDescriptor(storageLocation);

    if (!documentDescriptor) return createDocument(currentDocument);

    const documentDescriptorDidChange = some(key => (
      !isEqual(currentDocument[key], previousDocument[key])
    ), simpleDocumentKeys);

    if (documentDescriptorDidChange) {
      documentDescriptor =
        await saveDocumentDescriptor(storageLocation, documentDescriptor, currentDocument);
    }

    const { sectionTextInputs } = currentDocument;

    if (!previousDocument) {
      const { documentSections, storageLocations } = documentDescriptor;
      await saveSections(sectionTextInputs, storageLocations, documentSections);
    } else {
      const sectionStorageMap = getStorageLocationMap(
        documentDescriptor.storageLocations,
        documentDescriptor.documentSections
      );
      const getSectionStorageKey = propertyOf(sectionStorageMap);

      const { added, changed, removed } = getAddedChangedRemovedSectionItems(
        sectionTextInputs,
        previousDocument.sectionTextInputs
      );
      const addedChanged = concat(added, changed);

      const removePromise = !isEmpty(removed)
        ? removeSections(map(getSectionStorageKey, removed), removed)
        : null;

      const addChangePromise = !isEmpty(addedChanged)
        ? saveSections(sectionTextInputs, map(getSectionStorageKey, addedChanged), addedChanged)
        : null;

      await Promise.all(compact([removePromise, addChangePromise]));
    }

    return storageLocation; // Unchanged
  };

  const removeDocument = async (storageLocation: LocalStorageLocation) => {
    const documentDescriptor = getDocumentDescriptor(storageLocation);
    const keysToRemove = concat([storageLocation.storageKey, documentDescriptor.storageLocations]);
    await storage.removeKeys(keysToRemove);
  };

  return {
    type: 'local',
    loadDocument,
    saveDocument,
    removeDocument,
  };
};
