// ── PRODUCT CATALOGUE ────────────────────────────────────────────────────────
// To add a future product: add an entry here and upload the file to R2.
const PRODUCTS = {
  'holistic-sick-day-protocol': {
    r2Key:       'holistic-sick-day-protocol.pdf',
    displayName: 'Holistic Sick Day Protocol',
  },
};

// ── ENTRY POINT ───────────────────────────────────────────────────────────────
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // PayPal redirects buyer here after payment with ?token=ORDER_ID
    if (request.method === 'GET' && url.pathname === '/verify') {
      return handleVerify(url, env);
    }

    // Buyer lands here with their one-time download token
    if (request.method === 'GET' && url.pathname === '/get') {
      return handleDownload(url, env);
    }

    return new Response('Not found', { status: 404 });
  },
};

// ── PAYMENT VERIFICATION ──────────────────────────────────────────────────────
async function handleVerify(url, env) {
  // PayPal passes the order ID as ?token= on the return URL
  const paypalOrderId = url.searchParams.get('token');

  if (!paypalOrderId) {
    return errorPage(
      'No payment information found.',
      'If you completed your payment, please reach out on social media with your PayPal receipt and I\'ll get your download to you personally.',
    );
  }

  // Confirm the order is genuinely completed via PayPal API
  let order;
  try {
    const accessToken = await getPayPalAccessToken(env);
    order = await getPayPalOrder(paypalOrderId, accessToken);
  } catch (err) {
    console.error('PayPal API error:', err);
    return errorPage(
      'Could not verify your payment right now.',
      'Please reach out on social media with your PayPal receipt and I\'ll sort it out for you.',
    );
  }

  if (order.status !== 'COMPLETED') {
    return errorPage(
      'Payment not completed yet.',
      'If you believe this is an error, please reach out on social media with your PayPal receipt.',
    );
  }

  // Guard against replayed order IDs — one order = one download token
  const existingToken = await env.DOWNLOAD_TOKENS.get(`order:${paypalOrderId}`);
  if (existingToken) {
    // Order already redeemed — redirect to the existing token so buyer can still download
    return Response.redirect(`https://download.chadneyinc.com/get?token=${existingToken}`, 302);
  }

  // Generate a one-time download token valid for 48 hours
  const downloadToken = crypto.randomUUID();

  await Promise.all([
    // Token → product mapping
    env.DOWNLOAD_TOKENS.put(
      downloadToken,
      JSON.stringify({ product: 'holistic-sick-day-protocol', used: false, createdAt: Date.now() }),
      { expirationTtl: 172800 },
    ),
    // Order ID → token mapping (prevents replay)
    env.DOWNLOAD_TOKENS.put(`order:${paypalOrderId}`, downloadToken, { expirationTtl: 172800 }),
  ]);

  return Response.redirect(`https://download.chadneyinc.com/get?token=${downloadToken}`, 302);
}

// ── DOWNLOAD HANDLER ──────────────────────────────────────────────────────────
async function handleDownload(url, env) {
  const token = url.searchParams.get('token');
  if (!token) {
    return errorPage('Invalid download link.', 'Please reach out on social media if you need help.');
  }

  const raw = await env.DOWNLOAD_TOKENS.get(token);
  if (!raw) {
    return errorPage(
      'This link has expired or does not exist.',
      'Download links are valid for 48 hours. Please reach out on social media if you need assistance.',
    );
  }

  const data = JSON.parse(raw);

  if (data.used) {
    return errorPage(
      'This link has already been used.',
      'Each purchase includes one download. Reach out on social media if you need help.',
    );
  }

  const product = PRODUCTS[data.product];
  if (!product) {
    return errorPage('Product not found.', 'Please reach out on social media for assistance.');
  }

  // Mark token used before streaming so a reload can\'t double-download
  await env.DOWNLOAD_TOKENS.put(
    token,
    JSON.stringify({ ...data, used: true, usedAt: Date.now() }),
    { expirationTtl: 172800 },
  );

  const object = await env.PRODUCTS.get(product.r2Key);
  if (!object) {
    return errorPage(
      'File temporarily unavailable.',
      'Please reach out on social media and I\'ll send it to you directly.',
    );
  }

  return new Response(object.body, {
    headers: {
      'Content-Type':        'application/pdf',
      'Content-Disposition': `attachment; filename="${product.displayName}.pdf"`,
      'Cache-Control':       'no-store',
    },
  });
}

// ── PAYPAL HELPERS ────────────────────────────────────────────────────────────
async function getPayPalAccessToken(env) {
  const creds = btoa(`${env.PAYPAL_CLIENT_ID}:${env.PAYPAL_SECRET}`);
  const res = await fetch('https://api-m.paypal.com/v1/oauth2/token', {
    method:  'POST',
    headers: {
      Authorization:  `Basic ${creds}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  const data = await res.json();
  if (!data.access_token) throw new Error('Failed to get PayPal access token');
  return data.access_token;
}

async function getPayPalOrder(orderId, accessToken) {
  const res = await fetch(`https://api-m.paypal.com/v2/checkout/orders/${orderId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return res.json();
}

// ── ERROR PAGE ────────────────────────────────────────────────────────────────
function errorPage(heading, detail) {
  return new Response(
    `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>Oops · CrunchyChadPad</title>
  <style>
    body{font-family:sans-serif;max-width:540px;margin:80px auto;text-align:center;padding:0 24px;color:#333}
    h1{color:#3c2726;font-size:1.4rem}
    p{line-height:1.6;color:#555}
    .back{display:inline-block;margin-top:28px;color:#d18852;text-decoration:none;font-weight:700}
  </style>
</head>
<body>
  <h1>${heading}</h1>
  <p>${detail}</p>
  <a class="back" href="https://chadneyinc.com">← Back to CrunchyChadPad</a>
</body>
</html>`,
    { status: 400, headers: { 'Content-Type': 'text/html' } },
  );
}
