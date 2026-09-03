import sys
import os

sys.path.insert(0, os.path.join(os.getcwd(), 'backend'))
from app import create_app

app, sio = create_app()
client = app.test_client()

routes_to_test = [
    ('/', 200),
    ('/host/5709', 200),
    ('/vote/5709', 200),
    ('/host/1000', 200),
    ('/vote/1000', 200),
    ('/api/health', 200),
    ('/api/nonexistent_endpoint', 404)
]

all_passed = True
for route, expected_status in routes_to_test:
    res = client.get(route)
    status_match = res.status_code == expected_status
    if not status_match:
        all_passed = False
    print(f"[{'PASS' if status_match else 'FAIL'}] {route:25} -> Status: {res.status_code} (Expected {expected_status})")

if all_passed:
    print("\nSUCCESS: All SPA route refresh and API tests PASSED!")
else:
    print("\nFAILURE: Some routes did not return expected status.")
    sys.exit(1)
