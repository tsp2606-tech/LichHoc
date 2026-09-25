import { useState } from "react";
import { Code2, Upload, Check, ArrowUpRight } from "lucide-react";
import { PageHeading, Button } from "../components/AppShell";
import { parseScheduleHtml, saveSchedule } from "../lib/api";
import { ErrorDialog } from "../components/ErrorDialog";

export function ImportPage() {
  const [html, setHtml] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [count, setCount] = useState(0);
  const [errorDialog, setErrorDialog] = useState(null);

  const handleAnalyze = async () => {
    if (!html.trim()) {
      const msg = "Vui lòng dán mã HTML thời khóa biểu trước khi đồng bộ.";
      setError(msg);
      setErrorDialog({
        title: "Thiếu mã HTML",
        message: msg,
        code: "HTML_REQUIRED",
        type: "warning",
      });
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");
    setErrorDialog(null);

    try {
      const parsed = await parseScheduleHtml(html);
      const events = parsed.events || [];
      setCount(events.length);

      const token = localStorage.getItem("lichhoc_access_token");
      if (token) {
        await saveSchedule(events);
        setMessage(`Đã đồng bộ thành công ${events.length} tiết học lên tài khoản của bạn.`);
      } else {
        setMessage(`Phân tích thành công ${events.length} tiết học. Hãy đăng nhập để lưu vào tài khoản.`);
      }
    } catch (err) {
      const errMsg = err.message || "Không thể đồng bộ lịch học từ mã HTML đã cung cấp.";
      setError(errMsg);
      setErrorDialog({
        title: "Phân tích lịch học thất bại",
        message: errMsg,
        code: err.status ? `HTTP_${err.status}` : "PARSE_ERROR",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageHeading eyebrow="TỰ ĐỘNG ĐỒNG BỘ" title="Nhập lịch từ cổng đào tạo" detail="Dán mã HTML thời khóa biểu để đưa lịch học của bạn vào LichHoc." />
      <div className="content-columns">
        <section className="panel import-panel">
          <div className="panel-head">
            <div>
              <h2><Code2 size={19} /> Mã HTML thời khóa biểu</h2>
              <p>Hỗ trợ lịch học dạng bảng hoặc RadScheduler.</p>
            </div>
            <Button variant="outline">Tải file HTML</Button>
          </div>

          <label className="field-label" htmlFor="html-input">Dán mã nguồn</label>
          <textarea
            id="html-input"
            className="code-area"
            value={html}
            onChange={(event) => setHtml(event.target.value)}
            placeholder={'<!-- Dán mã HTML thời khóa biểu tại đây -->\n<table class="grid-table">\n  ...\n</table>'}
          />

          <div className="import-foot">
            <span>Tối đa 5 MB · HTML, HTM</span>
            <Button icon={Upload} onClick={handleAnalyze} disabled={loading}>
              {loading ? "Đang xử lý..." : "Phân tích lịch"}
            </Button>
          </div>

          {error && <div className="error-banner">{error}</div>}
          {message && <div className="success-banner">{message}</div>}

          <div className="info-note">
            <span className="info-icon">i</span>
            <span>
              <b>Dữ liệu của bạn được bảo mật</b>
              <small>HTML chỉ được sử dụng để nhận diện các buổi học và không được lưu trữ ngoài tài khoản đã đăng nhập.</small>
            </span>
          </div>
        </section>

        <aside className="panel guide-panel">
          <div className="guide-icon"><Code2 size={21} /></div>
          <h2>Cách lấy lịch học</h2>
          <p>Chỉ mất khoảng 1 phút để đồng bộ thời khóa biểu của bạn.</p>
          <ol className="steps">
            <li><i>1</i><span><b>Đăng nhập cổng đào tạo</b><small>Mở trang thời khóa biểu của trường bạn.</small></span></li>
            <li><i>2</i><span><b>Mở công cụ nhà phát triển</b><small>Nhấn F12 hoặc chuột phải → Kiểm tra.</small></span></li>
            <li><i>3</i><span><b>Sao chép mã lịch học</b><small>Chọn bảng thời khóa biểu và sao chép HTML.</small></span></li>
            <li><i>4</i><span><b>Dán và đồng bộ</b><small>Dán mã vào khung bên trái để bắt đầu.</small></span></li>
          </ol>
          <a href="#/help">Xem hướng dẫn chi tiết <ArrowUpRight size={14} /></a>
        </aside>
      </div>

      <section className="panel recent-panel">
        <div className="panel-head">
          <div>
            <h2>Lần đồng bộ gần đây</h2>
            <p>Lịch sử nhập dữ liệu từ cổng đào tạo</p>
          </div>
          <a href="#/manage">Xem tất cả <ArrowUpRight size={14} /></a>
        </div>
        <div className="recent-row">
          <span className="recent-tag">Cập nhật gần đây</span>
          <div className="recent-item">
            <div className="recent-icon good"><Check /></div>
            <div>
              <strong>{count ? `Đã đồng bộ ${count} tiết` : "Sẵn sàng đồng bộ lịch"}</strong>
              <small>{count ? "Dữ liệu đã phân tích từ HTML của cổng đào tạo" : "Bấm phân tích lịch để bắt đầu"}</small>
            </div>
          </div>
        </div>
      </section>

      <ErrorDialog
        isOpen={Boolean(errorDialog)}
        title={errorDialog?.title}
        message={errorDialog?.message}
        code={errorDialog?.code}
        type={errorDialog?.type || "error"}
        onClose={() => setErrorDialog(null)}
      />
    </>
  );
}

export default ImportPage;
