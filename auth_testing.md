# Auth Testing Playbook

## JWT (email/password)
curl -c cookies.txt -X POST $API/api/auth/login -H "Content-Type: application/json" -d '{"email":"demo@leveragewhatmatters.com","password":"Leverage8!"}'
curl -b cookies.txt $API/api/auth/me
Login returns user object and sets access_token + refresh_token cookies. Passwords stored as bcrypt ($2b$).
5 failed logins per ip:email -> 429 for 15 minutes.

## Google (Emergent auth) - create a test session
mongosh --eval "
use('test_database');
var userId = 'test-user-' + Date.now();
var sessionToken = 'test_session_' + Date.now();
db.users.insertOne({user_id: userId, email: 'test.user.' + Date.now() + '@example.com', name: 'Test User', picture: null, auth_provider: 'google', created_at: new Date().toISOString()});
db.user_sessions.insertOne({user_id: userId, session_token: sessionToken, expires_at: new Date(Date.now() + 7*24*60*60*1000), created_at: new Date()});
print('Session token: ' + sessionToken);
"
Then: curl $API/api/auth/me -H "Authorization: Bearer <token>"
Browser: add cookie session_token (httpOnly, secure, sameSite None) and open /dashboard.
Users have a custom `user_id` field; all queries exclude `_id`.
