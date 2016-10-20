// @flow
import { map, keys, difference, intersection, reject, isEqual } from 'lodash/fp';
import type { DocumentId, SectionId } from '../types';

/* eslint-disable import/prefer-default-export */
type Items = { [key: SectionId]: any };
export const getAddedChangedRemovedSectionItems = (nextItems: Items, previousItems: Items) => {
  if (previousItems === nextItems) {
    return { added: [], removed: [], changed: [] };
  }

  const previousSectionIds = keys(previousItems);
  const nextSectionIds = keys(nextItems);

  const removed = difference(previousSectionIds, nextSectionIds);

  const added = difference(nextSectionIds, previousSectionIds);
  const itemsThatMayHaveChanged = intersection(previousSectionIds, nextSectionIds);
  const changed = reject(sectionId => isEqual(
      previousItems[sectionId],
      nextItems[sectionId]
  ), itemsThatMayHaveChanged);

  return { added, removed, changed };
};

export type PromiseStorage = {
  getItem: (key: string) => Promise<any>,
  multiGet: (key: string[]) => Promise<any>,
  setItem: (key: string, value: string) => Promise<any>,
  multiSet: (pairs: [string, string][]) => Promise<any>,
  removeItem: (key: string) => Promise<any>,
  multiRemove: (key: string[]) => Promise<any>,
};

export const getPromiseStorage = (): PromiseStorage => ({
  getItem: key =>
    Promise.resolve(global.localStorage.getItem(key)),
  multiGet: keys =>
    Promise.resolve(map(key => [key, global.localStorage.getItem(key)], keys)),
  setItem: (key, value) =>
    Promise.resolve(global.localStorage.setItem(key, value)),
  multiSet: pairs =>
    Promise.resolve(map(([key, value]) => global.localStorage.setItem(key, value), pairs)),
  removeItem: key =>
    Promise.resolve(global.localStorage.removeItem(key)),
  multiRemove: keys =>
    Promise.resolve(map(key => global.localStorage.removeItem(key), keys)),
});

export type StorageType = string;
export const STORAGE_LOCAL: StorageType = 'local';
export type StorageLocation = { title: string, type: StorageType };
export type LocalStorageLocation = StorageLocation & { sectionStorageKeys: string[] };
export type RemoteStorageLocation = StorageLocation & { userId: string, path: string };
// Section:id and Document:id should only be used for diffing, and nothing else
// The ids are not persisted between saves
export type Section = {
  id: ?SectionId,
  title: string,
  textInputs: string[],
};
export type Document = {
  id: ?DocumentId,
  title: string,
  sections: Section,
};
export type StorageAction = string;
export const STORAGE_ACTION_SAVE: StorageAction = 'STORAGE_ACTION_SAVE';
export const STORAGE_ACTION_REMOVE: StorageAction = 'STORAGE_ACTION_REMOVE';
export type StorageOperotaion = {
  action: StorageAction,
  storageLocation: StorageLocation,
  document: Document,
  previousDocument: ?Document,
  lastRejection: any,
};
export type StorageInterface = {
  type: StorageType,
  delay: Number,
  maxWait: Number,
  loadDocument: (storageLocation: StorageLocation, lastRejection: any) => Promise<Document>,
  updateStore: (storageOperations: StorageOperotaion[]) => Promise<(?StorageLocation)[]>,
};
