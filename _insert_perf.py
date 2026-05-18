# -*- coding: utf-8 -*-
from pathlib import Path

root = Path(__file__).parent
html_path = root / 'dashboard-complete.html'
html = html_path.read_text(encoding='utf-8')

section = '''
            <!-- Đánh giá hiệu suất -->
            <section class="perf-eval-section">
                <motion.div class="perf-eval-title">ĐÁNH GIÁ HIỆU SUẤT</div>
                <div class="best-performer-card">
                    <div class="best-performer-head">
                        <i class="fas fa-trophy"></i>
                        NGƯỜI ĐĂNG HIỆU SUẤT TỐT NHẤT THÁNG NÀY
                    </div>
                    <div id="bestPerformerContent" class="best-performer-body">
                        <div class="best-performer-placeholder">
                            <i class="fas fa-hourglass-half"></i>
                            Chờ cột «Người phụ trách» từ sheet. Dashboard tự hiển thị sau khi có data.
                        </div>
                    </div>
                </div>
                <div class="perf-eval-grid">
                    <div class="perf-eval-card">
                        <div class="perf-eval-card-head">
                            <h3><i class="fas fa-bullhorn"></i> HIỆU SUẤT KÊNH</h3>
                        </div>
                        <div class="perf-table-wrap">
                            <table class="perf-table">
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>KÊNH</th>
                                        <th class="num">BÀI</th>
                                        <th class="num">VIEWS</th>
                                        <th class="num">TƯƠNG TÁC</th>
                                        <th class="num">ĐIỂM</th>
                                        <th>XẾP LOẠI</th>
                                    </tr>
                                </thead>
                                <tbody id="perfChannelBody"></tbody>
                            </table>
                        </div>
                        <div class="perf-legend">
                            <span><i style="background:#ffd54f;"></i> S &gt;90</span>
                            <span><i style="background:#81c784;"></i> A 70–89</span>
                            <span><i style="background:#64b5f6;"></i> B 50–69</span>
                            <span><i style="background:#ffb74d;"></i> C 30–49</span>
                            <span><i style="background:#e57373;"></i> D &lt;30</span>
                        </div>
                    </div>
                    <div class="perf-eval-card">
                        <div class="perf-eval-card-head">
                            <h3><i class="fas fa-user"></i> HIỆU SUẤT NHÂN SỰ</h3>
                            <span class="perf-eval-sub" id="perfStaffSubtitle">Tạm theo kênh</span>
                        </div>
                        <div class="perf-table-wrap">
                            <table class="perf-table">
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>NGƯỜI / KÊNH</th>
                                        <th class="num">BÀI T.NÀY</th>
                                        <th class="num">VIEWS</th>
                                        <th class="num">VS T.TRƯỚC</th>
                                        <th class="num">KPI%</th>
                                        <th class="num">ĐIỂM</th>
                                        <th>XẾP LOẠI</th>
                                        <th>CHI TIẾT</th>
                                    </tr>
                                </thead>
                                <tbody id="perfStaffBody"></tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </section>
'''.replace('motion.div', 'div')

js = (root / '_perf_js.txt').read_text(encoding='utf-8')

if 'perf-eval-section' not in html:
    marker = '            <!-- Table Section -->\n            <motion.div class="table-section">'.replace('motion.div', 'motion.div')
    marker = '            <!-- Table Section -->\n            <div class="table-section">'
    html = html.replace(marker, section + '\n' + marker)

if 'function bindPerformanceEvaluation' not in html:
    html = html.replace('        function bindChannelTable(rows) {', js + '\n        function bindChannelTable(rows) {')

for bad in [
    "            html = html.replace(/<motion\\.div/g, '<div').replace(/<\\/motion\\.div>/g, '</div>')\n",
    "            html = html.replace(/<motion\\.motion.div/g, '<motion.div').replace(/<\\/motion\\.div>/g, '</div>')\n",
]:
    html = html.replace(bad, '')

if 'bindPerformanceEvaluation(rows)' not in html and 'function bindPerformanceEvaluation' in html:
    html = html.replace(
        "            try { bindChannelTable(rows); } catch (e) { console.error('bindChannelTable', e); }",
        "            try { bindPerformanceEvaluation(rows); } catch (e) { console.error('bindPerformanceEvaluation', e); }\n"
        "            try { bindChannelTable(rows); } catch (e) { console.error('bindChannelTable', e); }"
    )

if "bindPerformanceEvaluation([])" not in html:
    html = html.replace(
        "                setText('kpiEngagementRate', '—');\n                return;",
        "                setText('kpiEngagementRate', '—');\n                try { bindPerformanceEvaluation([]); } catch (e) {}\n                return;"
    )

html = html.replace('motion.div', 'div')

html_path.write_text(html, encoding='utf-8')
print('OK')
