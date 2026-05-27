#!/usr/bin/env bash
# Test MercadoPago card tokenization directly (bypasses browser/CORS/iframe).
# Run with: bash scripts/test-mp-token.sh
# Compare the response with what the Bricks Payment SDK is doing in the browser.

curl -i -X POST "https://api.mercadopago.com/v1/card_tokens?public_key=TEST-158085f8-21bc-4387-b9ed-bfcb08d99a18" \
  -H "Content-Type: application/json" \
  -d '{
    "card_number": "5031755734530604",
    "security_code": "123",
    "expiration_month": 11,
    "expiration_year": 2030,
    "cardholder": {
      "name": "APRO",
      "identification": { "type": "OTRO", "number": "12345678" }
    }
  }'

echo
