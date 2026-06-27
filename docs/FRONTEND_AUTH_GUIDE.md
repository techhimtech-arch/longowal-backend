# Frontend Token Refresh & Auth Flow Best Practices

This document explains the standard flow a frontend developer must implement to handle JWT (JSON Web Token) authentication, especially what happens when the `access_token` expires.

## The Concept

In our system, we use two types of tokens:
1. **Access Token (Short Lived):** Sent in the `Authorization: Bearer <token>` header of every API request. Expires quickly (e.g., 15 mins to 1 hour) for security.
2. **Refresh Token (Long Lived):** Stored securely (usually in an HttpOnly cookie or secure local storage). Valid for days or weeks. Used *only* to get a new Access Token.

---

## What Happens When a Token Expires?

When an frontend makes an API call like `GET /api/v1/plants` using an expired access token, the backend will return a response that looks like this:

```json
{
  "success": false,
  "status": 401,
  "message": "Token expired"
}
```

### The Best Practice Flow

The frontend **must not** log the user out immediately. Instead, it should silently try to refresh the token in the background and retry the original failed API call. The user should not even notice this happened.

### How to Implement This in React/Frontend (Using Axios Interceptors)

Instead of checking the response in every single API call (which is bad practice), the frontend should use an **Axios Response Interceptor**. 

Here is the exact step-by-step logic the frontend developer should write:

1. **Step 1:** The frontend makes the original API call.
2. **Step 2:** The backend returns a `401 Unauthorized` with message `"Token expired"`.
3. **Step 3:** The Axios interceptor catches this `401` error.
4. **Step 4:** The interceptor pauses all other API requests from firing.
5. **Step 5:** The interceptor makes a background call to the `POST /api/v1/auth/refresh-token` API using the stored Refresh Token.
6. **Step 6 (Success):** If the refresh API returns a new Access Token, the frontend updates its local storage/state with the new token.
7. **Step 7:** The interceptor resumes and **re-fires** the original failed API call, but this time with the *new* access token.
8. **Step 8 (Failure):** If the `/refresh-token` API also fails (meaning the refresh token itself is expired or invalid), ONLY THEN should the frontend clear local data and forcefully redirect the user to the `/login` page.

---

## Example Code for Frontend (Axios)

Here is a template you can share with your frontend developer:

```javascript
import axios from 'axios';

// Create an axios instance
const api = axios.create({
  baseURL: 'http://localhost:5000/api/v1',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add the token before every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Watch responses for Token Expiration (401)
api.interceptors.response.use(
  (response) => {
    // If response is successful, just return it
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Check if the error is 401 and we haven't retried yet
    // (_retry is a custom flag we add so we don't end up in an infinite loop)
    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Here, we call the backend to get a new token using our refresh token.
        // Assuming refresh token is in HttpOnly cookie or passed in body
        const rs = await axios.post('http://localhost:5000/api/v1/auth/refresh-token', {
           token: localStorage.getItem('refresh_token') // If you store it in local storage
        });

        // 1. Get the new token
        const newAccessToken = rs.data.data.accessToken;

        // 2. Save it
        localStorage.setItem('access_token', newAccessToken);

        // 3. Update the header of the failed original request
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

        // 4. Try the original request again
        return api(originalRequest);
        
      } catch (refreshError) {
        // If refresh fails, it means the user's login session is completely over
        console.error("Session expired. Logging out.");
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login'; // Redirect to login
        return Promise.reject(refreshError);
      }
    }

    // IF error is not 401, return the error normally for the component to handle
    return Promise.reject(error);
  }
);

export default api;
```


## Summary for Frontend Dev
* "Aapko har component mein error 401 check nahi karna."
* "Axios Interceptor bana lo `api.js` mein."
* "Jab bhi 401 aaye, pehle silently `/refresh-token` API hit karke naya token le aao, aur purani API dobara call kardo bina user ko disturb kiye."
* "Agar refresh bhi fail ho jaye, toh user ko logout karwa do."
