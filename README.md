# FOIA Command Dashboard

Static prototype dashboard for Illinois State Police FOIA tracking.

## Files

- `index.html` - Dashboard markup and layout
- `style.css` - Executive dashboard styling, dark mode, and presentation mode visuals
- `app.js` - Dashboard logic, KPI calculations, search/filter behavior, and detail panel rendering
- `foia-data.json` - Temporary FOIA data source with sample requests

## Run locally

Because `app.js` loads `foia-data.json` with `fetch`, run the dashboard through a local web server:

```bash
cd /home/runner/work/foia-command-dashboard/foia-command-dashboard
python3 -m http.server 8000
```

Then open `http://localhost:8000/index.html` in your browser.
