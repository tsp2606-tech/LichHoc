import { useEffect, useState } from "react";
import { BellRing, MapPin, X } from "lucide-react";
import { classes } from "../data/mockSchedule";
import { formatCourseFromEvent, getMySchedule } from "../lib/api";
import { getClassReminderPreferences, getReminderDateKey } from "../lib/classReminders";

const DAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

function parseTime(value) {
  const match = String(value || "").match(/(\d{1,2}):(\d{2})/);
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

function getDayIndex(course) {
  if (Number.isInteger(Number(course.dayIndex))) return Number(course.dayIndex);
  const day = String(course.day || course.dayName || "").toLowerCase();
  const short = DAYS.findIndex((name) => day.includes(name.toLowerCase()));
  if (short >= 0) return short;
  return ["thứ hai", "thứ ba", "thứ tư", "thứ năm", "thứ sáu", "thứ bảy", "chủ nhật"].findIndex((name) => day.includes(name));
}

function isInCurrentWeek(course, now) {
  if (!course.weekRange) return true;
  const match = String(course.weekRange).match(/(\d{2})\/(\d{2})\/(\d{4})\s*-\s*(\d{2})\/(\d{2})\/(\d{4})/);
  if (!match) return true;
  const start = new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
  const end = new Date(Number(match[6]), Number(match[5]) - 1, Number(match[4]), 23, 59, 59);
  return now >= start && now <= end;
}

function getReminderMapUrl(course) {
  const query = [course.room, course.location].filter(Boolean).join(" ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query || course.subject || "Đại học Duy Tân")}`;
}

export function ClassReminder({ user }) {
  const [preferences, setPreferences] = useState(() => getClassReminderPreferences(user));
  const [schedule, setSchedule] = useState(() => {
    try {
      const cached = JSON.parse(localStorage.getItem("lichhoc_schedule_cache") || "[]");
      return cached.length ? cached.map((event, index) => formatCourseFromEvent(event, index)) : classes;
    } catch {
      return classes;
    }
  });
  const [activeReminders, setActiveReminders] = useState([]);

  useEffect(() => {
    const refreshPreferences = () => setPreferences(getClassReminderPreferences(user));
    const refreshSchedule = () => {
      try {
        const cached = JSON.parse(localStorage.getItem("lichhoc_schedule_cache") || "[]");
        setSchedule(cached.length ? cached.map((event, index) => formatCourseFromEvent(event, index)) : classes);
      } catch {
        setSchedule(classes);
      }
    };
    window.addEventListener("lichhoc:classReminderPreferencesChanged", refreshPreferences);
    window.addEventListener("lichhoc:scheduleUpdated", refreshSchedule);
    getMySchedule()
      .then((events) => {
        if (events.length) setSchedule(events.map((event, index) => formatCourseFromEvent(event, index)));
      })
      .catch(() => {});
    return () => {
      window.removeEventListener("lichhoc:classReminderPreferencesChanged", refreshPreferences);
      window.removeEventListener("lichhoc:scheduleUpdated", refreshSchedule);
    };
  }, [user?.id, user?.email]);

  useEffect(() => {
    if (!preferences.enabled) return undefined;

    const checkUpcomingClasses = () => {
      const now = new Date();
      const weekday = now.getDay() === 0 ? 6 : now.getDay() - 1;
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const sentKey = `lichhoc_sent_class_reminders_${encodeURIComponent(String(user?.email || user?.id || "guest").toLowerCase())}`;
      let sent = [];
      try {
        sent = JSON.parse(localStorage.getItem(sentKey) || "[]");
        if (!Array.isArray(sent)) sent = [];
      } catch {
        sent = [];
      }
      sent = sent.filter((key) => key.startsWith(`${getReminderDateKey(now)}:`));

      schedule.forEach((course) => {
        if (getDayIndex(course) !== weekday || !isInCurrentWeek(course, now)) return;
        const startMinutes = parseTime(course.startTime) ?? parseTime(course.time);
        if (startMinutes === null) return;
        const minutesRemaining = startMinutes - currentMinutes;
        if (minutesRemaining <= 0 || minutesRemaining > preferences.minutesBefore) return;

        const identity = course.classCode || course.code || course.id || course.subject || course.name;
        const key = `${getReminderDateKey(now)}:${identity}:${course.startTime || course.time}`;
        if (sent.includes(key)) return;
        sent.push(key);

        const reminder = {
          id: key,
          subject: course.subject || course.name || "Lớp học",
          room: course.room || "Chưa có thông tin phòng",
          location: course.location || "",
          minutesRemaining,
          mapUrl: /online/i.test(course.room || "") ? "" : getReminderMapUrl(course),
        };
        setActiveReminders((current) => [...current.filter((item) => item.id !== key), reminder].slice(-3));

        if ("Notification" in window && Notification.permission === "granted") {
          try {
            const notification = new Notification(`Sắp đến giờ vào lớp: ${reminder.subject}`, {
              body: `${minutesRemaining} phút nữa · ${reminder.room}${reminder.location ? ` · ${reminder.location}` : ""}`,
              tag: key,
            });
            notification.onclick = () => {
              window.focus();
              if (reminder.mapUrl) window.open(reminder.mapUrl, "_blank", "noopener,noreferrer");
            };
          } catch {
            // In-app reminder remains visible if system notifications are unavailable.
          }
        }
      });

      try {
        localStorage.setItem(sentKey, JSON.stringify(sent));
      } catch {
        // Reminder is still shown for the current page session.
      }
    };

    checkUpcomingClasses();
    const timer = window.setInterval(checkUpcomingClasses, 20_000);
    return () => window.clearInterval(timer);
  }, [preferences.enabled, preferences.minutesBefore, schedule, user?.id, user?.email]);

  if (!activeReminders.length) return null;

  return (
    <div className="class-reminder-stack" aria-live="polite">
      {activeReminders.map((reminder) => (
        <section key={reminder.id} className="class-reminder-card" role="status">
          <div className="class-reminder-icon"><BellRing size={18} /></div>
          <div className="class-reminder-content">
            <strong>{reminder.subject}</strong>
            <span>Bắt đầu sau {reminder.minutesRemaining} phút · {reminder.room}</span>
            {reminder.location && <span>{reminder.location}</span>}
            {reminder.mapUrl && <a href={reminder.mapUrl} target="_blank" rel="noreferrer"><MapPin size={14} /> Mở bản đồ</a>}
          </div>
          <button type="button" aria-label="Đóng nhắc giờ vào lớp" onClick={() => setActiveReminders((current) => current.filter((item) => item.id !== reminder.id))}>
            <X size={16} />
          </button>
        </section>
      ))}
    </div>
  );
}

export default ClassReminder;
