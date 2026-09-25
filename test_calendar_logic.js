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

// Suppose we have 18 events: 9 for 21/09/2026 - 27/09/2026 and 9 for 28/09/2026 - 04/10/2026
const week1Courses = [
  { classCode: "IS 301 E", dayIndex: 0, weekRange: "21/09/2026 - 27/09/2026", startTime: "07:00", endTime: "09:00" },
  { classCode: "CS 311 Q", dayIndex: 1, weekRange: "21/09/2026 - 27/09/2026", startTime: "07:00", endTime: "09:00" },
  { classCode: "IS 301 E", dayIndex: 2, weekRange: "21/09/2026 - 27/09/2026", startTime: "07:00", endTime: "09:00" },
  { classCode: "PHY 101 K3", dayIndex: 6, weekRange: "21/09/2026 - 27/09/2026", startTime: "07:00", endTime: "11:15" },
  { classCode: "CS 297 E", dayIndex: 2, weekRange: "21/09/2026 - 27/09/2026", startTime: "09:15", endTime: "11:15" },
  { classCode: "DS 103 CA", dayIndex: 0, weekRange: "21/09/2026 - 27/09/2026", startTime: "13:00", endTime: "15:00" },
  { classCode: "PHY 101 K", dayIndex: 2, weekRange: "21/09/2026 - 27/09/2026", startTime: "13:00", endTime: "15:00" },
  { classCode: "PHY 101 K", dayIndex: 5, weekRange: "21/09/2026 - 27/09/2026", startTime: "13:00", endTime: "15:00" },
  { classCode: "ES 221 AC", dayIndex: 1, weekRange: "21/09/2026 - 27/09/2026", startTime: "14:00", endTime: "16:15" }
];

const week2Courses = [
  { classCode: "IS 301 E", dayIndex: 0, weekRange: "28/09/2026 - 04/10/2026", startTime: "07:00", endTime: "09:00" },
  { classCode: "CS 311 Q", dayIndex: 1, weekRange: "28/09/2026 - 04/10/2026", startTime: "07:00", endTime: "09:00" },
  { classCode: "IS 301 E", dayIndex: 2, weekRange: "28/09/2026 - 04/10/2026", startTime: "07:00", endTime: "09:00" },
  { classCode: "DS 103 CA", dayIndex: 0, weekRange: "28/09/2026 - 04/10/2026", startTime: "13:00", endTime: "15:00" },
  { classCode: "PHY 101 K", dayIndex: 2, weekRange: "28/09/2026 - 04/10/2026", startTime: "13:00", endTime: "15:00" },
  { classCode: "PHY 101 K", dayIndex: 5, weekRange: "28/09/2026 - 04/10/2026", startTime: "13:00", endTime: "15:00" },
  { classCode: "ES 221 AC", dayIndex: 1, weekRange: "28/09/2026 - 04/10/2026", startTime: "14:00", endTime: "16:15" },
  { classCode: "CS 297 E", dayIndex: 1, weekRange: "28/09/2026 - 04/10/2026", startTime: "17:45", endTime: "21:00" }
];

const allCourses = [...week1Courses, ...week2Courses];

// Test Week 1 viewing: Monday = 21/09/2026
const mon1 = new Date(2026, 8, 21);
const wRange1 = extractWeekRange(formatWeekRange(mon1));
const disp1 = allCourses.filter(c => extractWeekRange(c.weekRange) === wRange1);
console.log(`Displayed courses for Week 1 (${wRange1}): ${disp1.length}`);
assert(disp1.length === 9, "Week 1 must have 9 courses");

// Test Week 2 viewing: Monday = 28/09/2026
const mon2 = new Date(2026, 8, 28);
const wRange2 = extractWeekRange(formatWeekRange(mon2));
const disp2 = allCourses.filter(c => extractWeekRange(c.weekRange) === wRange2);
console.log(`Displayed courses for Week 2 (${wRange2}): ${disp2.length}`);
assert(disp2.length === 8, "Week 2 must have 8 courses");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

console.log("SUCCESS! Both weeks display their own distinct courses!");
