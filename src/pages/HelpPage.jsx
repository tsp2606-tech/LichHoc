import { ArrowDownToLine, CircleHelp, Puzzle } from "lucide-react";

const extensionUrl = "/lichhoc-extension.zip";

export default function HelpPage() {
  return (
    <section className="help-page">
      <div className="help-heading">
        <span className="help-icon"><CircleHelp size={21} /></span>
        <div>
          <p className="eyebrow">TRUNG TÂM TRỢ GIÚP</p>
          <h1>Trợ giúp &amp; hướng dẫn</h1>
          <p>Cài tiện ích LichHoc để đồng bộ thời khóa biểu từ cổng MyDTU.</p>
        </div>
      </div>

      <section className="help-extension panel" aria-labelledby="extension-title">
        <div className="help-extension-copy">
          <span className="help-icon help-extension-icon"><Puzzle size={22} /></span>
          <div>
            <h2 id="extension-title">Tiện ích LichHoc cho Chrome</h2>
            <p>Tải tiện ích về máy, sau đó thêm vào Chrome để đồng bộ lịch học từ MyDTU.</p>
          </div>
        </div>
        <a className="button primary help-download" href={extensionUrl} download="lichhoc-extension.zip">
          <ArrowDownToLine size={17} /> Tải extension
        </a>
      </section>

      <section className="panel help-install" aria-labelledby="install-title">
        <h2 id="install-title">Cách thêm extension vào Chrome</h2>
        <ol>
          <li><b>Tải và giải nén</b><span>Nhấn “Tải extension”, sau đó giải nén tệp ZIP vừa tải về.</span></li>
          <li><b>Mở trang tiện ích</b><span>Truy cập <code>chrome://extensions</code> trên Chrome và bật “Chế độ dành cho nhà phát triển”.</span></li>
          <li><b>Thêm tiện ích</b><span>Chọn “Tải tiện ích đã giải nén” rồi chọn thư mục vừa giải nén có chứa <code>manifest.json</code>.</span></li>
          <li><b>Đồng bộ thời khóa biểu</b><span>Mở cổng MyDTU, vào trang thời khóa biểu rồi chọn biểu tượng LichHoc trên thanh công cụ Chrome.</span></li>
        </ol>
      </section>
    </section>
  );
}
