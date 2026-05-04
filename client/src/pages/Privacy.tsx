import LegalPage from './LegalPage';
import contentHtml from './legal/privacy.html?raw';
export default function Privacy() {
  return <LegalPage title="Политика обработки персональных данных" subtitle="на сайте https://toc.tesstech.ru · ООО «ТЕСС ТЕХНОЛОДЖИ»" contentHtml={contentHtml} />;
}
