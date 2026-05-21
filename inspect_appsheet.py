import json
import urllib.request

url = 'https://api.appsheet.com/api/v2/apps/fb394ab7-2164-4da6-a15e-9e06fefaccb0/tables/Input/Action'
req = urllib.request.Request(
    url,
    data=json.dumps({
        'Action': 'Find',
        'Properties': {'Locale': 'vi-VN', 'Timezone': 'Asia/Ho_Chi_Minh'},
        'Rows': []
    }).encode('utf-8'),
    method='POST',
    headers={
        'ApplicationAccessKey': 'V2-wpK1r-oW88b-9sL5Z-DMxbg-zUWg1-FX50y-91Plm-sPMOc',
        'Content-Type': 'application/json'
    }
)
with urllib.request.urlopen(req, timeout=30) as resp:
    data = json.loads(resp.read().decode('utf-8'))
    print(type(data).__name__, len(data))
    if data:
        row = data[0]
        print('first row keys:')
        for key in list(row.keys())[:40]:
            print(repr(key))
        print('\nunique date-like keys:')
        keys = [key for key in row.keys() if 'ngày' in key.lower() or 'ngay' in key.lower() or 'dang' in key.lower()]
        for key in keys:
            print(repr(key))
        print('\nrows with May 2026 dates:')
        may_count = sum(1 for r in data if any(str(r.get(k, '')).startswith('05/2026') or (str(r.get(k, '')).startswith('05/') and '2026' in str(r.get(k, ''))) for k in r))
        print(may_count)
