# -*- coding: utf-8 -*-
from pathlib import Path

root = Path(__file__).parent
js = (root / '_kpi_settings.js').read_text(encoding='utf-8')

html_path = root / 'dashboard-complete.html'
text = html_path.read_text(encoding='utf-8')

anchor = "const API_URL = `https://api.appsheet.com/api/v2/apps/${APP_ID}/tables/${encodeURIComponent(TABLE_NAME)}/Action`;\n"
if 'KPI_TABLE_NAME' not in text:
    text = text.replace(anchor, anchor + js)

bind_anchor = "            setText('kpiEngagementRate', rate > 0 ? formatNum(rate, 1) + '%' : (engCols.reachCol ? formatNum(0, 1) + '%' : '—'));\n        }\n\n        function bindChannelTable"
if 'bindKpiTargetProgress(rows)' not in text:
    text = text.replace(
        bind_anchor,
        "            setText('kpiEngagementRate', rate > 0 ? formatNum(rate, 1) + '%' : (engCols.reachCol ? formatNum(0, 1) + '%' : '—'));\n            bindKpiTargetProgress(rows);\n        }\n\n        function bindChannelTable"
    )

fetch_anchor = "                setupDateFilterBounds();\n                applyDashboardFilters();"
if 'await loadKpiTargetsForMonth' not in text:
    text = text.replace(
        fetch_anchor,
        "                setupDateFilterBounds();\n                const kpiSel = getDefaultKpiMonthSelection();\n                await loadKpiTargetsForMonth(kpiSel.year, kpiSel.month);\n                applyDashboardFilters();"
    )

load_anchor = "        window.addEventListener('load', fetchReportData);"
if 'initKpiSettingsUi();' not in text:
    text = text.replace(load_anchor, "        initKpiSettingsUi();\n" + load_anchor)

bad_line = "            html = html.replace(/<motion\\.div/g, '<motion.div').replace(/<\\/motion\\.motion.div>/g, '</div>')\n"
text = text.replace(bad_line, "")
bad_line2 = "            html = html.replace(/<motion\\.motion.div/g, '<div').replace(/<\\/motion\\.div>/g, '</div>')\n"
text = text.replace(bad_line2, "")
bad_line3 = "            html = html.replace(/<motion\\.div/g, '<div').replace(/<\\/motion\\.motion.div>/g, '</div>')\n"
text = text.replace(bad_line3, "")

html_path.write_text(text, encoding='utf-8')
print('OK')
