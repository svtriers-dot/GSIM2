import LegalPage from './LegalPage';
import contentHtml from './legal/eula.html?raw';
export default function Eula() {
  return <LegalPage title="Лицензионное соглашение (EULA)" subtitle="программного обеспечения «TessTOC» · ООО «ТЕСС ТЕХНОЛОДЖИ»" contentHtml={contentHtml} />;
}
