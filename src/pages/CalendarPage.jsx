import { useEffect, useState, useMemo, useCallback } from "react";
import { BookOpen, Clock3, Activity, RefreshCw, MapPin } from "lucide-react";
import { PageHeading, Button } from "../components/AppShell";
import { Stat } from "../components/Display";
import { classes } from "../data/mockSchedule";
import { formatCourseFromEvent, getMySchedule } from "../lib/api";
import { ErrorDialog } from "../components/ErrorDialog";

function parseMinutes(timeStr) {
  if (!timeStr) return 0;
  const parts = String(timeStr).trim().split(":");
  if (parts.length < 2) return 0;
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
}

// Khung thời gian từ 07:00 (7 SA) đến 22:00 (10 CH)
const START_HOUR = 7;
const END_HOUR = 22;
const HOUR_HEIGHT = 60; // 60px cho mỗi 1 tiếng -> đúng 1px tương ứng 1 phút

const timeLabels = [
  { hour: 7, label: "7 SA", time24: "07:00" },
  { hour: 8, label: "8 SA", time24: "08:00" },
  { hour: 9, label: "9 SA", time24: "09:00" },
  { hour: 10, label: "10 SA", time24: "10:00" },
  { hour: 11, label: "11 SA", time24: "11:00" },
  { hour: 12, label: "12 CH", time24: "12:00" },
  { hour: 13, label: "1 CH", time24: "13:00" },
  { hour: 14, label: "2 CH", time24: "14:00" },
  { hour: 15, label: "3 CH", time24: "15:00" },
  { hour: 16, label: "4 CH", time24: "16:00" },
  { hour: 17, label: "5 CH", time24: "17:00" },
  { hour: 18, label: "6 CH", time24: "18:00" },
  { hour: 19, label: "7 CH", time24: "19:00" },
  { hour: 20, label: "8 CH", time24: "20:00" },
  { hour: 21, label: "9 CH", time24: "21:00" },
  { hour: 22, label: "10 CH", time24: "22:00" },
];

const TOTAL_HEIGHT = timeLabels.length * HOUR_HEIGHT; // 16 * 60 = 960px

function getMonday(d) {
  const date = new Date(d);
  const day = date.getDay(); // 0 là CN, 1 là T2...
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function formatDateKey(d) {
  if (!d) return "";
  const date = new Date(d);
  if (isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatWeekRange(mon) {
  if (!mon) return "";
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  const fmt = (d) => `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}/${d.getFullYear()}`;
  return `${fmt(mon)} - ${fmt(sun)}`;
}

function extractWeekRange(str) {
  if (!str) return "";
  const m = str.match(/(\d{2}\/\d{2}\/\d{4})\s*-\s*(\d{2}\/\d{2}\/\d{4})/);
  if (m) return `${m[1]}-${m[2]}`;
  return str.replace(/\s+/g, "").toLowerCase();
}

export function isMobileDevice() {
  if (typeof window === "undefined") return false;
  const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent || ""
  );
  const isSmallScreen = window.innerWidth <= 768;
  return isMobileUA || isSmallScreen;
}

export function CalendarPage() {
  const [apiCourses, setApiCourses] = useState([]);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");
  const [syncSuccess, setSyncSuccess] = useState(true);
  const [errorDialog, setErrorDialog] = useState(null);

  // Trạng thái ngày đang chọn & Chế độ xem: "list" (Liệt kê - mặc định trên điện thoại) | "week" (Tuần) | "month" (Tháng)
  const [userManuallySelectedView, setUserManuallySelectedView] = useState(false);
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [viewMode, setViewMode] = useState(() => (isMobileDevice() ? "list" : "week"));

  useEffect(() => {
    const handleResize = () => {
      // Hỗ trợ tự thích ứng khi thay đổi kích thước hoặc xoay màn hình nếu người dùng chưa chọn thủ công
      if (!userManuallySelectedView && isMobileDevice()) {
        setViewMode("list");
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [userManuallySelectedView]);

  const [now, setNow] = useState(() => new Date()); // Thời gian thực tế hệ thống (cập nhật realtime)

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000); // Cập nhật mỗi giây để đảm bảo realtime chính xác
    return () => clearInterval(timer);
  }, []);

  // 1. Xác định Thứ Hai của tuần thực tế hiện tại (Tuần của ngày hôm nay)
  const currentRealMonday = useMemo(() => getMonday(now), [now]);

  // 2. Xác định Thứ Hai của tuần trước tuần hiện tại (Tuần trước - Được giữ lại)
  const prevRealMonday = useMemo(() => {
    const m = new Date(currentRealMonday);
    m.setDate(currentRealMonday.getDate() - 7);
    return m;
  }, [currentRealMonday]);

  // Tuần được chỉ định cụ thể khi bấm từ chế độ xem Tháng (nếu có)
  const [selectedMonthWeek, setSelectedMonthWeek] = useState(null);

  // Tính ngày Thứ Hai của tuần đang chọn trên lịch
  const currentDayOfWeek = currentDate.getDay(); // 0 là CN, 1 là T2...
  const diffToMonday = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;
  const monday = useMemo(() => {
    const m = new Date(currentDate);
    m.setDate(currentDate.getDate() + diffToMonday);
    m.setHours(0, 0, 0, 0);
    return m;
  }, [currentDate, diffToMonday]);

  const sunday = useMemo(() => {
    const s = new Date(monday);
    s.setDate(monday.getDate() + 6);
    return s;
  }, [monday]);

  // Hàm kiểm tra một tuần có hiển thị lịch hay không:
  // - Nếu chưa qua tuần mới: Tuần hiện tại KHÔNG bị xóa và GIỮ LẠI tuần trước của tuần hiện tại.
  // - Các tuần trong quá khứ cũ hơn tuần trước (< prevRealMonday) sẽ bị xóa (để trống).
  // - Các tuần học tiếp theo trong kỳ học (>= currentRealMonday): Hiển thị đầy đủ lịch đã đồng bộ từ myDTU.
  // - Khi người dùng bấm vào ngày trong chế độ xem Tháng thì hiển thị lịch duy nhất cho tuần chứa ngày đó.
  const checkWeekHasSchedule = useCallback(
    (monDate) => {
      if (!monDate) return false;
      const targetKey = formatDateKey(monDate);

      // Ưu tiên tuần được click chọn đích danh từ chế độ xem Tháng
      if (selectedMonthWeek) {
        return targetKey === formatDateKey(selectedMonthWeek);
      }

      // 1. Các tuần trong quá khứ cũ hơn tuần trước (< prevRealMonday): Xóa lịch (trống lịch)
      if (monDate.getTime() < prevRealMonday.getTime()) {
        return false;
      }

      // 2. Tuần trước của tuần hiện tại (prevRealMonday): Giữ lại lịch học
      if (targetKey === formatDateKey(prevRealMonday)) {
        return true;
      }

      // 3. Tuần hiện tại (currentRealMonday): Giữ nguyên lịch học
      if (targetKey === formatDateKey(currentRealMonday)) {
        return true;
      }

      // 4. Các tuần tương lai trong học kỳ (tối đa 20 tuần tiếp theo): Hiển thị lịch học đã đồng bộ
      const maxSemesterMonday = new Date(currentRealMonday);
      maxSemesterMonday.setDate(currentRealMonday.getDate() + 20 * 7);
      if (monDate.getTime() <= maxSemesterMonday.getTime()) {
        return true;
      }

      return false;
    },
    [selectedMonthWeek, currentRealMonday, prevRealMonday]
  );

  // Kiểm tra xem tuần đang xem trên màn hình có hiển thị lịch học hay không
  const isCurrentViewActiveWeek = useMemo(() => {
    return checkWeekHasSchedule(monday);
  }, [checkWeekHasSchedule, monday]);

  // Các nút chuyển lùi / tiến / hôm nay
  const handlePrev = () => {
    setSelectedMonthWeek(null);
    setCurrentDate((prev) => {
      const next = new Date(prev);
      if (viewMode === "month") {
        next.setMonth(next.getMonth() - 1);
      } else {
        next.setDate(next.getDate() - 7);
      }
      return next;
    });
  };

  const handleNext = () => {
    setSelectedMonthWeek(null);
    setCurrentDate((prev) => {
      const next = new Date(prev);
      if (viewMode === "month") {
        next.setMonth(next.getMonth() + 1);
      } else {
        next.setDate(next.getDate() + 7);
      }
      return next;
    });
  };

  const handleToday = () => {
    setSelectedMonthWeek(null);
    setCurrentDate(new Date());
  };

  const weekDays = useMemo(() => {
    const dayNames = ["Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy", "Chủ Nhật"];
    const shortDays = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);

      const isToday =
        d.getDate() === now.getDate() &&
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear();

      return {
        dayIndex: i,
        dayName: dayNames[i],
        shortDay: shortDays[i],
        headerTitle: `${shortDays[i]}, ${d.getDate()}`,
        dayNumber: d.getDate(),
        monthNumber: d.getMonth() + 1,
        year: d.getFullYear(),
        monthText: `Thg ${d.getMonth() + 1}`,
        isToday,
      };
    });
  }, [monday]);

  // Dữ liệu cho lưới lịch Tháng
  const monthCalendarData = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth(); // 0-indexed

    const firstDayDate = new Date(year, month, 1);
    const firstDayIndex = firstDayDate.getDay() === 0 ? 6 : firstDayDate.getDay() - 1;

    const daysInCurrentMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const cells = [];

    // Các ngày cuối tháng trước
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const cellDate = new Date(year, month - 1, d);
      const dayOfWeekIdx = cellDate.getDay() === 0 ? 6 : cellDate.getDay() - 1;
      cells.push({
        date: cellDate,
        dayNumber: d,
        isCurrentMonth: false,
        isToday: false,
        dayOfWeekIndex: dayOfWeekIdx,
      });
    }

    // Các ngày trong tháng này
    for (let d = 1; d <= daysInCurrentMonth; d++) {
      const cellDate = new Date(year, month, d);
      const isToday =
        cellDate.getDate() === now.getDate() &&
        cellDate.getMonth() === now.getMonth() &&
        cellDate.getFullYear() === now.getFullYear();
      const dayOfWeekIdx = cellDate.getDay() === 0 ? 6 : cellDate.getDay() - 1;
      cells.push({
        date: cellDate,
        dayNumber: d,
        isCurrentMonth: true,
        isToday,
        dayOfWeekIndex: dayOfWeekIdx,
      });
    }

    // Các ngày đầu tháng sau để làm đầy bội số của 7
    const totalCells = Math.ceil(cells.length / 7) * 7;
    const remaining = totalCells - cells.length;
    for (let d = 1; d <= remaining; d++) {
      const cellDate = new Date(year, month + 1, d);
      const dayOfWeekIdx = cellDate.getDay() === 0 ? 6 : cellDate.getDay() - 1;
      cells.push({
        date: cellDate,
        dayNumber: d,
        isCurrentMonth: false,
        isToday: false,
        dayOfWeekIndex: dayOfWeekIdx,
      });
    }

    return cells;
  }, [currentDate]);

  const loadSchedule = async () => {
    try {
      const token = localStorage.getItem("lichhoc_access_token");
      if (!token) {
        setApiCourses([]);
        return;
      }

      // 1. Render từ cache (nếu có) để hiển thị lập tức
      const cached = localStorage.getItem("lichhoc_schedule_cache");
      if (cached) {
        try {
          const parsedCache = JSON.parse(cached);
          setApiCourses(parsedCache.map((event, index) => formatCourseFromEvent(event, index)));
        } catch (e) {
          console.error("Lỗi khi đọc cache lịch học", e);
        }
      }

      // 2. Fetch dữ liệu mới từ API (chạy ngầm, nếu render bị sleep sẽ chờ)
      const schedule = await getMySchedule();
      
      // 3. Cập nhật cache và giao diện
      localStorage.setItem("lichhoc_schedule_cache", JSON.stringify(schedule));
      setApiCourses(schedule.map((event, index) => formatCourseFromEvent(event, index)));
    } catch {
      // Nếu API lỗi/timeout và chưa có cache thì clear lưới lịch
      if (!localStorage.getItem("lichhoc_schedule_cache")) {
        setApiCourses([]);
      }
    }
  };

  useEffect(() => {
    loadSchedule();
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    setSyncMessage("");
    setErrorDialog(null);
    try {
      const token = localStorage.getItem("lichhoc_access_token");
      if (!token) {
        setSyncSuccess(false);
        const msg = "Bạn chưa đăng nhập. Vui lòng đăng nhập trước khi đồng bộ lịch học.";
        setSyncMessage(msg);
        setErrorDialog({
          title: "Chưa đăng nhập",
          message: msg,
          code: "AUTH_REQUIRED",
          type: "warning",
        });
        return;
      }

      const schedule = await getMySchedule();
      
      // Cập nhật cache mới khi đồng bộ thủ công
      localStorage.setItem("lichhoc_schedule_cache", JSON.stringify(schedule));
      
      const formatted = schedule.map((event, index) => formatCourseFromEvent(event, index));
      setApiCourses(formatted);
      setSelectedMonthWeek(null);
      setSyncSuccess(true);
      setSyncMessage(`Đồng bộ thành công! Đã tải về ${schedule.length} môn học từ máy chủ.`);
    } catch (err) {
      setSyncSuccess(false);
      const isAuthErr = err.status === 401 || /token|hết hạn|auth/i.test(err.message || "");
      const errMsg = isAuthErr
        ? "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để tiếp tục đồng bộ lịch học."
        : err.message || "Không thể đồng bộ dữ liệu lịch học từ máy chủ.";
      setSyncMessage(errMsg);
      setErrorDialog({
        title: isAuthErr ? "Phiên đăng nhập hết hạn" : "Đồng bộ lịch học thất bại",
        message: errMsg,
        code: err.status ? `HTTP_${err.status}` : "SYNC_ERROR",
        type: "error",
        onConfirm: isAuthErr ? () => { window.location.hash = "#/login"; } : undefined,
        confirmText: isAuthErr ? "Đăng nhập lại" : "Đã hiểu & thử lại",
      });
    } finally {
      setSyncing(false);
    }
  };

  // #2. Gộp các môn trùng nhau theo từng tuần (giữ nguyên tính riêng biệt của từng tuần)
  const uniqueCourses = useMemo(() => {
    const list = apiCourses.length ? apiCourses : classes;
    const map = new Map();

    list.forEach((c, idx) => {
      // Xác định dayIndex từ dữ liệu
      let dIdx = c.dayIndex;
      if (dIdx === undefined || dIdx < 0) {
        const shortIdx = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"].indexOf(c.day);
        if (shortIdx !== -1) dIdx = shortIdx;
        else {
          const longIdx = ["Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy", "Chủ Nhật"].indexOf(c.day);
          dIdx = longIdx !== -1 ? longIdx : 0;
        }
      }

      // Tách giờ bắt đầu và kết thúc
      let sTime = c.startTime;
      let eTime = c.endTime;
      if (!sTime || !eTime) {
        const tParts = (c.time || "").split(/[–\-]/);
        if (tParts.length >= 2) {
          sTime = tParts[0].trim();
          eTime = tParts[1].trim();
        } else {
          sTime = "07:00";
          eTime = "09:00";
        }
      }

      const code = c.classCode || c.code || "";
      const subject = c.subject || c.name || "Lịch học";
      const wRange = (c.weekRange || "").trim();
      const normWRange = extractWeekRange(wRange);
      // Key giữ riêng biệt các môn của từng tuần khác nhau
      const key = `${normWRange}_${dIdx}_${code}_${subject}_${sTime}_${eTime}_${c.room || ""}`;

      if (!map.has(key)) {
        map.set(key, {
          ...c,
          id: c.id || key,
          dayIndex: dIdx,
          classCode: code,
          subject,
          weekRange: wRange,
          startTime: sTime,
          endTime: eTime,
          timeText: `${sTime} - ${eTime}`,
          isOnline: c.isOnline || /online/i.test(c.room || "") || /online/i.test(c.location || ""),
        });
      }
    });

    return Array.from(map.values());
  }, [apiCourses]);

  // Các môn học hiển thị cho tuần đang xem
  const displayedCourses = useMemo(() => {
    if (!isCurrentViewActiveWeek) return [];

    const currentWeekRangeStr = formatWeekRange(monday);
    const targetNormWeek = extractWeekRange(currentWeekRangeStr);

    // Kiểm tra xem danh sách có môn học nào có thông tin tuần cụ thể không
    const hasSpecificWeek = uniqueCourses.some((c) => Boolean(c.weekRange));

    if (hasSpecificWeek) {
      // Chỉ hiển thị các môn học thuộc chính xác tuần này
      return uniqueCourses.filter((c) => {
        if (!c.weekRange) return true; // Môn không có weekRange (nếu có)
        return extractWeekRange(c.weekRange) === targetNormWeek;
      });
    }

    return uniqueCourses;
  }, [isCurrentViewActiveWeek, uniqueCourses, monday]);

  // #4. Tính toán tiết học tiếp theo một cách đồng bộ từ dữ liệu
  const nextClass = useMemo(() => {
    if (!displayedCourses.length) return null;
    const jsDay = now.getDay();
    const todayIndex = jsDay === 0 ? 6 : jsDay - 1;
    const nowMins = now.getHours() * 60 + now.getMinutes();

    // Môn học trong ngày hôm nay bắt đầu sau thời điểm hiện tại
    const todayClasses = displayedCourses
      .filter((c) => c.dayIndex === todayIndex && parseMinutes(c.startTime) > nowMins)
      .sort((a, b) => parseMinutes(a.startTime) - parseMinutes(b.startTime));

    if (todayClasses.length > 0) return todayClasses[0];

    // Nếu hôm nay không còn lớp, tìm môn gần nhất ở các ngày tiếp theo trong tuần
    for (let offset = 1; offset <= 7; offset++) {
      const targetDay = (todayIndex + offset) % 7;
      const targetClasses = displayedCourses
        .filter((c) => c.dayIndex === targetDay)
        .sort((a, b) => parseMinutes(a.startTime) - parseMinutes(b.startTime));

      if (targetClasses.length > 0) return targetClasses[0];
    }

    return displayedCourses[0];
  }, [displayedCourses, now]);

  const subtitleText = useMemo(() => {
    if (viewMode === "month") {
      const monthNames = [
        "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6",
        "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"
      ];
      return `${monthNames[currentDate.getMonth()]} năm ${currentDate.getFullYear()}`;
    }
    const fmt = (d) => `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}/${d.getFullYear()}`;
    const baseWeekText = `Tuần: ${fmt(monday)} - ${fmt(sunday)}`;
    if (!isCurrentViewActiveWeek) {
      return `${baseWeekText} · (Tuần trống - Lịch tuần cũ đã được xóa)`;
    }
    if (displayedCourses.length === 0 && uniqueCourses.length > 0) {
      return `${baseWeekText} · (Chưa có lịch cho tuần này)`;
    }
    if (formatDateKey(monday) === formatDateKey(currentRealMonday)) {
      return `${baseWeekText} · (Tuần hiện tại đang học)`;
    }
    if (formatDateKey(monday) === formatDateKey(prevRealMonday)) {
      return `${baseWeekText} · (Tuần trước - Được lưu trữ)`;
    }
    if (monday.getTime() > currentRealMonday.getTime()) {
      return `${baseWeekText} · (Lịch học tuần tới)`;
    }
    return `${baseWeekText} · (Tuần đang có lịch học)`;
  }, [viewMode, currentDate, monday, sunday, isCurrentViewActiveWeek, displayedCourses.length, uniqueCourses.length, currentRealMonday, prevRealMonday]);

  // Danh sách các ngày trong tuần kèm danh sách môn đã sắp xếp (cho chế độ xem Liệt kê)
  const weekDaysList = useMemo(() => {
    const dayNames = ["Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy", "Chủ Nhật"];

    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);

      const isToday =
        d.getDate() === now.getDate() &&
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear();

      const dayCourses = displayedCourses
        .filter((c) => c.dayIndex === i)
        .sort((a, b) => parseMinutes(a.startTime) - parseMinutes(b.startTime));

      return {
        dayIndex: i,
        dayName: dayNames[i],
        dateText: `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}/${d.getFullYear()}`,
        isToday,
        courses: dayCourses,
      };
    });
  }, [monday, displayedCourses, now]);

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--d-primary, #6366f1)" }}>
              <span>HÔM NAY • {now.toLocaleDateString("vi-VN", { weekday: "long", day: "numeric", month: "long" }).toUpperCase()}</span>
              <span style={{ padding: "2px 8px", borderRadius: "4px", backgroundColor: "var(--d-today-bg, #e0e7ff)", border: "1px solid var(--d-primary, #818cf8)", fontSize: "10px", color: "var(--d-primary, #4f46e5)" }}>Tuần học 8</span>
            </div>
            <h1 style={{ fontSize: "24px", fontWeight: "700", color: "var(--d-foreground, #0f172a)", marginTop: "4px", display: "flex", alignItems: "center", gap: "8px" }}>
              Thời khóa biểu của tôi <span className="animate-bounce">👋</span>
            </h1>
            <p style={{ fontSize: "12px", color: "var(--d-muted-foreground, #64748b)", marginTop: "2px" }}>
              Lịch học được đồng bộ trực tiếp từ MyDTU. Dễ dàng tra cứu và sắp xếp thời gian biểu.
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "12px", backgroundColor: "var(--d-card, #f8fafc)", padding: "6px 12px", borderRadius: "8px", border: "1px solid var(--d-card-border, #e2e8f0)", color: "var(--d-muted-foreground, #64748b)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: "#34d399" }}></span>
              <span>Môn Online</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: "#facc15" }}></span>
              <span>Môn Offline</span>
            </div>
          </div>
        </div>
      </div>

      {/* #4. Bảng thống kê */}
      <div className="calendar-stat-grid">
        <Stat
          label="Lớp học tuần này"
          value={String(displayedCourses.length)}
          note={
            !isCurrentViewActiveWeek
              ? "Tuần này trống lịch"
              : formatDateKey(monday) === formatDateKey(prevRealMonday)
              ? "Lưu trữ tuần trước"
              : formatDateKey(monday) === formatDateKey(currentRealMonday)
              ? (apiCourses.length ? "Đồng bộ từ myDTU" : "Dữ liệu mẫu")
              : "Lịch học tuần tới"
          }
          icon={BookOpen}
          tone="stat-blue"
          className="calendar-stat-classes"
        />
        <Stat
          label="Tiết học tiếp theo"
          value={nextClass ? nextClass.startTime : "--:--"}
          note={
            nextClass
              ? `${nextClass.subject} · ${nextClass.room || "DTU"}`
              : isCurrentViewActiveWeek
              ? "Không còn tiết học"
              : "Không có lịch học tuần này"
          }
          icon={Clock3}
          tone="stat-amber"
          className="calendar-stat-next"
        />
        <Stat
          label="Trạng thái"
          value={isCurrentViewActiveWeek ? (apiCourses.length ? "Đã kết nối" : "Sẵn sàng") : "Trống lịch"}
          note={
            !isCurrentViewActiveWeek
              ? "Lịch tuần cũ đã xóa"
              : formatDateKey(monday) === formatDateKey(prevRealMonday)
              ? "Lưu trữ tuần trước"
              : formatDateKey(monday) === formatDateKey(currentRealMonday)
              ? `Đã đồng bộ ${displayedCourses.length} môn từ DTU`
              : "Lịch học đã sẵn sàng"
          }
          icon={Activity}
          tone="stat-purple"
          className="calendar-stat-status"
        />
      </div>

      {syncMessage && (
        <div
          style={{
            padding: "12px 16px",
            borderRadius: "8px",
            marginBottom: "16px",
            fontSize: "13px",
            backgroundColor: syncSuccess ? "rgba(34, 197, 94, 0.15)" : "rgba(239, 68, 68, 0.15)",
            color: syncSuccess ? "#15803d" : "#b91c1c",
            border: `1px solid ${syncSuccess ? "#86efac" : "#fca5a5"}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span>{syncSuccess ? "✅" : "⚠️"} {syncMessage}</span>
          <button
            onClick={() => setSyncMessage("")}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontWeight: "bold",
              color: "inherit",
              fontSize: "16px",
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Bảng Thời khóa biểu chuẩn kiểu Telerik RadScheduler như Ảnh 2 */}
      <section className="panel calendar-panel" style={{ overflow: "hidden", border: "1px solid var(--d-border, #e2e8f0)" }}>
        <div className="panel-head">
          <div className="panel-lead">
            <h2>Lịch học của tôi</h2>
            <p>{subtitleText}</p>
          </div>
          <div className="calendar-tools">
            <Button
              variant="outline"
              icon={RefreshCw}
              onClick={handleSync}
              disabled={syncing}
              className="calendar-btn-sync"
              style={{
                backgroundColor: "var(--d-sync-bg, #f0fdf4)",
                borderColor: "var(--d-sync-border, #86efac)",
                color: "var(--d-sync-text, #166534)",
                fontWeight: "600",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              {syncing ? (
                <>
                  <svg className="w-3.5 h-3.5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                  <span>Đang đồng bộ...</span>
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                  <span>Đồng bộ dữ liệu</span>
                </>
              )}
            </Button>
            <div className="calendar-nav-group" style={{ background: "var(--d-background, #ffffff)", border: "1px solid var(--d-border, #e2e8f0)", padding: "2px", borderRadius: "8px" }}>
              <Button variant="ghost" onClick={handlePrev} title="Tuần trước" style={{ padding: "4px 6px", height: "auto", color: "var(--d-muted-foreground, #64748b)" }}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"/></svg>
              </Button>
              <Button variant="ghost" onClick={handleToday} title="Trở về hiện tại" style={{ padding: "4px 10px", height: "auto", fontSize: "12px", fontWeight: "500", color: "var(--d-foreground, #334155)" }}>
                Tuần
              </Button>
              <Button variant="ghost" onClick={handleNext} title="Tuần sau" style={{ padding: "4px 6px", height: "auto", color: "var(--d-muted-foreground, #64748b)" }}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/></svg>
              </Button>
            </div>
            <div className="calendar-view-toggles" role="tablist">
              <button
                type="button"
                className={`view-toggle ${viewMode === "list" ? "selected" : ""}`}
                onClick={() => {
                  setUserManuallySelectedView(true);
                  setViewMode("list");
                }}
              >
                Liệt kê
              </button>
              <button
                type="button"
                className={`view-toggle ${viewMode === "week" ? "selected" : ""}`}
                onClick={() => {
                  setUserManuallySelectedView(true);
                  setViewMode("week");
                }}
              >
                Tuần
              </button>
              <button
                type="button"
                className={`view-toggle ${viewMode === "month" ? "selected" : ""}`}
                onClick={() => {
                  setUserManuallySelectedView(true);
                  setViewMode("month");
                }}
              >
                Tháng
              </button>
            </div>
          </div>
        </div>

        {/* 1. Chế độ xem theo TUẦN (RadScheduler Timeline) */}
        {viewMode === "week" && (
        <div style={{ overflowX: "auto", minWidth: "100%", background: "var(--d-background, #ffffff)" }}>
          {!isCurrentViewActiveWeek && (
            <div
              style={{
                margin: "12px 16px 8px 16px",
                padding: "10px 16px",
                backgroundColor: "#f8fafc",
                border: "1px dashed #cbd5e1",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                fontSize: "13px",
                color: "#64748b",
              }}
            >
              <span>ℹ️ Tuần này không có lịch học {monday.getTime() > currentRealMonday.getTime() ? "(tuần tương lai)" : "(lịch các tuần cũ đã được tự động dọn dẹp)"}.</span>
            </div>
          )}
          <div style={{ minWidth: "820px" }}>
            {/* 1. Hàng Tiêu Đề Ngày */}
            <div style={{ display: "flex", borderBottom: "1px solid #e2e8f0" }}>
              {/* Ô góc trên bên trái: Cả ngày */}
              <div
                style={{
                  width: "60px",
                  minWidth: "60px",
                  height: "44px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "11px",
                  fontWeight: "600",
                  color: "var(--d-muted-foreground, #64748b)",
                  background: "var(--d-muted, #f8fafc)",
                  borderRight: "1px solid var(--d-border, #e2e8f0)",
                }}
              >
                Cả ngày
              </div>

              {/* 7 Cột Ngày trong tuần */}
              {weekDays.map((dayObj) => (
                <div
                  key={dayObj.dayName}
                  style={{
                    flex: 1,
                    minWidth: "105px",
                    height: "44px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRight: "1px solid var(--d-border, #e2e8f0)",
                    // #2. Tô màu vàng nếu là ngày hiện tại, các ngày khác màu trắng
                    backgroundColor: dayObj.isToday ? "var(--d-today-bg, #fef08a)" : "transparent",
                    color: dayObj.isToday ? "var(--d-today-fg, #854d0e)" : "var(--d-foreground, #334155)",
                    borderBottom: dayObj.isToday ? "2px solid var(--d-primary, #eab308)" : "none",
                  }}
                >
                  <span style={{ fontSize: "12px", fontWeight: "700" }}>{dayObj.headerTitle}</span>
                  <span style={{ fontSize: "10px", color: dayObj.isToday ? "var(--d-today-sub, #a16207)" : "var(--d-muted-foreground, #94a3b8)" }}>{dayObj.dayName}</span>
                </div>
              ))}
            </div>

            {/* 2. Thân Lịch Học Dạng Timeline Liên Tục */}
            <div style={{ display: "flex", position: "relative", height: `${TOTAL_HEIGHT}px`, background: "var(--d-background, #ffffff)" }}>
              {/* Vạch đỏ chỉ giờ hiện tại (hiển thị nếu đang ở tuần hiện tại) */}
              {isCurrentViewActiveWeek && formatDateKey(monday) === formatDateKey(currentRealMonday) && now.getHours() >= START_HOUR && now.getHours() <= END_HOUR && (
                <div
                  style={{
                    position: "absolute",
                    top: `${Math.max(0, (now.getHours() * 60 + now.getMinutes() - START_HOUR * 60) * (HOUR_HEIGHT / 60))}px`,
                    left: "60px",
                    right: 0,
                    zIndex: 20,
                    pointerEvents: "none",
                    display: "flex",
                    alignItems: "center"
                  }}
                >
                  <div className="current-time-line" style={{ width: "100%", borderTop: "2px solid #f43f5e", boxShadow: "0 0 8px rgba(244, 63, 94, 0.6)" }} />
                  <div className="current-time-badge" style={{
                    position: "absolute", right: "16px", top: "-12px",
                    backgroundColor: "#e11d48", color: "white", fontSize: "10px",
                    fontFamily: "monospace", padding: "2px 8px", borderRadius: "4px",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
                  }}>
                    Hiện tại: {now.getHours().toString().padStart(2, "0")}:{now.getMinutes().toString().padStart(2, "0")}
                  </div>
                </div>
              )}

              {/* Cột trục giờ bên trái */}
              <div
                style={{
                  width: "60px",
                  minWidth: "60px",
                  height: `${TOTAL_HEIGHT}px`,
                  background: "var(--d-muted, #f8fafc)",
                  borderRight: "1px solid var(--d-border, #e2e8f0)",
                  display: "flex",
                  flexDirection: "column",
                  position: "relative",
                }}
              >
                {timeLabels.map((item, idx) => (
                  <div
                    key={item.label}
                    style={{
                      height: `${HOUR_HEIGHT}px`,
                      boxSizing: "border-box",
                      borderBottom: "1px solid #e2e8f0",
                      paddingRight: "6px",
                      paddingTop: "2px",
                      textAlign: "right",
                      fontSize: "11px",
                      fontWeight: "600",
                      color: "var(--d-muted-foreground, #475569)",
                      position: "relative",
                    }}
                  >
                    <span>{item.label}</span>
                    {/* Vạch kẻ nửa giờ 30 phút */}
                    <div
                      style={{
                        position: "absolute",
                        right: 0,
                        top: "30px",
                        width: "8px",
                        borderTop: "1px solid var(--d-border, #cbd5e1)",
                      }}
                    />
                  </div>
                ))}
              </div>

              {/* 7 Cột Ngày */}
              {weekDays.map((dayObj) => {
                // Lọc các môn học của ngày này (Chỉ có môn nếu tuần này là tuần có lịch)
                const dayClasses = displayedCourses.filter((c) => c.dayIndex === dayObj.dayIndex);

                return (
                  <div
                    key={dayObj.dayName}
                    style={{
                      flex: 1,
                      minWidth: "105px",
                      height: `${TOTAL_HEIGHT}px`,
                      position: "relative",
                      borderRight: "1px solid var(--d-border, #e2e8f0)",
                      // #2. BÔI VÀNG TỪ ĐẦU ĐẾN CUỐI CỘT MÀU VÀNG GIỐNG ẢNH 2
                      backgroundColor: dayObj.isToday ? "var(--d-col-highlight, #fef9c3)" : "transparent",
                    }}
                  >
                    {/* Các đường kẻ ngang mỗi tiếng */}
                    {timeLabels.map((_, i) => (
                      <div
                        key={i}
                        style={{
                          position: "absolute",
                          top: `${i * HOUR_HEIGHT}px`,
                          left: 0,
                          right: 0,
                          height: `${HOUR_HEIGHT}px`,
                          borderBottom: "1px solid var(--d-border, #edf0f5)",
                          boxSizing: "border-box",
                        }}
                      >
                        {/* Đường kẻ mờ 30 phút */}
                        <div
                          style={{
                            position: "absolute",
                            top: "30px",
                            left: 0,
                            right: 0,
                            borderTop: "1px dashed var(--d-border, #f1f5f9)",
                          }}
                        />
                      </div>
                    ))}

                    {/* #2 & #3: Hiển thị các môn học theo đúng tọa độ giờ:phút (14:15, 14:30...) và GỘP THÀNH 1 CARD */}
                    {dayClasses.map((c) => {
                      const sMin = parseMinutes(c.startTime);
                      let eMin = parseMinutes(c.endTime);
                      if (eMin <= sMin) eMin = sMin + 90; // Mặc định 1.5 tiếng nếu thiếu

                      // #3. Tọa độ top chính xác theo phút so với mốc 07:00 (START_HOUR * 60)
                      const baseMin = START_HOUR * 60; // 420 phút
                      const top = Math.max(0, (sMin - baseMin) * (HOUR_HEIGHT / 60));
                      const durationMin = eMin - sMin;
                      const height = Math.max(34, durationMin * (HOUR_HEIGHT / 60) - 3);

                      // Môn học online màu xanh lá, offline màu vàng
                      const isOnline = c.isOnline;

                      const bgCard = isOnline ? "var(--d-bg-online, #c0ffc0)" : "var(--d-bg-offline, #fff0b3)";
                      const borderCard = isOnline ? "var(--d-border-online, #82e282)" : "var(--d-border-offline, #e6c65b)";
                      const textCard = isOnline ? "var(--d-text-online, #0f5132)" : "var(--d-text-offline, #78350f)";

                      return (
                        <div
                          key={c.id}
                          title={`${c.classCode} | ${c.subject} | ${c.room}, ${c.location} | ${c.timeText}`}
                          style={{
                            position: "absolute",
                            top: `${top}px`,
                            height: `${height}px`,
                            left: "3px",
                            right: "3px",
                            backgroundColor: bgCard,
                            border: `1px solid ${borderCard}`,
                            borderRadius: "5px",
                            padding: "5px 6px",
                            boxSizing: "border-box",
                            zIndex: 10,
                            overflow: "hidden",
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "flex-start",
                            boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                            cursor: "pointer",
                            transition: "transform 0.15s, box-shadow 0.15s",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = "scale(1.02)";
                            e.currentTarget.style.boxShadow = "0 3px 8px rgba(0,0,0,0.12)";
                            e.currentTarget.style.zIndex = "20";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = "scale(1)";
                            e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.06)";
                            e.currentTarget.style.zIndex = "10";
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "flex-start", gap: "4px" }}>
                            <span style={{ color: "#d97706", fontSize: "11px", lineHeight: "1" }}>✎</span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div
                                style={{
                                  fontWeight: "700",
                                  fontSize: "11px",
                                  lineHeight: "1.2",
                                  color: textCard,
                                  marginBottom: "2px",
                                  wordBreak: "break-word",
                                }}
                              >
                                {c.classCode ? `${c.classCode} | ` : ""}{c.subject}
                              </div>
                              <div
                                style={{
                                  fontSize: "10px",
                                  color: textCard,
                                  opacity: 0.85,
                                  lineHeight: "1.2",
                                  marginBottom: "2px",
                                  whiteSpace: "nowrap",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                }}
                              >
                                {c.room}{c.location ? `, ${c.location}` : ""}
                              </div>
                              <div
                                style={{
                                  fontSize: "10px",
                                  fontWeight: "600",
                                  color: textCard,
                                  opacity: 0.9,
                                }}
                              >
                                {c.timeText}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        )}

        {/* 2. Chế độ xem theo THÁNG */}
        {viewMode === "month" && (
          <div style={{ overflowX: "auto", minWidth: "100%", background: "var(--d-background, #ffffff)", padding: "16px 20px" }}>
            <div style={{ minWidth: "760px" }}>
              {/* Tiêu đề 7 ngày trong tuần */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "8px", marginBottom: "10px" }}>
                {["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"].map((dayName, idx) => (
                  <div
                    key={dayName}
                    style={{
                      padding: "10px 4px",
                      textAlign: "center",
                      fontWeight: "700",
                      fontSize: "12px",
                      color: idx >= 5 ? "var(--d-destructive, #dc2626)" : "var(--d-muted-foreground, #475569)",
                      backgroundColor: "var(--d-muted, #f8fafc)",
                      border: "1px solid var(--d-border, #e2e8f0)",
                      borderRadius: "8px",
                    }}
                  >
                    {dayName}
                  </div>
                ))}
              </div>

              {/* Lưới các ô ngày trong tháng */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "8px" }}>
                {monthCalendarData.map((cell, idx) => {
                  const cellMonday = getMonday(cell.date);
                  const isCellInActiveWeek = checkWeekHasSchedule(cellMonday);
                  const cellWeekRange = extractWeekRange(formatWeekRange(cellMonday));
                  const hasSpecificWeek = uniqueCourses.some((c) => Boolean(c.weekRange));

                  const dayCourses = isCellInActiveWeek
                    ? uniqueCourses.filter((c) => {
                        if (c.dayIndex !== cell.dayOfWeekIndex) return false;
                        if (hasSpecificWeek && c.weekRange) {
                          return extractWeekRange(c.weekRange) === cellWeekRange;
                        }
                        return true;
                      })
                    : [];

                  return (
                    <div
                      key={idx}
                      onClick={() => {
                        // Khi người dùng bấm vào ngày khi nhìn tháng thì hiện lịch chỉ duy nhất tuần có chứa ngày đó
                        const clickedMonday = getMonday(cell.date);
                        setSelectedMonthWeek(clickedMonday);
                        setCurrentDate(cell.date);
                        setViewMode("week");
                      }}
                      title={isCellInActiveWeek ? "Tuần đang có lịch học. Bấm để xem tuần này." : "Bấm vào ngày này để chỉ hiển thị lịch duy nhất cho tuần này."}
                      style={{
                        minHeight: "115px",
                        border: cell.isToday
                          ? "2px solid var(--d-primary, #eab308)"
                          : isCellInActiveWeek && cell.isCurrentMonth
                          ? "1.5px solid var(--d-chart-1, #60a5fa)"
                          : "1px solid var(--d-border, #e2e8f0)",
                        borderRadius: "10px",
                        padding: "8px",
                        backgroundColor: cell.isToday
                          ? "var(--d-col-highlight, #fefce8)"
                          : isCellInActiveWeek && cell.isCurrentMonth
                          ? "var(--d-card, #f8faff)"
                          : cell.isCurrentMonth
                          ? "transparent"
                          : "var(--d-muted, #f8fafc)",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                        display: "flex",
                        flexDirection: "column",
                        gap: "5px",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = isCellInActiveWeek ? "#2563eb" : "#93c5fd";
                        e.currentTarget.style.boxShadow = "0 4px 12px rgba(59, 130, 246, 0.08)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = cell.isToday
                          ? "#eab308"
                          : isCellInActiveWeek && cell.isCurrentMonth
                          ? "#60a5fa"
                          : "#e2e8f0";
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span
                          style={{
                            fontSize: "12.5px",
                            fontWeight: cell.isToday ? "800" : isCellInActiveWeek ? "700" : cell.isCurrentMonth ? "600" : "400",
                            color: cell.isToday ? "var(--d-today-fg, #854d0e)" : isCellInActiveWeek ? "var(--d-primary, #1d4ed8)" : cell.isCurrentMonth ? "var(--d-foreground, #1e293b)" : "var(--d-muted-foreground, #94a3b8)",
                            width: cell.isToday ? "24px" : "auto",
                            height: cell.isToday ? "24px" : "auto",
                            borderRadius: "50%",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            background: cell.isToday ? "var(--d-today-bg, #fef08a)" : "transparent",
                          }}
                        >
                          {cell.dayNumber}
                        </span>
                        {cell.isToday && (
                          <span style={{ fontSize: "9.5px", fontWeight: "700", color: "var(--d-today-sub, #854d0e)", background: "var(--d-col-highlight, #fef9c3)", padding: "1px 6px", borderRadius: "4px" }}>
                            Hôm nay
                          </span>
                        )}
                        {isCellInActiveWeek && cell.isCurrentMonth && !cell.isToday && (
                          <span style={{ fontSize: "9px", fontWeight: "700", color: "#1d4ed8", background: "#dbeafe", padding: "1px 5px", borderRadius: "4px" }}>
                            {formatDateKey(cellMonday) === formatDateKey(currentRealMonday)
                              ? "Tuần này"
                              : formatDateKey(cellMonday) === formatDateKey(prevRealMonday)
                              ? "Tuần trước"
                              : "Tuần có lịch"}
                          </span>
                        )}
                        {dayCourses.length > 0 && cell.isCurrentMonth && (
                          <span style={{ fontSize: "10px", color: "#64748b", fontWeight: "600" }}>
                            {dayCourses.length} môn
                          </span>
                        )}
                      </div>

                      {/* Các thẻ môn học trong ngày (Chỉ hiển thị cho tuần có lịch) */}
                      <div style={{ display: "flex", flexDirection: "column", gap: "3px", overflow: "hidden" }}>
                        {cell.isCurrentMonth &&
                          dayCourses.slice(0, 2).map((c, cIdx) => (
                            <div
                              key={cIdx}
                              style={{
                                padding: "2px 5px",
                                borderRadius: "4px",
                                fontSize: "10.5px",
                                fontWeight: "600",
                                backgroundColor: "var(--d-primary, #eff6ff)",
                                color: "var(--d-primary-foreground, #1d4ed8)",
                                border: "1px solid var(--d-primary, #bfdbfe)",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                              title={`${c.startTime}-${c.endTime}: ${c.subject} (${c.room || "DTU"})`}
                            >
                              <b>{c.startTime}</b> {c.subject}
                            </div>
                          ))}
                        {cell.isCurrentMonth && dayCourses.length > 2 && (
                          <div style={{ fontSize: "9.5px", color: "#2563eb", fontWeight: "700", textAlign: "center", marginTop: "1px" }}>
                            +{dayCourses.length - 2} môn khác...
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* 3. Chế độ xem LIỆT KÊ (List / Agenda - Mặc định trên điện thoại) */}
        {viewMode === "list" && (
          <div className="calendar-list-container">
            {weekDaysList.map((day) => (
              <div
                key={day.dayIndex}
                className={`calendar-list-day-card ${day.isToday ? "today" : ""}`}
              >
                {/* Header ngày */}
                <div className="calendar-list-day-header">
                  <div className="day-header-title">
                    <span className="calendar-emoji">📅</span>
                    <strong className="day-title-text">
                      {day.dayName}, {day.dateText}
                    </strong>
                    {day.isToday && (
                      <span className="today-badge">
                        Hôm nay
                      </span>
                    )}
                  </div>
                  <span className="day-course-count">
                    {day.courses.length > 0 ? `${day.courses.length} tiết học` : "Không có lịch học"}
                  </span>
                </div>

                {/* Danh sách các tiết học */}
                <div className="calendar-list-day-body">
                  {day.courses.length === 0 ? (
                    <div className="calendar-list-empty">
                      <span>☕</span>
                      <span>Không có lịch học vào ngày này. Hãy tận hưởng thời gian nghỉ ngơi hoặc tự học!</span>
                    </div>
                  ) : (
                    <div className="calendar-list-course-list">
                      {day.courses.map((course, cIdx) => (
                        <div
                          key={cIdx}
                          className="calendar-list-course-card"
                        >
                          {/* Cột thời gian */}
                          <div className="course-card-time-block">
                            <div className="course-card-time">
                              <Clock3 size={15} color="#2563eb" />
                              <span>{course.startTime} - {course.endTime}</span>
                            </div>
                            <span className="course-duration">
                              Thời lượng ~ {Math.max(0, parseMinutes(course.endTime) - parseMinutes(course.startTime))} phút
                            </span>
                          </div>

                          {/* Cột thông tin môn học & phòng */}
                          <div className="course-card-details">
                            <div className="course-card-header">
                              <span className="course-code-pill">
                                {course.code || "MÃ LỚP"}
                              </span>
                              <strong className="course-subject-title">
                                {course.subject}
                              </strong>
                            </div>

                            <div className="course-card-meta">
                              <span className="meta-room">
                                <MapPin size={13} color="#2563eb" />
                                <b>{course.room || "Chưa rõ phòng"}</b> {course.location ? `· ${course.location}` : ""}
                              </span>
                              <span className="meta-teacher">
                                <span>👤</span>
                                <span>{course.teacher || "Giảng viên bộ môn"}</span>
                              </span>
                            </div>
                          </div>

                          {/* Cột nhãn trạng thái */}
                          <div className="course-card-badge-wrap">
                            <span
                              className={`course-type-badge ${course.room?.toLowerCase().includes("online") ? "online" : "campus"}`}
                            >
                              {course.room?.toLowerCase().includes("online") ? "Trực tuyến (Online)" : "Tại trường"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <ErrorDialog
        isOpen={Boolean(errorDialog)}
        title={errorDialog?.title}
        message={errorDialog?.message}
        code={errorDialog?.code}
        type={errorDialog?.type || "error"}
        confirmText={errorDialog?.confirmText}
        onConfirm={errorDialog?.onConfirm}
        onClose={() => setErrorDialog(null)}
      />
    </>
  );
}

export default CalendarPage;
