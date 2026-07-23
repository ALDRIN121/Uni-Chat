def test_root_endpoint_ok(client):
    resp = client.get("/")
    assert resp.status_code == 200
    assert resp.json() == {"message": "Uni Chat API is running"}
