# test_auth.py
import requests
import json

BASE_URL = "http://127.0.0.1:8000"


def test_auth():
    # Test register
    register_data = {
        "name": "Test User",
        "email": "test@example.com",
        "password": "test123456"
    }

    response = requests.post(f"{BASE_URL}/api/auth/register", json=register_data)
    print(f"Register status: {response.status_code}")
    print(f"Register response: {response.json()}")

    if response.status_code == 201:
        token = response.json().get("token")
        print(f"Token received: {token[:20]}...")

        # Test me endpoint with token
        headers = {"Authorization": f"Bearer {token}"}
        me_response = requests.get(f"{BASE_URL}/api/me", headers=headers)
        print(f"Me status: {me_response.status_code}")
        print(f"Me response: {me_response.json()}")

        # Test verify endpoint with token
        verify_response = requests.post(f"{BASE_URL}/api/auth/verify", headers=headers)
        print(f"Verify status: {verify_response.status_code}")
        print(f"Verify response: {verify_response.json()}")

        # Test debug headers endpoint
        debug_response = requests.post(f"{BASE_URL}/api/debug/headers", headers=headers)
        print(f"Debug headers status: {debug_response.status_code}")
        print(f"Debug headers response: {debug_response.json()}")
    else:
        # If registration fails (user already exists), try login
        login_data = {
            "email": "test@example.com",
            "password": "test123456"
        }

        login_response = requests.post(f"{BASE_URL}/api/auth/login", json=login_data)
        print(f"Login status: {login_response.status_code}")
        print(f"Login response: {login_response.json()}")

        if login_response.status_code == 200:
            token = login_response.json().get("token")
            print(f"Token received: {token[:20]}...")

            # Test me endpoint with token
            headers = {"Authorization": f"Bearer {token}"}
            me_response = requests.get(f"{BASE_URL}/api/me", headers=headers)
            print(f"Me status: {me_response.status_code}")
            print(f"Me response: {me_response.json()}")

            # Test verify endpoint with token
            verify_response = requests.post(f"{BASE_URL}/api/auth/verify", headers=headers)
            print(f"Verify status: {verify_response.status_code}")
            print(f"Verify response: {verify_response.json()}")

            # Test debug headers endpoint
            debug_response = requests.post(f"{BASE_URL}/api/debug/headers", headers=headers)
            print(f"Debug headers status: {debug_response.status_code}")
            print(f"Debug headers response: {debug_response.json()}")


if __name__ == "__main__":
    test_auth()