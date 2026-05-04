import LegalPage from './LegalPage';
import contentHtml from './legal/oferta.html?raw';
export default function Oferta() {
  return <LegalPage title="Публичная оферта" subtitle="на предоставление прав использования ПО «TessTOC» · ООО «ТЕСС ТЕХНОЛОДЖИ»" contentHtml={contentHtml} />;
}
