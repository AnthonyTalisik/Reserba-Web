import { useSyncExternalStore } from 'react'
import { db, subscribe, getVersion } from '../data/mockStore.js'

/** Call at the top of a page: the page re-renders whenever the mock data changes. */
export function useStore() {
  useSyncExternalStore(subscribe, getVersion)
  return db
}
