import { useEffect, useState } from "react";
import { Search, Plus, Filter, Upload, MapPin, BookOpen, CalendarCheck, Clock3 } from "lucide-react";
import { PageHeading, Button, Badge } from "../components/AppShell";
import { Stat } from "../components/Display";
import { classes } from "../data/mockSchedule";
import { deleteCourseById, formatCourseFromEvent, getCurrentUser, getMySchedule, updateCourseById } from "../lib/api";

export function ManagePage() {
  const [courses, setCourses] = useState(classes);
  const [editingCourse, setEditingCourse] = useState(null);
  const [draft, setDraft] = useState({ name: "", room: "", teacher: "", time: "", day: "" });
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const loadCourses = async () => {
    try {
      const token = localStorage.getItem("lichhoc_access_token");
      if (!token) {
        setCourses(classes);
        return;
      }

      const events = await getMySchedule();
      setCourses(events.length ? events.map((event, index) => formatCourseFromEvent(event, index)) : classes);
    } catch {
      setCourses(classes);
    }
  };

  useEffect(() => {
    loadCourses();
  }, []);

  const startEditing = (course) => {
    setEditingCourse(course);
    setDraft({
      name: course.name || "",
      room: course.room || "",
      teacher: course.teacher || "",
      time: course.time || "",
      day: course.day || "",
    });
  };

  const saveEdit = async () => {
    if (!editingCourse) return;

    try {
      const id = editingCourse.id;
      const payload = {
        monHoc: draft.name,
        giangVien: draft.teacher,
        phongHoc: draft.room,
        thu: draft.day,
        thoiGian: draft.time,
        ghiChu: "Cập nhật từ LichHoc",
      };

      if (id) {
        await updateCourseById(id, payload);
      }

      setCourses((prev) => prev.map((course) => (
        course.id === editingCourse.id || `${course.code}-${course.day}-${course.time}` === `${editingCourse.code}-${editingCourse.day}-${editingCourse.time}`
          ? { ...course, name: draft.name, room: draft.room, teacher: draft.teacher, time: draft.time, day: draft.day }
          : course
      )));
      setEditingCourse(null);
      setNotice("Đã cập nhật môn học thành công.");
      setError("");
    } catch (err) {
      setError(err.message || "Không thể cập nhật môn học.");
    }
  };

  const removeCourse = async (course) => {
    const confirmDelete = window.confirm(`Bạn có chắc muốn xóa "${course.name}" khỏi lịch học?`);
    if (!confirmDelete) return;

    try {
      const currentUser = getCurrentUser();
      if (currentUser?.is_admin && course.id) {
        await deleteCourseById(course.id);
      } else if (course.id) {
        await deleteCourseById(course.id);
      }

      setCourses((prev) => prev.filter((item) => item !== course));
      setNotice("Đã xóa môn học khỏi danh sách.");
      setError("");
    } catch (err) {
      setError(err.message || "Không thể xóa môn học.");
    }
  };

  return (
    <>
      <PageHeading eyebrow="DANH SÁCH HỌC PHẦN" title="Quản lý lịch học" detail="Theo dõi, sắp xếp và cập nhật các lớp học trong học kỳ của bạn." action={<Button icon={Plus}>Thêm môn học</Button>} />
      <div className="stat-grid compact-stats">
        <Stat label="Tổng số lớp" value={String(courses.length)} note="Trong học kỳ hiện tại" icon={BookOpen} tone="stat-blue" />
        <Stat label="Tín chỉ đăng ký" value="18" note="Trên tổng 24 tín chỉ" icon={CalendarCheck} tone="stat-green" />
        <Stat label="Buổi học sắp tới" value="12" note="Trong 7 ngày tiếp theo" icon={Clock3} tone="stat-amber" />
      </div>

      {notice && <div className="success-banner">{notice}</div>}
      {error && <div className="error-banner">{error}</div>}

      {editingCourse && (
        <section className="panel">
          <div className="panel-head">
            <div><h2>Chỉnh sửa môn học</h2><p>{editingCourse.name}</p></div>
          </div>
          <div className="form-grid">
            <label className="field"><span>Tên môn</span><input value={draft.name} onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))} /></label>
            <label className="field"><span>Mã lớp</span><input value={editingCourse.code || ""} readOnly /></label>
            <label className="field"><span>Phòng</span><input value={draft.room} onChange={(event) => setDraft((prev) => ({ ...prev, room: event.target.value }))} /></label>
            <label className="field"><span>Giảng viên</span><input value={draft.teacher} onChange={(event) => setDraft((prev) => ({ ...prev, teacher: event.target.value }))} /></label>
            <label className="field"><span>Ngày</span><input value={draft.day} onChange={(event) => setDraft((prev) => ({ ...prev, day: event.target.value }))} /></label>
            <label className="field"><span>Thời gian</span><input value={draft.time} onChange={(event) => setDraft((prev) => ({ ...prev, time: event.target.value }))} /></label>
          </div>
          <div className="import-foot">
            <Button variant="outline" onClick={() => setEditingCourse(null)}>Hủy</Button>
            <Button onClick={saveEdit}>Lưu thay đổi</Button>
          </div>
        </section>
      )}

      <section className="panel table-panel">
        <div className="table-toolbar">
          <div className="search-box table-search"><Search size={16} /><input placeholder="Tìm theo môn học, giảng viên, phòng..." /></div>
          <Button variant="outline" icon={Filter}>Bộ lọc</Button>
          <select aria-label="Học kỳ"><option>Học kỳ 1 · 2025–2026</option></select>
          <Button variant="outline" icon={Upload}>Xuất dữ liệu</Button>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>MÔN HỌC</th>
                <th>MÃ LỚP</th>
                <th>LỊCH HỌC</th>
                <th>PHÒNG</th>
                <th>GIẢNG VIÊN</th>
                <th>TRẠNG THÁI</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {courses.map((c, i) => (
                <tr key={`${c.code}-${i}`}>
                  <td>
                    <div className="course-cell">
                      <i className={`course-mark ${c.tone || "blue"}`} />
                      <span><b>{c.name}</b><small>{[3, 3, 3, 3, 4, 2][i] || 3} tín chỉ</small></span>
                    </div>
                  </td>
                  <td><span className="code-pill">{c.code}</span></td>
                  <td>{c.day} · {c.time}</td>
                  <td><MapPin size={14} />{c.room}</td>
                  <td>{c.teacher}</td>
                  <td><Badge tone={i === 0 ? "amber" : "green"}>{c.status}</Badge></td>
                  <td>
                    <div className="row-actions">
                      <button type="button" aria-label="Sửa" onClick={() => startEditing(c)}>Sửa</button>
                      <button type="button" aria-label="Xóa" onClick={() => removeCourse(c)}>Xóa</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="table-footer">Hiển thị <b>1–{courses.length}</b> trong <b>{courses.length}</b> lớp học <div><button>‹</button><button className="current-page">1</button><button>›</button></div></div>
      </section>
    </>
  );
}

export default ManagePage;
