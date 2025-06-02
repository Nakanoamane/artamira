import { useEffect } from 'react';

const APP_NAME = 'Artamira';
const HOME_PAGE_SUBTITLE = 'リアルタイム共同お絵かきボード';

export const usePageTitle = (pageTitle?: string) => {
  useEffect(() => {
    const newTitle = pageTitle
      ? `${APP_NAME} - ${pageTitle}`
      : `${APP_NAME} - ${HOME_PAGE_SUBTITLE}`;
    document.title = newTitle;
  }, [pageTitle]);
};
