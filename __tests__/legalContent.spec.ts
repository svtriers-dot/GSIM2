import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const offerPath = fileURLToPath(new URL("../client/src/pages/legal/oferta.html", import.meta.url));
const offer = readFileSync(offerPath, "utf8");
const privacyPath = fileURLToPath(new URL("../client/src/pages/legal/privacy.html", import.meta.url));
const privacy = readFileSync(privacyPath, "utf8");

let pass = 0;
let fail = 0;
const failures: string[] = [];

function ok(name: string, condition: boolean) {
  if (condition) pass++;
  else {
    fail++;
    failures.push(name);
  }
}

ok("оферта указывает УСН", offer.includes("применяет упрощённую систему налогообложения"));
ok("оферта не указывает ОСНО", !/общ(?:ую|ая) систем(?:у|а) налогообложения/i.test(offer));
ok("оферта указывает исполнение обязанностей по НДС", offer.includes("исполняет обязанности налогоплательщика НДС"));
ok("ставка НДС определяется на дату реализации", offer.includes("на дату реализации"));
ok("актуальный КПП в оферте", offer.includes("КПП 771601001"));
ok("старый КПП отсутствует в оферте", !offer.includes("770201001"));
ok("услуги отделены от лицензии", offer.includes("не входят в предмет настоящей Оферты"));
ok("gzip не назван шифрованием", privacy.includes("gzip является форматом сжатия, а не средством шифрования"));
ok("актуальный КПП в политике", privacy.includes("КПП 771601001"));

console.log(`\n===== LEGAL CONTENT: ${pass} passed, ${fail} failed =====`);
if (failures.length) {
  console.log("FAILED:");
  for (const failure of failures) console.log(`  ✗ ${failure}`);
}
if (fail > 0) process.exit(1);
