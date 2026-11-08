# SMS Motor Driving School

React and Tailwind CSS website.

Run `npm ci` and `npm run dev` for local development. Run `npm run build` to create the deployable site in `dist/`.

Copy `.env.example` to `.env.local` and fill in the SMS contact details. Vite reads these values at build time. Use a WhatsApp number with its country code. For enquiry delivery, configure a JSON POST endpoint, WhatsApp, or email. The endpoint should accept name, phone, email, programme and message, and allow requests from the site origin. The form prepares a downloadable draft when no delivery channel is configured.

Edit `src/content.js` to update the programmes, FAQs and articles. Confirm SMS's actual services, fees and availability before sharing the website with customers.
