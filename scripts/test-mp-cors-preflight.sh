#!/usr/bin/env bash
# Simulate the CORS preflight the browser makes from secure-fields.mercadopago.com
# to api.mercadopago.com when Bricks tokenizes a card.
# If MP returns Access-Control-Allow-Origin, the block is on the browser side.
# If MP doesn't, MP is refusing CORS for this public key / referer combo and
# the issue is at their gateway, not on our side.

curl -i -X OPTIONS \
  "https://api.mercadopago.com/v1/card_tokens?public_key=TEST-158085f8-21bc-4387-b9ed-bfcb08d99a18&referer=https%3A%2F%2Fhirata.onrender.com" \
  -H "Origin: https://secure-fields.mercadopago.com" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type, x-meli-session-id, x-product-id"

echo
