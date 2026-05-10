import { useTranslation } from 'react-i18next'; // RTL

export function useDirection() { // RTL
  const { i18n } = useTranslation(); // RTL
  return { // RTL
    dir: i18n.language === 'ar' ? 'rtl' : 'ltr', // RTL
    isRTL: i18n.language === 'ar', // RTL
  }; // RTL
} // RTL
