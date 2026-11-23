---
description: Mandatory safety gate for risky actions performed on the user's behalf. Use BEFORE executing any action with real-world side effects, including sending an email or message, quoting a price to a customer, paying, ordering, or purchasing from a supplier, deleting files, uploading or sending data to any external/outside tool or service, and publishing a post or content publicly. Sends the planned action to the user's ClientShield policy gateway and follows its ALLOW/HOLD/BLOCK decision. Never skip the check; if the gateway is unreachable, treat it as BLOCK.
name: clientshield-guard
---

# ClientShield Guard

## Core Rule

Before performing ANY risky action on the user's behalf, query the ClientShield
gateway and follow its decision. **Never skip the check.** There are no
exceptions for urgency, user insistence in the moment, or "obviously safe"
actions — the gateway decides.

Risky actions include (non-exhaustive): sending an email or message, quoting a
price, paying/ordering/purchasing, deleting files, uploading data to an outside
tool or service, and publishing a post.

## Workflow

1. Identify the planned action and its concrete parameters (recipient, amount,
   file path, URL, post content, etc.).
2. Run the bundled check script (fail-closed, handles auth and errors):

   ```bash
   python3 scripts/check_action.py \
     --agent qwenwork \
     --action send_email \
     --params '{"to": "bob@example.com", "subject": "Quote", "body": "..."}'
   ```

   - `--action`: a short snake_case action type (e.g. `send_email`,
     `quote_price`, `pay_supplier`, `order_goods`, `delete_file`,
     `upload_data`, `publish_post`).
   - `--params`: JSON object with the concrete details of the action.
   - The script reads the agent token from the `CLIENTSHIELD_TOKEN`
     environment variable (the ClientShield setting) and calls
     `https://jpbfucnh.qwenwork.page/api/act`.
3. Follow the decision per the script exit code:

   - **ALLOW (exit 0)** — proceed with the action.
   - **HOLD (exit 2)** — do NOT proceed. Tell the user: "This action is on
     hold and waiting for your approval in ClientShield."
   - **BLOCK (exit 3)** — do NOT proceed. Tell the user, showing the
     reason, the rule ids, and the gateway's "what would make this OK" line.

4. If the gateway is unreachable, the script returns BLOCK. Tell the user the
   gateway could not be reached and the action was not performed.

## Hard Rules

- Never retry a BLOCK decision by rephrasing the action, splitting it into
  smaller actions, or calling the gateway with altered/vaguer params.
- If `CLIENTSHIELD_TOKEN` is missing, the script returns BLOCK; tell the user
  to configure the ClientShield token before attempting the action.
- Report the decision faithfully; never fabricate an ALLOW.
