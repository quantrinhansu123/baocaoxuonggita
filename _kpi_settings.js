
        const KPI_TABLE_NAME = 'KPIs';
        const KPI_API_URL = `https://api.appsheet.com/api/v2/apps/${APP_ID}/tables/${encodeURIComponent(KPI_TABLE_NAME)}/Action`;
        const KPI_KEY_COLUMN = 'ID';
        const KPI_COL = {
            key: ['id'],
            channel: ['kênh', 'kenh', 'channel'],
            month: ['tháng', 'thang', 'month'],
            year: ['năm', 'nam', 'year'],
            posts: ['tổng số bài', 'tong so bai', 'mục tiêu bài', 'muc tieu bai'],
            views: ['mục tiêu lượt xem', 'muc tieu luot xem', 'mục tiêu view', 'muc tieu view'],
            engagement: ['mục tiêu tương tác', 'muc tieu tuong tac']
        };

        const DEFAULT_KPI_CHANNELS = [
            { channel: 'FB Guitar Sài Thành', posts: 12, views: 50000 },
            { channel: 'YouTube Guitar Sài Thành', posts: 4, views: 80000 },
            { channel: 'FB Academy', posts: 6, views: 20000 },
            { channel: 'FB Giá Tận Xưởng', posts: 4, views: 15000 },
            { channel: 'FB Thanh Lý Đàn Giá Rẻ', posts: 4, views: 15000 },
            { channel: 'TikTok Store', posts: 6, views: 40000 }
        ];

        const DEFAULT_KPI_TOTALS = { posts: 35, views: 200000, engagement: 5000 };

        let kpiTableData = [];
        let kpiColumnKeys = {};
        let kpiTargetCache = { year: null, month: null, totals: { posts: 0, views: 0, engagement: 0 }, channels: [] };

        function showDashToast(message, type) {
            const box = document.getElementById('dashToastContainer');
            if (!box) return;
            const el = document.createElement('div');
            el.className = 'dash-toast ' + (type || 'success');
            el.textContent = message;
            box.appendChild(el);
            setTimeout(function() { el.remove(); }, 4000);
        }

        function buildKpiColumnKeys(row) {
            const map = {};
            for (const name of Object.keys(KPI_COL)) {
                const aliases = KPI_COL[name];
                map[name] = findExactColKey(row, aliases) || findColKey(row, aliases);
            }
            return map;
        }

        function isKpiTotalRow(row) {
            const id = String(row[KPI_KEY_COLUMN] ?? row[kpiColumnKeys.key] ?? '').toUpperCase();
            if (id.endsWith('-TOTAL')) return true;
            const chKey = kpiColumnKeys.channel;
            const ch = chKey ? String(row[chKey] ?? '').trim() : '';
            return !ch;
        }

        function slugifyChannelId(name) {
            const s = norm(name).replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
            return s || 'kenh';
        }

        function monthYearKey(year, month) {
            return year + '-' + String(month).padStart(2, '0');
        }

        function engagementStorageKey(year, month) {
            return 'streal_kpi_engagement_' + monthYearKey(year, month);
        }

        function getEngagementTarget(year, month) {
            const raw = localStorage.getItem(engagementStorageKey(year, month));
            const n = parseNum(raw);
            return n > 0 ? n : 0;
        }

        function setEngagementTarget(year, month, value) {
            localStorage.setItem(engagementStorageKey(year, month), String(parseNum(value)));
        }

        async function appsheetKpiRequest(action, rows) {
            const response = await fetch(KPI_API_URL, {
                method: 'POST',
                headers: { 'ApplicationAccessKey': API_KEY, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    Action: action,
                    Properties: { Locale: 'vi-VN', Timezone: 'Asia/Ho_Chi_Minh' },
                    Rows: rows
                })
            });
            if (!response.ok) {
                let msg = await response.text();
                try {
                    const j = JSON.parse(msg);
                    if (j.detail) msg = j.detail;
                    else if (j.Message) msg = j.Message;
                } catch (e) { /* keep */ }
                throw new Error(msg);
            }
            try { return await response.json(); } catch (e) { return null; }
        }

        async function fetchKpiTableData() {
            try {
                const data = await appsheetKpiRequest('Find', []);
                kpiTableData = Array.isArray(data) ? data : [];
                if (kpiTableData.length) kpiColumnKeys = buildKpiColumnKeys(kpiTableData[0]);
                else kpiColumnKeys = {};
                return kpiTableData;
            } catch (err) {
                console.error('fetchKpiTableData', err);
                kpiTableData = [];
                return [];
            }
        }

        function parseKpiMonthYear(row) {
            const mCol = kpiColumnKeys.month;
            const yCol = kpiColumnKeys.year;
            return {
                month: parseNum(mCol ? row[mCol] : 0),
                year: parseNum(yCol ? row[yCol] : 0)
            };
        }

        function buildKpiTargetFromRows(rows, year, month) {
            const totals = { posts: 0, views: 0, engagement: getEngagementTarget(year, month) };
            const channels = [];
            const pCol = kpiColumnKeys.posts;
            const vCol = kpiColumnKeys.views;
            const cCol = kpiColumnKeys.channel;
            const eCol = kpiColumnKeys.engagement;

            rows.forEach(function(row) {
                const my = parseKpiMonthYear(row);
                if (my.month !== month || my.year !== year) return;
                if (isKpiTotalRow(row)) {
                    totals.posts = parseNum(pCol ? row[pCol] : 0);
                    totals.views = parseNum(vCol ? row[vCol] : 0);
                    if (eCol && row[eCol] != null && row[eCol] !== '') totals.engagement = parseNum(row[eCol]);
                } else if (cCol) {
                    channels.push({
                        channel: String(row[cCol] ?? '').trim(),
                        posts: parseNum(pCol ? row[pCol] : 0),
                        views: parseNum(vCol ? row[vCol] : 0)
                    });
                }
            });

            return { year: year, month: month, totals: totals, channels: channels };
        }

        function getDefaultKpiMonthSelection() {
            const fromEl = document.getElementById('dateFrom');
            if (fromEl && fromEl.value) {
                const parts = fromEl.value.split('-').map(Number);
                if (parts[0] && parts[1]) return { year: parts[0], month: parts[1] };
            }
            const now = new Date();
            return { year: now.getFullYear(), month: now.getMonth() + 1 };
        }

        async function loadKpiTargetsForMonth(year, month) {
            await fetchKpiTableData();
            const cached = buildKpiTargetFromRows(kpiTableData, year, month);
            if (!cached.totals.posts && !cached.totals.views && !cached.channels.length) {
                cached.totals = Object.assign({}, DEFAULT_KPI_TOTALS);
                cached.channels = DEFAULT_KPI_CHANNELS.map(function(c) { return Object.assign({}, c); });
            }
            kpiTargetCache = cached;
            return cached;
        }

        function renderKpiChannelRows(channels) {
            const tbody = document.getElementById('kpiChannelRows');
            if (!tbody) return;
            tbody.innerHTML = '';
            const list = channels.length ? channels : [{ channel: '', posts: '', views: '' }];
            list.forEach(function(row) {
                const tr = document.createElement('tr');
                tr.innerHTML =
                    '<td><input type="text" class="kpi-ch-name" value="' + escapeHtml(row.channel || '') + '" placeholder="Tên kênh"></td>' +
                    '<td><input type="number" class="kpi-ch-posts" min="0" value="' + (row.posts !== '' && row.posts != null ? row.posts : '') + '" placeholder="0"></td>' +
                    '<td><input type="number" class="kpi-ch-views" min="0" value="' + (row.views !== '' && row.views != null ? row.views : '') + '" placeholder="0"></td>' +
                    '<td><button type="button" class="kpi-channel-del" title="Xóa dòng">&times;</button></td>';
                tr.querySelector('.kpi-channel-del').addEventListener('click', function() {
                    tr.remove();
                    if (!tbody.querySelector('tr')) renderKpiChannelRows([{ channel: '', posts: '', views: '' }]);
                });
                tbody.appendChild(tr);
            });
        }

        function collectKpiChannelRowsFromForm() {
            const rows = [];
            document.querySelectorAll('#kpiChannelRows tr').forEach(function(tr) {
                const channel = (tr.querySelector('.kpi-ch-name') || {}).value;
                const ch = channel ? channel.trim() : '';
                if (!ch) return;
                rows.push({
                    channel: ch,
                    posts: parseNum((tr.querySelector('.kpi-ch-posts') || {}).value),
                    views: parseNum((tr.querySelector('.kpi-ch-views') || {}).value)
                });
            });
            return rows;
        }

        function fillKpiSettingsForm(target) {
            const monthEl = document.getElementById('kpiTargetMonth');
            if (monthEl) monthEl.value = monthYearKey(target.year, target.month);
            const postsEl = document.getElementById('kpiTotalPosts');
            const viewsEl = document.getElementById('kpiTotalViews');
            const engEl = document.getElementById('kpiTotalEngagement');
            if (postsEl) postsEl.value = target.totals.posts || '';
            if (viewsEl) viewsEl.value = target.totals.views || '';
            if (engEl) engEl.value = target.totals.engagement || '';
            renderKpiChannelRows(target.channels);
        }

        async function openKpiSettingsModal() {
            const sel = getDefaultKpiMonthSelection();
            const target = await loadKpiTargetsForMonth(sel.year, sel.month);
            fillKpiSettingsForm(target);
            const overlay = document.getElementById('kpiSettingsOverlay');
            if (overlay) {
                overlay.classList.add('show');
                overlay.setAttribute('aria-hidden', 'false');
            }
        }

        function closeKpiSettingsModal() {
            const overlay = document.getElementById('kpiSettingsOverlay');
            if (overlay) {
                overlay.classList.remove('show');
                overlay.setAttribute('aria-hidden', 'true');
            }
        }

        function applyDefaultKpiSettings() {
            const sel = getDefaultKpiMonthSelection();
            fillKpiSettingsForm({
                year: sel.year,
                month: sel.month,
                totals: Object.assign({}, DEFAULT_KPI_TOTALS),
                channels: DEFAULT_KPI_CHANNELS.map(function(c) { return Object.assign({}, c); })
            });
        }

        async function saveKpiSettings() {
            const monthEl = document.getElementById('kpiTargetMonth');
            if (!monthEl || !monthEl.value) {
                showDashToast('Chọn tháng KPI', 'error');
                return;
            }
            const parts = monthEl.value.split('-').map(Number);
            const year = parts[0];
            const month = parts[1];
            if (!year || !month) return;

            const totals = {
                posts: parseNum(document.getElementById('kpiTotalPosts') && document.getElementById('kpiTotalPosts').value),
                views: parseNum(document.getElementById('kpiTotalViews') && document.getElementById('kpiTotalViews').value),
                engagement: parseNum(document.getElementById('kpiTotalEngagement') && document.getElementById('kpiTotalEngagement').value)
            };
            const channels = collectKpiChannelRowsFromForm();
            const saveBtn = document.getElementById('kpiSaveBtn');
            if (saveBtn) {
                saveBtn.disabled = true;
                saveBtn.textContent = 'Đang lưu...';
            }

            try {
                await fetchKpiTableData();
                const pCol = kpiColumnKeys.posts || 'Tổng số bài';
                const vCol = kpiColumnKeys.views || 'Mục tiêu lượt xem';
                const cCol = kpiColumnKeys.channel || 'Kênh';
                const mCol = kpiColumnKeys.month || 'Tháng';
                const yCol = kpiColumnKeys.year || 'Năm';
                const eCol = kpiColumnKeys.engagement;

                const existing = kpiTableData.filter(function(row) {
                    const my = parseKpiMonthYear(row);
                    return my.month === month && my.year === year;
                });

                for (const row of existing) {
                    const id = row[KPI_KEY_COLUMN] || row[kpiColumnKeys.key];
                    if (id) await appsheetKpiRequest('Delete', [{ ID: id }]);
                }

                const prefix = monthYearKey(year, month);
                const rowsToAdd = [];

                const totalRow = {};
                totalRow[KPI_KEY_COLUMN] = prefix + '-TOTAL';
                totalRow[cCol] = '';
                totalRow[mCol] = month;
                totalRow[yCol] = year;
                totalRow[pCol] = totals.posts;
                totalRow[vCol] = totals.views;
                if (eCol) totalRow[eCol] = totals.engagement;
                rowsToAdd.push(totalRow);

                channels.forEach(function(ch, i) {
                    const r = {};
                    r[KPI_KEY_COLUMN] = prefix + '-CH-' + slugifyChannelId(ch.channel) + '-' + (i + 1);
                    r[cCol] = ch.channel;
                    r[mCol] = month;
                    r[yCol] = year;
                    r[pCol] = ch.posts;
                    r[vCol] = ch.views;
                    rowsToAdd.push(r);
                });

                if (rowsToAdd.length) await appsheetKpiRequest('Add', rowsToAdd);
                setEngagementTarget(year, month, totals.engagement);

                kpiTargetCache = { year: year, month: month, totals: totals, channels: channels };
                showDashToast('Đã lưu KPI lên bảng KPIs', 'success');
                closeKpiSettingsModal();
                bindDashboard(getFilteredReportRows());
            } catch (err) {
                console.error(err);
                showDashToast('Lỗi lưu KPI: ' + (err.message || err), 'error');
            } finally {
                if (saveBtn) {
                    saveBtn.disabled = false;
                    saveBtn.innerHTML = '<i class="fas fa-floppy-disk"></i> Lưu KPI';
                }
            }
        }

        function bindKpiTargetProgress(rows) {
            const sel = getDefaultKpiMonthSelection();
            const targets = (kpiTargetCache.month === sel.month && kpiTargetCache.year === sel.year)
                ? kpiTargetCache : null;
            if (!targets || (!targets.totals.posts && !targets.totals.views)) return;

            const viewCol = columnKeys.views || findColKey(rows[0] || {}, ['view']);
            const dataRows = rows.filter(function(r) { return !isTotalRow(r); });
            const posts = dataRows.length;
            const views = viewCol ? dataRows.reduce(function(a, r) { return a + parseNum(r[viewCol]); }, 0) : 0;
            const engCols = getEngagementCols(dataRows[0] || rows[0] || {});
            const likes = engCols.likeCol ? dataRows.reduce(function(a, r) { return a + parseNum(r[engCols.likeCol]); }, 0) : 0;
            const shares = engCols.shareCol ? dataRows.reduce(function(a, r) { return a + parseNum(r[engCols.shareCol]); }, 0) : 0;
            const comments = columnKeys.comments ? dataRows.reduce(function(a, r) { return a + parseNum(r[columnKeys.comments]); }, 0) : 0;
            const engagement = likes + shares + comments;

            updateKpiProgressEl('kpiPostsChange', posts, targets.totals.posts);
            updateKpiProgressEl('kpiViewsChange', views, targets.totals.views);
            updateKpiProgressEl('kpiEngagementChange', engagement, targets.totals.engagement || getEngagementTarget(sel.year, sel.month));
        }

        function updateKpiProgressEl(id, actual, target) {
            const el = document.getElementById(id);
            if (!el || !target) return;
            const pct = target > 0 ? (actual / target) * 100 : 0;
            const met = actual >= target;
            el.innerHTML = '<i class="fas fa-' + (met ? 'check-circle' : 'chart-line') + '"></i> ' +
                formatNum(pct, 1) + '% <span class="label">đạt mục tiêu (' + formatNum(target) + ')</span>';
            el.style.color = met ? '#43a047' : '#888';
        }

        function initKpiSettingsUi() {
            const btn = document.getElementById('kpiSettingsBtn');
            if (btn) btn.addEventListener('click', openKpiSettingsModal);
            const closeBtn = document.getElementById('kpiSettingsClose');
            if (closeBtn) closeBtn.addEventListener('click', closeKpiSettingsModal);
            const overlay = document.getElementById('kpiSettingsOverlay');
            if (overlay) {
                overlay.addEventListener('click', function(e) {
                    if (e.target.id === 'kpiSettingsOverlay') closeKpiSettingsModal();
                });
            }
            const addBtn = document.getElementById('kpiAddChannelBtn');
            if (addBtn) {
                addBtn.addEventListener('click', function() {
                    const channels = collectKpiChannelRowsFromForm();
                    channels.push({ channel: '', posts: '', views: '' });
                    renderKpiChannelRows(channels);
                });
            }
            const resetBtn = document.getElementById('kpiResetDefaultsBtn');
            if (resetBtn) resetBtn.addEventListener('click', applyDefaultKpiSettings);
            const saveBtn = document.getElementById('kpiSaveBtn');
            if (saveBtn) saveBtn.addEventListener('click', saveKpiSettings);
            const monthInput = document.getElementById('kpiTargetMonth');
            if (monthInput) {
                monthInput.addEventListener('change', async function(e) {
                    if (!e.target.value) return;
                    const p = e.target.value.split('-').map(Number);
                    const target = await loadKpiTargetsForMonth(p[0], p[1]);
                    fillKpiSettingsForm(target);
                });
            }
        }
