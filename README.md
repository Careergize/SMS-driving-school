# SMS Motor Driving School

React and Tailwind CSS website.

The public pages now use the DriCub demo templates in `theme/pages`, with their images, fonts, styles and scripts bundled under `public/dricub-assets`. The SMS logo and the supplied road-training image are local assets. The Vite build copies these pages into `dist`; the existing student registration and staff portal remain available. Public theme forms submit to the existing SMS enquiry API.

## Run with Django locally

Follow the [backend setup](../Backend/README.md) to migrate, seed the demo data, and create a staff account. Run Django at `http://127.0.0.1:8011`.

In a second PowerShell window, from the frontend directory:

```powershell
npm ci
npm run build
npm run dev
```

Open [the website](http://127.0.0.1:4173) or [the staff portal](http://127.0.0.1:4173/login). Sign in with the Django staff account. Website enquiries appear under **Enquiries** in the portal. The dashboard, directory, and calendar read from Django. The calendar opens on the report snapshot week so the seeded lessons are visible.

Use `npm run dev:site` for public-site editing with live reload. Both local frontend servers use the Django catalogue and enquiry endpoints. Set `SMS_BACKEND_URL` in the frontend terminal before startup if Django listens on a different origin.

Copy `.env.example` to `.env.local` to set contact details. An explicit `VITE_SMS_ENQUIRY_URL` takes precedence over local enquiry delivery. Standalone static builds use the bundled catalogue and the configured enquiry endpoint, WhatsApp, email, or downloadable draft.
## Serve the staff portal in production

The static `dist` upload serves the public website. Staff sign-in and dashboard requests require the Node server and a running Django backend.

On the server, build the frontend and run `npm run dev` under a process manager from the frontend directory. Set `SMS_BACKEND_URL` if Django uses a different origin from `http://127.0.0.1:8011`. Keep Node and Django on private interfaces behind the HTTPS web server.

Keep the public site's static configuration and forward these paths to Node. For Nginx, with Node on its default port, add this inside the existing HTTPS server block:

```nginx
location ~ ^/(login$|student-login$|dashboard$|logout$|vehicle-bills/|assistant-reports/|licence-documents/|licence-export\.(xlsx|pdf)$) {
    proxy_pass http://127.0.0.1:4173;
    proxy_set_header Host 127.0.0.1:4173;
}
```

The upstream Host header matches the Node server's local host check. Serve the full `dist` directory for the shared logo, photos, and JavaScript assets. After applying the configuration, open `/login` on the live site, sign in with a Django staff account, and verify the dashboard and sign-out redirect.

## Live Google reviews

The homepage includes a testimonial slider above the training banner. It loads the Vanchiyoor listing automatically without a branch selector. It requests fresh reviews from `/api/google-reviews/` as the panel approaches the viewport. Google Places API (New) returns up to five reviews sorted by relevance, rather than the complete review history. Author attribution, source links, rating totals and translations are retained. Review content is not saved or cached by the application.

To enable live data, put a server-restricted Google Places API (New) key and each branch's verified Place ID in the ignored `.env.local`, using the `GOOGLE_PLACES_API_KEY` and `GOOGLE_PLACE_ID_*` names in `.env.example`. Enable Places API (New) and billing in the associated Google Cloud project. Keep the key server-side; never use a `VITE_` prefix. Verify each Place ID belongs to the correct SMS branch using Google's Place ID finder. Restart the Node server after changing configuration. Missing branch configuration or a Google error displays a direct Google reviews link without invented testimonials or ratings.

The reviews field uses Google's Enterprise + Atmosphere billing tier. Configure Cloud API quotas and key restrictions for your server. The local server limits upstream calls to `GOOGLE_REVIEWS_REQUESTS_PER_MINUTE` (default 30) and combines simultaneous requests to the same branch. Set a suitable limit for production traffic. Serve this API through Node; a static-only upload cannot fetch private-key Google data. Add `/api/google-reviews/` to the HTTPS reverse proxy using the same upstream settings shown above. Maintain your site's public privacy policy and terms to cover the Google Maps service. See [Place Details](https://developers.google.com/maps/documentation/places/web-service/place-details) and [Google attribution requirements](https://developers.google.com/maps/documentation/places/web-service/policies).

Run the isolated API checks with `node --test google-reviews.test.mjs`. Their response fixtures are used only in tests and never displayed on the website.

## Ask Maya

Open **Ask Maya** at the lower right of any dashboard page. The staff assistant reads the current Django records for attendance, pending and paid fees, driving lessons, fuel, and other dashboard reports. Include a branch, date in `YYYY-MM-DD`, or month such as `November 2026` to narrow the request. Each reply offers a PDF of its report. The portal keeps up to 20 replies for the current sign-in session.

For general questions and additional phrasing, run a local Ollama model and set `SMS_ASSISTANT_MODEL` to its installed model name before starting the preview. Only the question is passed to the local model. Dashboard records are queried separately through the staff APIs.
