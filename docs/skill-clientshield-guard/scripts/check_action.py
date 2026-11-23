#!/usr/bin/env python3
"""ClientShield gateway check. ALWAYS run this before executing a risky action.

Usage:
  check_action.py --agent <name> --action <action> [--params '<json>']

Sends {agent, action, params} to the ClientShield gateway and prints the
decision in a machine-readable line plus human-readable guidance.
Fail-closed: unreachable gateway or ambiguous response => BLOCK.
Exit codes: 0 = ALLOW, 2 = HOLD, 3 = BLOCK (incl. unreachable/invalid).
"""
import argparse
import json
import os
import sys
import urllib.error
import urllib.request

GATEWAY_URL = os.environ.get(
    "CLIENTSHIELD_URL", "https://jpbfucnh.qwenwork.page/api/act"
)
TOKEN = os.environ.get("CLIENTSHIELD_TOKEN", "")


def emit(decision: str, reason: str, rule_ids=None, ok_line=""):
    decision = decision.upper()
    payload = {"decision": decision, "reason": reason}
    if rule_ids:
        payload["rule_ids"] = rule_ids
    if ok_line:
        payload["what_would_make_this_ok"] = ok_line
    print(json.dumps(payload))
    if decision == "ALLOW":
        print("ClientShield: ALLOW — proceed with the action.")
        sys.exit(0)
    if decision == "HOLD":
        print("ClientShield: HOLD — stop and tell the user the action is "
              "waiting for their approval in ClientShield.")
        sys.exit(2)
    print("ClientShield: BLOCK — do NOT perform the action.")
    sys.exit(3)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--agent", required=True,
                        help="Agent identifier, e.g. 'qwenwork'")
    parser.add_argument("--action", required=True,
                        help="Action type, e.g. 'send_email', 'delete_file'")
    parser.add_argument("--params", default="{}",
                        help="JSON object of action parameters")
    args = parser.parse_args()

    try:
        params = json.loads(args.params)
        if not isinstance(params, dict):
            raise ValueError
    except ValueError:
        emit("BLOCK", "Invalid --params: must be a JSON object.")

    if not TOKEN:
        emit("BLOCK",
             "CLIENTSHIELD_TOKEN is not set. Configure it in settings "
             "before performing risky actions.")

    body = json.dumps(
        {"agent": args.agent, "action": args.action, "params": params}
    ).encode("utf-8")
    req = urllib.request.Request(
        GATEWAY_URL,
        data=body,
        headers={
            "Content-Type": "application/json",
            "Authorization": "Bearer " + TOKEN,
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except (urllib.error.URLError, TimeoutError, OSError):
        emit("BLOCK",
             "ClientShield gateway unreachable. Fail-closed: the action "
             "must NOT be performed. Tell the user the gateway "
             f"({GATEWAY_URL}) could not be reached.")
    except ValueError:
        emit("BLOCK", "ClientShield gateway returned a non-JSON response. "
                      "Fail-closed: do NOT perform the action.")
    except urllib.error.HTTPError as e:
        emit("BLOCK",
             f"ClientShield gateway returned HTTP {e.code}. Fail-closed: "
             "do NOT perform the action.")

    decision = str(data.get("decision", "")).strip()
    if decision not in ("ALLOW", "HOLD", "BLOCK"):
        emit("BLOCK", "ClientShield gateway returned an unrecognized "
                      f"decision '{decision}'. Fail-closed: do NOT perform "
                      "the action.")

    rule_ids = data.get("rule_ids") or data.get("rules") or []
    ok_line = (data.get("what_would_make_this_ok")
               or data.get("what_would_make_this_OK") or "")
    emit(decision, data.get("reason", ""), rule_ids, ok_line)


if __name__ == "__main__":
    main()
