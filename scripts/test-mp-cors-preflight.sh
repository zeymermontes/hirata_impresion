#!/usr/bin/env bash
# Simulate the CORS preflight the browser makes from secure-fields.mercadopago.com
# to api.mercadopago.com when Bricks tokenizes a card.
# If this returns Access-Control-Allow-Origin in the response, MP's setup is
# fine and the block is happening in your browser/network. If not, something
# is intercepting MP's response.

curl -i -X OPTIONS \
  "https://api.mercadopago.com/v1/card_tokens?public_key=TEST-158085f8-21bc-4387-b9ed-bfcb08d99a18" \
  -H "Origin: https://secure-fields.mercadopago.com" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type"

echo
