{
  "rules": {
    "users": {
      "$uid": {
        ".read": "$uid === auth.uid",
        ".write": "$uid === auth.uid"
      }
    },
    "usernames": {
      ".read": true,
      ".write": "auth != null"
    },
    "messages": {
      ".read": "auth != null",
      ".write": "auth != null && auth.token.email_verified == true"
    },
    "reviews": {
      ".read": true,
      ".write": "auth != null && auth.token.email_verified == true"
    }
  }
}