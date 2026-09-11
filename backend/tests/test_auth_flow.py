import pytest
from flask import Flask

from app import create_app
from models import db


@pytest.fixture
def app() -> Flask:
    test_app = create_app(
        {
            "TESTING": True,
            "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
            "JWT_SECRET_KEY": "test-secret",
        }
    )

    with test_app.app_context():
        db.drop_all()
        db.create_all()

    yield test_app


@pytest.fixture
def client(app: Flask):
    return app.test_client()


def register(client):
    response = client.post(
        "/api/auth/register",
        json={"name": "Test User", "email": "test@example.com", "password": "Passw0rd!"},
    )
    assert response.status_code == 201
    data = response.get_json()
    assert "token" in data
    assert data["user"]["email"] == "test@example.com"
    return data


def login(client):
    response = client.post(
        "/api/auth/login",
        json={"email": "test@example.com", "password": "Passw0rd!"},
    )
    assert response.status_code == 200
    return response.get_json()


def verify(client, token):
    response = client.post(
        "/api/auth/verify",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    data = response.get_json()
    assert data["valid"] is True
    assert data["user"]["email"] == "test@example.com"


def test_register_login_verify_flow(client):
    registration = register(client)
    verify(client, registration["token"])

    login_data = login(client)
    assert login_data["user"]["email"] == "test@example.com"
    verify(client, login_data["token"])
