import { escapeHtml } from './backend-api.mjs'

export function renderStudentFees(summary) {
  const money = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 })
  const amount = value => value === null || value === undefined || value === '' || !Number.isFinite(Number(value)) ? null : Number(value)
  const balance = amount(summary.pending_fees)
  const total = amount(summary.total_fee)
  const paid = amount(summary.amount_paid)
  return `<section id="student-fees" class="student-fees" aria-labelledby="student-fees-title">
    <div class="crm-intro"><h1 id="student-fees-title">Fee</h1><p>Your course fees and payment details.</p></div>
    <div class="crm-kpis" aria-label="Fee summary">
      ${[['Total fee', total], ['Amount paid', paid], ['Pending fee', balance]].map(([label, value]) => `<div class="crm-card crm-kpi"><strong>${value === null ? 'Not set' : escapeHtml(money.format(value))}</strong><div>${label}</div></div>`).join('')}
    </div>
    <div class="crm-card student-fee-payment"><h2>Pay your fee</h2>
      ${summary.proof_message ? '<p role="status">' + escapeHtml(summary.proof_message) + '</p>' : ''}
      ${balance === null ? '<p>Your fee details have not been recorded yet. Contact the school to confirm your balance.</p>' : balance <= 0 ? '<p>No fee is currently outstanding.</p>' : '<p>Outstanding balance: <strong>' + escapeHtml(money.format(balance)) + '</strong></p><button type="button" class="student-fee-pay" data-fee-open>Click here to pay</button>'}
      <p>Your balance updates only after the school verifies your payment.</p>
      <a href="tel:+919846024345">Contact school: +91 98460 24345</a>
    </div>
    ${balance !== null && balance > 0 ? `<dialog id="student-fee-dialog" class="student-fee-dialog" aria-labelledby="fee-dialog-title">
      <div class="student-fee-dialog-heading"><h2 id="fee-dialog-title">Pay your fee</h2><button type="button" data-fee-close aria-label="Close payment popup">Close</button></div>
      <p>Pending balance: <strong>${escapeHtml(money.format(balance))}</strong></p>
      <div class="student-payment-qr-frame"><img class="student-payment-qr" src="/student-fee-qr.jpeg" alt="Payment QR code for Varun Vasanthan, UPI ID varun.124150-2@okicici"></div>
      <p class="student-qr-original"><a href="/student-fee-qr.jpeg" target="_blank" rel="noopener noreferrer">Open full-size QR image</a></p>
      <p>Payee: <strong>Varun Vasanthan</strong><br>UPI ID: <strong>varun.124150-2@okicici</strong></p>
      <a class="student-fee-pay" href="upi://pay?pa=varun.124150-2%40okicici&amp;cu=INR">Open UPI app</a>
      <p>Scan the QR code using your UPI app, or save it to open from your app’s gallery. After paying, upload your screenshot below.</p>
      <form method="post" action="/student-login?action=fee-proof#student-fees" enctype="multipart/form-data" class="student-proof-form">
        <label for="fee-amount">Amount paid (₹)</label><input id="fee-amount" name="amount" type="number" min="0.01" step="0.01" max="99999999.99" value="${escapeHtml(String(balance))}" required>
        <label for="fee-reference">UPI transaction reference (optional)</label><input id="fee-reference" name="reference" maxlength="100" autocomplete="off">
        <label for="fee-screenshot">Payment screenshot</label><input id="fee-screenshot" name="document" type="file" accept="image/png,image/jpeg" required><p>PNG or JPEG, up to 5 MB.</p>
        <button type="submit">Upload payment screenshot</button><p>Uploading proof submits it for staff verification. It does not automatically mark your fee as paid.</p>
      </form>
    </dialog><script type="module" src="/student-fees.mjs"></script>` : ''}
    ${summary.payment_proofs?.length ? '<div class="crm-card student-fee-payment"><h2>Submitted payment screenshots</h2><ul>' + summary.payment_proofs.map(proof => '<li>' + escapeHtml(money.format(proof.amount)) + ' · ' + escapeHtml(new Date(proof.created_at).toLocaleDateString('en-IN', {timeZone:'Asia/Kolkata'})) + ' · Submitted for staff review</li>').join('') + '</ul></div>' : ''}
  </section>`
}
