# Merchant Portal E2E Test List

## `E2E-1` Merchant Login Success
```text
merchant login (UI) -> assert login success (UI)
```

## `E2E-2` Merchant Login Negative (Wrong Credentials)
```text
merchant open login (UI) -> submit wrong credentials (UI) -> assert login failure (UI)
```

## `E2E-3` Merchant Login Negative (Empty Credentials)
```text
merchant open login (UI) -> submit empty credentials (UI) -> assert login failure (UI)
```

## `E2E-4` Merchant Re-Login in Fresh Context
```text
merchant login success (UI) -> open fresh browser context (UI) -> merchant login success again (UI)
```

## `E2E-5` DeliverX DeliverNow
```text
create order (API) -> merchant accept/QR/price/quote (UI) -> patient accept+pay (API) -> admin confirm (API) -> merchant prepare+set pickup (UI) -> admin assign rider (API) -> rider complete (API) -> patient rate rider (API) -> merchant verify completed + completed tab (UI)
```

## `E2E-6` DeliverX Pickup
```text
create order (API) -> merchant accept/QR/price/quote (UI) -> patient accept+pay pickup mode (API) -> admin confirm (API) -> merchant prepare+set for patient pickup+confirm pickup complete (UI) -> merchant verify completed + completed tab (UI)
```

## `E2E-7` DeliverX Scheduled
```text
create scheduled order (API) -> merchant accept/QR/price/quote (UI) -> patient accept+pay scheduled mode (API) -> admin confirm (API) -> merchant prepare+set pickup (UI) -> admin assign rider (API) -> rider complete (API) -> patient rate rider (API) -> merchant verify completed + completed tab (UI)
```

## `E2E-8` Pabili Rider-to-Quote
```text
create order (API) -> merchant accept+request rider quote (UI) -> admin assign rider (API) -> rider start/arrive+send rider quote (API) -> merchant send quote (UI) -> patient accept+pay (API) -> admin confirm (API) -> rider complete (API) -> patient rate rider (API) -> merchant verify completed + completed tab (UI)
```

## `E2E-9` Pabili PharmaServ-to-Quote
```text
create order (API) -> merchant accept+request no rider quote+price/QR/send quote (UI) -> admin assign rider (API) -> patient accept+pay (API) -> admin confirm (API) -> rider complete (API) -> patient rate rider (API) -> merchant verify completed + completed tab (UI)
```

## `E2E-10` FindMyMeds Full Flow
```text
create order (API) -> merchant accept+assign branch+QR/price/quote (UI) -> patient accept+pay (API) -> admin confirm+assign rider (API) -> merchant prepare+set pickup (UI) -> rider complete (API) -> patient rate rider (API) -> merchant verify completed + completed tab (UI)
```

## `E2E-11` DeliverX Attachment-Only
```text
create attachment-only order (API) -> merchant accept+add items+QR/send quote (UI) -> patient accept+pay (API) -> admin confirm+assign rider (API) -> merchant prepare+set pickup (UI) -> rider complete (API) -> patient rate rider (API) -> merchant verify completed + completed tab (UI)
```

## `E2E-12` DeliverX Requote + Quantity Reduction
```text
create order (API) -> merchant accept/QR/price/quote (UI) -> patient accept initial quote+request requote (API) -> merchant resend quote (UI) -> patient accept updated quote+pay with reduced quantities (API) -> merchant verify qty-change modal (UI) -> admin confirm+assign rider (API) -> merchant prepare+set pickup (UI) -> rider complete (API) -> patient rate rider (API) -> merchant verify completed + completed tab (UI)
```

## `E2E-13` FindMyMeds Rider Starts While Merchant Prepares
```text
create order (API) -> merchant accept+assign branch+QR/price/quote (UI) -> patient accept+pay (API) -> admin confirm+assign rider (API) -> rider start+arrive at pharmacy (API) -> merchant prepare+set pickup (UI) -> rider pickup/dropoff/proofs+complete (API) -> patient rate rider (API) -> merchant verify completed + completed tab (UI)
```

## `E2E-14` Planet DeliverX Delivery Fulfillment
```text
create Planet-branch order (API) -> merchant accept+QR/price/quote (UI) -> patient accept+pay (API) -> admin confirm (API) -> merchant prepare+set pickup (UI) -> admin assign rider (API) -> rider complete (API) -> patient rate rider (API) -> merchant verify completed + completed tab (UI)
```

## `E2E-15` Planet DeliverX Pickup Fulfillment
```text
create Planet pickup-branch order (API) -> merchant accept+QR/price/quote (UI) -> patient accept+pay pickup mode (API) -> admin confirm (API) -> merchant prepare+set for pickup+click Order Picked Up+expect PICKUP SUCCESSFUL popup (UI) -> merchant verify completed + completed tab (UI)
```
