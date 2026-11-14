# SMS Motor Driving School

React and Tailwind CSS website.

## Run with Django locally

Follow the [backend setup](../Backend/README.md) to migrate, seed the demo data, and create a staff account. Run Django at `http://127.0.0.1:8000`.

In a second PowerShell window, from the frontend directory:

```powershell
npm ci
npm run build
npm run dev
```

Open [the website](http://127.0.0.1:4173) or [the staff portal](http://127.0.0.1:4173/login). Sign in with the Django staff account. Website enquiries appear under **Enquiries** in the portal. The dashboard, directory, and calendar read from Django. The calendar opens on the report snapshot week so the seeded lessons are visible.

Use `npm run dev:site` for public-site editing with live reload. Both local frontend servers use the Django catalogue and enquiry endpoints. Set `SMS_BACKEND_URL` in the frontend terminal before startup if Django listens on a different origin.

Copy `.env.example` to `.env.local` to set contact details. An explicit `VITE_SMS_ENQUIRY_URL` takes precedence over local enquiry delivery. Standalone static builds use the bundled catalogue and the configured enquiry endpoint, WhatsApp, email, or downloadable draft.
## Ask Maya

Open **Ask Maya** at the lower right of any dashboard page. The staff assistant reads the current Django records for attendance, pending and paid fees, driving lessons, fuel, and other dashboard reports. Include a branch, date in `YYYY-MM-DD`, or month such as `November 2026` to narrow the request. Each reply offers a PDF of its report. The portal keeps up to 20 replies for the current sign-in session.

For general questions and additional phrasing, run a local Ollama model and set `SMS_ASSISTANT_MODEL` to its installed model name before starting the preview. Only the question is passed to the local model. Dashboard records are queried separately through the staff APIs.
