import { router } from 'expo-router';

/** Opens a datafordummies.in page in the lesson viewer. `path` is site-relative. */
export function openSitePage(path: string, title: string): void {
  router.push({ pathname: '/learn', params: { path, title } });
}
