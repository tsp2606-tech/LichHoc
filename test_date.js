function formatWeekRange(mon) {
  if (!mon) return '';
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  const fmt = (d) => String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();
  return fmt(mon) + ' - ' + fmt(sun);
}

function extractWeekRange(str) {
  if (!str) return '';
  const m = str.match(/(\d{2}\/\d{2}\/\d{4})\s*-\s*(\d{2}\/\d{2}\/\d{4})/);
  if (m) return m[1] + '-' + m[2];
  return str.replace(/\s+/g, '').toLowerCase();
}

const d = new Date(2026, 8, 25); // Friday Sep 25, 2026
const day = d.getDay();
const diff = day === 0 ? -6 : 1 - day;
const mon = new Date(d);
mon.setDate(d.getDate() + diff);
console.log('Monday:', mon.toLocaleDateString());
const range = formatWeekRange(mon);
console.log('Range:', range);
console.log('Extracted range:', extractWeekRange(range));
console.log('DTU text: 21/09/2026 - 27/09/2026');
console.log('Extracted DTU:', extractWeekRange('21/09/2026 - 27/09/2026'));
console.log('Match?:', extractWeekRange(range) === extractWeekRange('21/09/2026 - 27/09/2026'));
