import { useEffect, useState } from "react";
import { Plus, BookOpen, CalendarCheck, Clock3, Activity } from "lucide-react";
import { PageHeading, Button } from "../components/AppShell";
import { Stat } from "../components/Display";
import { classes } from "../data/mockSchedule";
import { formatCourseFromEvent, getMySchedule } from "../lib/api";

export function CalendarPage() {
  const weekdays = ["Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy", "Chủ Nhật"];
  const dayKeys = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
  const [apiCourses, setApiCourses] = useState([]);

  useEffect(() => {
    const loadSchedule = async () => {
      try {
        const token = localStorage.getItem("lichhoc_access_token");
        if (!token) {
          setApiCourses([]);
          return;
        }

        const schedule = await getMySchedule();
        setApiCourses(schedule.map((event, index) => formatCourseFromEvent(event, index)));
      } catch {
        setApiCourses([]);
      }
    };

    loadSchedule();
  }, []);

  const displayClasses = apiCourses.length ? apiCourses : classes;

  return (
    <>
      <PageHeading eyebrow="THỨ HAI, 20 THÁNG 10" title="Chào bạn, Minh 👋" detail="Một tuần mới đầy năng lượng đang chờ bạn. Đây là lịch học tuần này." action={<Button icon={Plus}>Thêm lịch học</Button>} />
      <div className="stat-grid">
        <Stat label="Lớp học tuần này" value={String(displayClasses.length)} note={apiCourses.length ? "Đồng bộ từ API" : "+2 so với tuần trước"} icon={BookOpen} tone="stat-blue" />
        <Stat label="Tổng số tín chỉ" value="18" note="Học kỳ 1 · 2025–2026" icon={CalendarCheck} tone="stat-green" />
        <Stat label="Tiết học tiếp theo" value={displayClasses[0]?.time?.split(" – ")[0] || "08:00"} note={displayClasses[0]?.name ? `${displayClasses[0].name} · ${displayClasses[0].room}` : "Cấu trúc dữ liệu · D9-301"} icon={Clock3} tone="stat-amber" />
        <Stat label="Điểm danh" value="96%" note="Bạn đang làm rất tốt!" icon={Activity} tone="stat-purple" />
      </div>
      <section className="panel calendar-panel">
        <div className="panel-head"><div><h2>Lịch học của tôi</h2><p>Tuần 8 · 20 – 26 tháng 10, 2025</p></div><div className="calendar-tools"><Button variant="outline">‹</Button><Button variant="outline">Hôm nay</Button><Button variant="outline">›</Button><button className="view-toggle selected">Tuần</button><button className="view-toggle">Tháng</button></div></div>
        <div className="week-grid"><div className="time-head">GMT+7</div>{weekdays.map((day, i) => <div className={`day-head ${i === 0 ? "today" : ""}`} key={day}><span>{day}</span><b>{20 + i}</b></div>)}{["07:00", "08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00"].map((time) => <div className="time-row" key={time}><span className="time-label">{time}</span>{weekdays.map((_, di) => <div className="time-cell" key={di}>{displayClasses.filter((c) => {
              const key = dayKeys[di];
              return c.day === key || c.day === weekdays[di] || c.day === weekdays[di].slice(0, 2) || c.day === `Thứ ${di + 2}`;
            }).filter((c) => c.time && c.time.includes(time.slice(0, 2))).map((c) => <article className={`class-card ${c.tone || "blue"}`} key={`${c.code}-${c.day}-${c.time}`}><b>{c.name}</b><span>{c.time}</span><small>{c.room} · {c.code}</small></article>)}</div>)}</div>)}</div>
      </section>
    </>
  );
}

export default CalendarPage;
