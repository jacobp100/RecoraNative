// @flow
import {
  map, reduce, startsWith, update, set, flow, uniqueId, trim, last,
} from 'lodash/fp';
import { getAddedChangedRemovedSectionItems, getPromiseStorage } from '../util';
import { append } from '../../util';
import type { PromiseStorage, Document, StorageInterface, RemoteStorageLocation } from '../util'; // eslint-disable-line
import type { DocumentId, SectionId } from '../../types';

const createDocumentId = () =>
  `document-${uniqueId()}`;

const createSectionId = (documentId: DocumentId) =>
  `document:${documentId}/section:section-${uniqueId()}`;

const sectionToString = (
  title: string,
  textInputs: string,
) => {
  const titleString = `## ${title}\n`;
  const textInputStrings = map(input => `> ${input}\n`, textInputs);
  return [titleString, ...textInputStrings].join('');
};

const documentToString = (document: Document) => {
  const titleString = `# ${document.title}\n`;
  const sectionStrings = map(sectionId => sectionToString(
    document.sectionTitles[sectionId],
    document.sectionTextInputs[sectionId]
  ), document.documentSections);

  [titleString, ...sectionStrings].join('\n');
};

const parseDocumentString = (id: DocumentId, string: string) => reduce((accum, line) => {
  if (startsWith('##', line)) {
    const sectionId = createSectionId(id);
    const sectionTitle = trim(line.substring(2));

    return flow(
      update('documentSections', append(sectionId)),
      set(['sectionTitles', sectionId], sectionTitle)
    )(accum);
  } else if (startsWith('>', line)) {
    const sectionId = last(accum.documentSections);
    if (!sectionId) return accum;

    const textInput = trim(line.substring(1));
    return update(['sectionTextInputs', sectionId], append(textInput), accum);
  } else if (startsWith('#', line)) {
    const documentTitle = trim(line.substring(1));
    return set('title', documentTitle, accum);
  }
  return accum;
}, {
  id,
  title: '',
  documentSections: [],
  sectionTitles: {},
  sectionTextInputs: {},
}, string.split('\n'));

export default (remote): StorageInterface => {
  const loadDocument = async (storageLocation: RemoteStorageLocation) => {
    const contents = await remote.fetch(storageLocation.userId, storageLocation.path);
    const documentId = createDocumentId();
    const document: Document = parseDocumentString(documentId, contents);
    return document;
  };

  const saveDocument = async (storageLocation: RemoteStorageLocation, document: Document) => {
    const contents = documentToString(document);
    await remote.post(storageLocation.userId, storageLocation.path, contents);
    return storageLocation;
  };

  const removeDocument = async () => {};

  return {
    loadDocument,
    saveDocument,
    removeDocument,
  };
};
