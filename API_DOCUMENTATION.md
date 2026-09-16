# Chembur Samithi Seva – Complete Backend API Reference

> A comprehensive, production-grade reference manual covering all **49 backend API endpoints** grouped by user role (**Public**, **Auth**, **Volunteer**, and **Admin**).
> 
> Designed to provide full architectural and schema parity for frontend developers and AI coding agents building web/mobile interfaces.

---

## Table of Contents
1. [Global Architectural Conventions](#1-global-architectural-conventions)
2. [Public Endpoints (Guest / Unauthenticated)](#2-public-endpoints-guest--unauthenticated) (5 endpoints)
3. [Authentication & Session Endpoints](#3-authentication--session-endpoints) (6 endpoints)
4. [Volunteer Portal Endpoints (Role: volunteer)](#4-volunteer-portal-endpoints-role-volunteer) (15 endpoints)
5. [Admin Management Endpoints (Role: admin)](#5-admin-management-endpoints-role-admin) (23 endpoints)
6. [Response Codes & Standard Error Matrix](#6-response-codes--standard-error-matrix)

---

## 1. Global Architectural Conventions

### 1.1 Base URLs & Access Points
- **API Base Path**: `/api`
- **Interactive Swagger UI**: `/api-docs`
- **OpenAPI 3.0.0 JSON Specification**: `/api-docs/swagger.json`
- **Default Content-Type**: `application/json`

### 1.2 Authentication Header (Bearer Token)
All protected endpoints require the standard HTTP `Authorization` header containing a valid JSON Web Token (JWT):
```http
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```
Tokens are obtained via `POST /api/auth/login` or `POST /api/auth/register`.

### 1.3 Uniform Envelope Schema

#### Standard Success Response (`200 OK`, `201 Created`)
```json
{
  "success": true,
  "message": "Action completed successfully.",
  "data": { ... }
}
```

#### Standard Error Response (`400`, `401`, `403`, `404`, `409`, `500`)
```json
{
  "success": false,
  "message": "Specific error explanation."
}
```

---

## 2. Public Endpoints (Guest / Unauthenticated)

*Access Requirement: Open to all unauthenticated clients. No token required.*

### `GET /api/public/latest-event`

**Summary**: Fetch the next upcoming event

**Description**: Retrieves the single most immediate upcoming or ongoing event that is published. Returns null if no upcoming events are scheduled.

- **Required Headers**:
  - `Authorization`: None (Public)
  - `Content-Type`: `application/json`
- **URL / Query Parameters**: None
- **Request Body**: None
- **Expected HTTP Status Codes**:
  - **`200`**: Successfully retrieved the latest event (or null if none scheduled)
  - **`500`**: Server error

---

### `GET /api/public/events`

**Summary**: Fetch all upcoming public events

**Description**: Retrieves a paginated list of all published upcoming and ongoing events.

- **Required Headers**:
  - `Authorization`: None (Public)
  - `Content-Type`: `application/json`
- **URL / Query Parameters**:
  - `limit` (In: `query`, Type: `integer` *(Optional)*) — Number of events to return per page
  - `offset` (In: `query`, Type: `integer` *(Optional)*) — Number of events to skip
- **Request Body**: None
- **Expected HTTP Status Codes**:
  - **`200`**: A paginated list of upcoming events
  - **`500`**: Server error

---

### `GET /api/public/events/{id}`

**Summary**: Get full details of a specific event

**Description**: Retrieves complete details for a single published event based on its UUID.

- **Required Headers**:
  - `Authorization`: None (Public)
  - `Content-Type`: `application/json`
- **URL / Query Parameters**:
  - `id` (In: `path`, Type: `string` *(Required)*) — The unique identifier of the event
- **Request Body**: None
- **Expected HTTP Status Codes**:
  - **`200`**: Event details retrieved successfully
  - **`400`**: Invalid event ID format (must be a valid UUID)
  - **`404`**: Event not found or unavailable
  - **`500`**: Server error

---

### `GET /api/public/verify-certificate/{id}`

**Summary**: Verify a certificate

**Description**: Open endpoint for third parties (schools, universities, employers, recruiters) to verify a certificate UUID without requiring authentication. Supports event, task, and 60-hour master certificates.

- **Required Headers**:
  - `Authorization`: None (Public)
  - `Content-Type`: `application/json`
- **URL / Query Parameters**:
  - `id` (In: `path`, Type: `string` *(Required)*) — The unique certificate UUID
- **Request Body**: None
- **Expected HTTP Status Codes**:
  - **`200`**: Certificate is authentic and valid
  - **`400`**: Invalid certificate UUID format
  - **`404`**: Certificate is invalid or not found in the system
  - **`500`**: Server error during verification

---

### `GET /api/public/verify-certificate/{id}/download`

**Summary**: Download public certificate rendering data

**Description**: Unauthenticated endpoint for volunteers, recruiters, employers, and universities to fetch complete certificate data (volunteer name, event title, date, issued timestamp, accredited hours, and description) for rendering on HTML5 canvas or downloading as PDF.

- **Required Headers**:
  - `Authorization`: None (Public)
  - `Content-Type`: `application/json`
- **URL / Query Parameters**:
  - `id` (In: `path`, Type: `string` *(Required)*) — The unique certificate UUID
- **Request Body**: None
- **Expected HTTP Status Codes**:
  - **`200`**: Certificate download data retrieved successfully
  - **`400`**: Invalid certificate UUID format
  - **`404`**: Certificate not found or does not exist
  - **`500`**: Server error during certificate retrieval

---

## 3. Authentication & Session Endpoints

*Access Requirement: Entry points for onboarding, session creation, password resets, and session recovery.*

### `POST /api/auth/register`

**Summary**: Register a new volunteer

**Description**: Creates a new volunteer account in the system.

- **Required Headers**:
  - `Authorization`: None (Public)
  - `Content-Type`: `application/json`
- **URL / Query Parameters**: None
- **JSON Request Body Parameters**:
  - `firstName` (`string` *(Required)*)
  - `lastName` (`string` *(Required)*)
  - `email` (`string` *(Required)*)
  - `password` (`string` *(Required)*)
  - `phoneNumber` (`string` *(Optional)*)
  - `collegeName` (`string` *(Optional)*) — Either collegeName or profession must be provided
  - `profession` (`string` *(Optional)*) — Either collegeName or profession must be provided
- **Expected HTTP Status Codes**:
  - **`201`**: Volunteer registered successfully
  - **`400`**: Missing required fields or validation failure
  - **`409`**: Account with this email or phone number already exists
  - **`500`**: Server error

---

### `POST /api/auth/login`

**Summary**: User login

**Description**: Authenticates a user and returns a JWT token.

- **Required Headers**:
  - `Authorization`: None (Public)
  - `Content-Type`: `application/json`
- **URL / Query Parameters**: None
- **JSON Request Body Parameters**:
  - `email` (`string` *(Required)*)
  - `password` (`string` *(Required)*)
- **Expected HTTP Status Codes**:
  - **`200`**: Successfully logged in, returns JWT token
  - **`401`**: Invalid credentials
  - **`500`**: Server error

---

### `PUT /api/auth/change-password`

**Summary**: Change user password

**Description**: Allows an authenticated user to update their password. Requires a valid JWT token.

- **Required Headers**:
  - `Authorization`: `Authorization: Bearer <token>` (Authenticated User)
  - `Content-Type`: `application/json`
- **URL / Query Parameters**: None
- **JSON Request Body Parameters**:
  - `currentPassword` (`string` *(Required)*)
  - `newPassword` (`string` *(Required)*)
- **Expected HTTP Status Codes**:
  - **`200`**: Password updated successfully
  - **`400`**: Incorrect current password
  - **`401`**: Unauthorized (Token missing or invalid)
  - **`500`**: Server error

---

### `POST /api/auth/forgot-password`

**Summary**: Request a password reset link

**Description**: Generates a password reset token and sends an email to the user.

- **Required Headers**:
  - `Authorization`: None (Public)
  - `Content-Type`: `application/json`
- **URL / Query Parameters**: None
- **JSON Request Body Parameters**:
  - `email` (`string` *(Required)*)
- **Expected HTTP Status Codes**:
  - **`200`**: Reset link sent to email (if email exists)
  - **`500`**: Server error

---

### `POST /api/auth/reset-password/{userId}/{token}`

**Summary**: Submit a new password

**Description**: Resets the user's password using the token received via email.

- **Required Headers**:
  - `Authorization`: None (Public)
  - `Content-Type`: `application/json`
- **URL / Query Parameters**:
  - `userId` (In: `path`, Type: `string` *(Required)*) — The UUID of the user
  - `token` (In: `path`, Type: `string` *(Required)*) — The temporary reset token
- **JSON Request Body Parameters**:
  - `newPassword` (`string` *(Required)*)
- **Expected HTTP Status Codes**:
  - **`200`**: Password reset successfully
  - **`400`**: Invalid or expired token
  - **`500`**: Server error

---

### `GET /api/auth/me`

**Summary**: Get current authenticated user session

**Description**: Validates the JWT Bearer token and returns the current user's profile, role (admin or volunteer), and status. Accessible by both admin and volunteer roles.

- **Required Headers**:
  - `Authorization`: `Authorization: Bearer <token>` (Authenticated User)
  - `Content-Type`: `application/json`
- **URL / Query Parameters**: None
- **Request Body**: None
- **Expected HTTP Status Codes**:
  - **`200`**: Current user session retrieved successfully
  - **`401`**: Missing, invalid, or expired JWT token
  - **`404`**: User account not found or deactivated
  - **`500`**: Server error retrieving user session

---

## 4. Volunteer Portal Endpoints (Role: volunteer)

*Access Requirement: Requires valid Bearer token and role 'volunteer'. Enforced by global router middleware.*

### `GET /api/volunteer/profile`

**Summary**: Get volunteer profile

**Description**: Retrieves the personal and biographical profile data of the currently logged-in volunteer.

- **Required Headers**:
  - `Authorization`: `Authorization: Bearer <token>` (Volunteer)
  - `Content-Type`: `application/json`
- **URL / Query Parameters**: None
- **Request Body**: None
- **Expected HTTP Status Codes**:
  - **`200`**: Profile data retrieved successfully
  - **`401`**: Unauthorized
  - **`404`**: Profile not found
  - **`500`**: Server error

---

### `PUT /api/volunteer/profile`

**Summary**: Update volunteer profile

**Description**: Updates biographical fields, skills, contact data, or profession/college for the logged-in volunteer.

- **Required Headers**:
  - `Authorization`: `Authorization: Bearer <token>` (Volunteer)
  - `Content-Type`: `application/json`
- **URL / Query Parameters**: None
- **JSON Request Body Parameters**:
  - `firstName` (`string` *(Optional)*)
  - `lastName` (`string` *(Optional)*)
  - `phoneNumber` (`string` *(Optional)*)
  - `dateOfBirth` (`string` *(Optional)*)
  - `gender` (`string` *(Optional)* [Allowed values: `Male`, `Female`, `Other`])
  - `bloodGroup` (`string` *(Optional)* [Allowed values: `A+`, `A-`, `B+`, `B-`, `AB+`, `AB-`, `O+`, `O-`])
  - `residentialAddress` (`string` *(Optional)*)
  - `city` (`string` *(Optional)*)
  - `state` (`string` *(Optional)*)
  - `pincode` (`string` *(Optional)*)
  - `emergencyContactName` (`string` *(Optional)*)
  - `emergencyContactRelation` (`string` *(Optional)*)
  - `emergencyContactNumber` (`string` *(Optional)*)
  - `medicalConditions` (`string` *(Optional)*)
  - `educationLevel` (`string` *(Optional)*)
  - `collegeName` (`string` *(Optional)*) — Either collegeName or profession must be provided
  - `profession` (`string` *(Optional)*) — Either collegeName or profession must be provided
  - `skills` (`array` *(Optional)*)
  - `languagesSpoken` (`array` *(Optional)*)
  - `interestedActivities` (`array` *(Optional)*)
- **Expected HTTP Status Codes**:
  - **`200`**: Profile updated successfully
  - **`400`**: Validation error (e.g., missing college/profession)
  - **`401`**: Unauthorized
  - **`500`**: Server error

---

### `GET /api/volunteer/dashboard`

**Summary**: Get volunteer dashboard metrics

**Description**: Retrieves impact stats, upcoming event commitments, and recent activity history.

- **Required Headers**:
  - `Authorization`: `Authorization: Bearer <token>` (Volunteer)
  - `Content-Type`: `application/json`
- **URL / Query Parameters**: None
- **Request Body**: None
- **Expected HTTP Status Codes**:
  - **`200`**: Dashboard data retrieved successfully
  - **`401`**: Unauthorized
  - **`500`**: Server error

---

### `GET /api/volunteer/feed`

**Summary**: Get community feed

**Description**: Retrieves the latest activities across the NGO (event completions, badge earnings).

- **Required Headers**:
  - `Authorization`: `Authorization: Bearer <token>` (Volunteer)
  - `Content-Type`: `application/json`
- **URL / Query Parameters**: None
- **Request Body**: None
- **Expected HTTP Status Codes**:
  - **`200`**: Feed retrieved successfully
  - **`401`**: Unauthorized
  - **`500`**: Server error

---

### `GET /api/volunteer/leaderboard`

**Summary**: Get community leaderboard

**Description**: Retrieves the top volunteers ranked by their total logged hours. Can be filtered globally, by city, or by college.

- **Required Headers**:
  - `Authorization`: `Authorization: Bearer <token>` (Volunteer)
  - `Content-Type`: `application/json`
- **URL / Query Parameters**:
  - `type` (In: `query`, Type: `string` *(Optional)*) — The grouping filter for the leaderboard
  - `limit` (In: `query`, Type: `integer` *(Optional)*) — Maximum number of volunteers to return
- **Request Body**: None
- **Expected HTTP Status Codes**:
  - **`200`**: Leaderboard retrieved successfully
  - **`400`**: Invalid filter type provided
  - **`401`**: Unauthorized
  - **`500`**: Server error

---

### `GET /api/volunteer/events`

**Summary**: Browse available events for volunteers

**Description**: Fetches published upcoming events along with the volunteer's personal registration status for each.

- **Required Headers**:
  - `Authorization`: `Authorization: Bearer <token>` (Volunteer)
  - `Content-Type`: `application/json`
- **URL / Query Parameters**: None
- **Request Body**: None
- **Expected HTTP Status Codes**:
  - **`200`**: List of events retrieved successfully
  - **`401`**: Unauthorized
  - **`500`**: Server error

---

### `POST /api/volunteer/events/{id}/register`

**Summary**: Register for an event

**Description**: Enrolls the logged-in volunteer into a specific published event, checking limits and deadlines.

- **Required Headers**:
  - `Authorization`: `Authorization: Bearer <token>` (Volunteer)
  - `Content-Type`: `application/json`
- **URL / Query Parameters**:
  - `id` (In: `path`, Type: `string` *(Required)*) — Event UUID
- **Request Body**: None
- **Expected HTTP Status Codes**:
  - **`200`**: Successfully registered
  - **`400`**: Event full, deadline passed, or already registered
  - **`401`**: Unauthorized
  - **`500`**: Server error

---

### `POST /api/volunteer/events/{id}/withdraw`

**Summary**: Withdraw registration from an event

**Description**: Cancels the volunteer's registration for a specific event.

- **Required Headers**:
  - `Authorization`: `Authorization: Bearer <token>` (Volunteer)
  - `Content-Type`: `application/json`
- **URL / Query Parameters**:
  - `id` (In: `path`, Type: `string` *(Required)*) — Event UUID
- **Request Body**: None
- **Expected HTTP Status Codes**:
  - **`200`**: Successfully withdrawn
  - **`400`**: Not registered or event already passed
  - **`401`**: Unauthorized
  - **`500`**: Server error

---

### `POST /api/volunteer/events/check-in`

**Summary**: Scan check-in QR code

**Description**: Verifies a short-lived dynamic QR token and marks the volunteer as present.

- **Required Headers**:
  - `Authorization`: `Authorization: Bearer <token>` (Volunteer)
  - `Content-Type`: `application/json`
- **URL / Query Parameters**: None
- **JSON Request Body Parameters**:
  - `token` (`string` *(Required)*) — The JWT payload scanned from the admin's screen
- **Expected HTTP Status Codes**:
  - **`200`**: Check-in successful
  - **`400`**: Expired token or invalid QR payload
  - **`401`**: Unauthorized
  - **`500`**: Server error

---

### `POST /api/volunteer/events/check-out`

**Summary**: Scan checkout QR code

**Description**: Verifies a checkout dynamic QR token and records check-out time, triggering automated hour tracking.

- **Required Headers**:
  - `Authorization`: `Authorization: Bearer <token>` (Volunteer)
  - `Content-Type`: `application/json`
- **URL / Query Parameters**: None
- **JSON Request Body Parameters**:
  - `token` (`string` *(Required)*) — The checkout JWT token
- **Expected HTTP Status Codes**:
  - **`200`**: Checkout completed successfully
  - **`400`**: Invalid state or expired token
  - **`401`**: Unauthorized
  - **`500`**: Server error

---

### `GET /api/volunteer/certificates`

**Summary**: List earned certificates

**Description**: Retrieves all verifiable certificates automatically generated for this volunteer upon event completion.

- **Required Headers**:
  - `Authorization`: `Authorization: Bearer <token>` (Volunteer)
  - `Content-Type`: `application/json`
- **URL / Query Parameters**: None
- **Request Body**: None
- **Expected HTTP Status Codes**:
  - **`200`**: Certificates retrieved successfully
  - **`401`**: Unauthorized
  - **`500`**: Server error

---

### `GET /api/volunteer/certificates/{id}/download`

**Summary**: Download certificate data

**Description**: Fetches the exact JSON properties (name, event, hours, date) needed to render the certificate on the frontend HTML5 canvas.

- **Required Headers**:
  - `Authorization`: `Authorization: Bearer <token>` (Volunteer)
  - `Content-Type`: `application/json`
- **URL / Query Parameters**:
  - `id` (In: `path`, Type: `string` *(Required)*) — Certificate UUID
- **Request Body**: None
- **Expected HTTP Status Codes**:
  - **`200`**: Certificate data retrieved successfully
  - **`401`**: Unauthorized
  - **`404`**: Certificate not found or access denied
  - **`500`**: Server error

---

### `GET /api/volunteer/tasks`

**Summary**: Get volunteer tasks

**Description**: Retrieves a list of tasks assigned directly to this volunteer as well as unassigned public tasks.

- **Required Headers**:
  - `Authorization`: `Authorization: Bearer <token>` (Volunteer)
  - `Content-Type`: `application/json`
- **URL / Query Parameters**:
  - `limit` (In: `query`, Type: `integer` *(Optional)*) — Maximum number of tasks to return
  - `offset` (In: `query`, Type: `integer` *(Optional)*) — Number of tasks to skip
- **Request Body**: None
- **Expected HTTP Status Codes**:
  - **`200`**: Tasks retrieved successfully
  - **`401`**: Unauthorized
  - **`403`**: Forbidden (Volunteer role required)
  - **`500`**: Server error

---

### `PATCH /api/volunteer/tasks/{id}/progress`

**Summary**: Update task progress

**Description**: Allows the assigned volunteer to update progress (move to in_progress or pending_verification) and provide remarks.

- **Required Headers**:
  - `Authorization`: `Authorization: Bearer <token>` (Volunteer)
  - `Content-Type`: `application/json`
- **URL / Query Parameters**:
  - `id` (In: `path`, Type: `string` *(Required)*) — Task UUID
- **JSON Request Body Parameters**:
  - `status` (`string` *(Required)* [Allowed values: `in_progress`, `pending_verification`])
  - `volunteer_remarks` (`string` *(Optional)*)
- **Expected HTTP Status Codes**:
  - **`200`**: Task updated successfully
  - **`400`**: Invalid status or task is already completed/cancelled
  - **`401`**: Unauthorized
  - **`403`**: Unauthorized (task not assigned to this volunteer)
  - **`404`**: Task not found
  - **`500`**: Server error

---

### `GET /api/volunteer/tasks/{id}`

**Summary**: Get task details

**Description**: Retrieves details and timeline history for a specific task.

- **Required Headers**:
  - `Authorization`: `Authorization: Bearer <token>` (Volunteer)
  - `Content-Type`: `application/json`
- **URL / Query Parameters**:
  - `id` (In: `path`, Type: `string` *(Required)*) — Task UUID
- **Request Body**: None
- **Expected HTTP Status Codes**:
  - **`200`**: Task details retrieved successfully
  - **`401`**: Unauthorized
  - **`403`**: Access denied (private task assigned to another volunteer)
  - **`404`**: Task not found
  - **`500`**: Server error

---

## 5. Admin Management Endpoints (Role: admin)

*Access Requirement: Requires valid Bearer token and role 'admin'. Enforced by global router middleware.*

### `GET /api/admin/dashboard-stats`

**Summary**: Get admin dashboard data matrix

**Description**: Retrieves high-level global metrics, top volunteer leaderboards, upcoming events, and system timelines.

- **Required Headers**:
  - `Authorization`: `Authorization: Bearer <token>` (Admin)
  - `Content-Type`: `application/json`
- **URL / Query Parameters**: None
- **Request Body**: None
- **Expected HTTP Status Codes**:
  - **`200`**: Dashboard stats retrieved successfully
  - **`401`**: Unauthorized
  - **`403`**: Forbidden (Admin role required)
  - **`500`**: Server error

---

### `POST /api/admin/events`

**Summary**: Create a new system event

**Description**: Creates an event in 'draft' status with strict validation rules.

- **Required Headers**:
  - `Authorization`: `Authorization: Bearer <token>` (Admin)
  - `Content-Type`: `application/json`
- **URL / Query Parameters**: None
- **JSON Request Body Parameters**:
  - `title` (`string` *(Required)*)
  - `description` (`string` *(Optional)*)
  - `category` (`string` *(Optional)* [Allowed values: `Teaching & Mentorship`, `Tech & Development`, `Media & Photography`, `Content & Design`, `Wall Painting`, `Core & Planning`, `Other`])
  - `event_date` (`string` *(Required)*)
  - `start_time` (`string` *(Required)*)
  - `end_time` (`string` *(Required)*)
  - `location_name` (`string` *(Required)*)
  - `location_address` (`string` *(Required)*)
  - `volunteers_needed` (`integer` *(Required)*)
  - `registration_deadline` (`string` *(Optional)*)
  - `meeting_point` (`string` *(Optional)*)
  - `contact_person_name` (`string` *(Optional)*)
  - `contact_person_phone` (`string` *(Optional)*)
  - `contact_person_email` (`string` *(Optional)*)
  - `perks` (`array` *(Optional)*)
  - `instructions` (`array` *(Optional)*)
  - `required_skills` (`array` *(Optional)*)
  - `latitude` (`number` *(Optional)*)
  - `longitude` (`number` *(Optional)*)
  - `is_recurring` (`boolean` *(Optional)*)
  - `is_certificate_eligible` (`boolean` *(Optional)*)
  - `min_hours_for_certificate` (`number` *(Optional)*)
- **Expected HTTP Status Codes**:
  - **`201`**: Event created successfully
  - **`400`**: Validation error or missing fields
  - **`401`**: Unauthorized
  - **`403`**: Forbidden (Admin role required)
  - **`500`**: Server error

---

### `GET /api/admin/events`

**Summary**: List all admin events

**Description**: Retrieves a filtered, sorted, and paginated list of all events.

- **Required Headers**:
  - `Authorization`: `Authorization: Bearer <token>` (Admin)
  - `Content-Type`: `application/json`
- **URL / Query Parameters**:
  - `search` (In: `query`, Type: `string` *(Optional)*) — Search keyword across title, description, or location
  - `location` (In: `query`, Type: `string` *(Optional)*) — Filter events by location name or address
  - `category` (In: `query`, Type: `string` *(Optional)*) — Filter events by category
  - `status` (In: `query`, Type: `string` *(Optional)*) — Filter events by lifecycle status
  - `sortBy` (In: `query`, Type: `string` *(Optional)*) — Sort field (e.g. 'created', 'date', 'title')
  - `sortOrder` (In: `query`, Type: `string` *(Optional)*) — Sort ordering direction
  - `limit` (In: `query`, Type: `integer` *(Optional)*) — Number of events to return
  - `offset` (In: `query`, Type: `integer` *(Optional)*) — Number of events to skip
- **Request Body**: None
- **Expected HTTP Status Codes**:
  - **`200`**: Events retrieved successfully
  - **`401`**: Unauthorized
  - **`403`**: Forbidden (Admin role required)
  - **`500`**: Server error

---

### `POST /api/admin/events/{id}/publish`

**Summary**: Publish a draft event

**Description**: Transitions a draft event to published status so volunteers can view and register.

- **Required Headers**:
  - `Authorization`: `Authorization: Bearer <token>` (Admin)
  - `Content-Type`: `application/json`
- **URL / Query Parameters**:
  - `id` (In: `path`, Type: `string` *(Required)*) — Event UUID
- **Request Body**: None
- **Expected HTTP Status Codes**:
  - **`200`**: Event published successfully
  - **`400`**: Invalid status transition
  - **`401`**: Unauthorized
  - **`403`**: Forbidden (Admin role required)
  - **`404`**: Event not found
  - **`500`**: Server error

---

### `PUT /api/admin/events/{id}`

**Summary**: Update event details

**Description**: Modifies attributes of an existing draft or published event.

- **Required Headers**:
  - `Authorization`: `Authorization: Bearer <token>` (Admin)
  - `Content-Type`: `application/json`
- **URL / Query Parameters**:
  - `id` (In: `path`, Type: `string` *(Required)*) — Event UUID
- **JSON Request Body Parameters**:
  - `title` (`string` *(Optional)*)
  - `description` (`string` *(Optional)*)
  - `category` (`string` *(Optional)* [Allowed values: `Teaching & Mentorship`, `Tech & Development`, `Media & Photography`, `Content & Design`, `Wall Painting`, `Core & Planning`, `Other`])
  - `event_date` (`string` *(Optional)*)
  - `start_time` (`string` *(Optional)*)
  - `end_time` (`string` *(Optional)*)
  - `location_name` (`string` *(Optional)*)
  - `location_address` (`string` *(Optional)*)
  - `volunteers_needed` (`integer` *(Optional)*)
  - `registration_deadline` (`string` *(Optional)*)
  - `meeting_point` (`string` *(Optional)*)
  - `contact_person_name` (`string` *(Optional)*)
  - `contact_person_phone` (`string` *(Optional)*)
  - `contact_person_email` (`string` *(Optional)*)
  - `perks` (`array` *(Optional)*)
  - `instructions` (`array` *(Optional)*)
  - `required_skills` (`array` *(Optional)*)
  - `latitude` (`number` *(Optional)*)
  - `longitude` (`number` *(Optional)*)
  - `is_recurring` (`boolean` *(Optional)*)
  - `is_certificate_eligible` (`boolean` *(Optional)*)
  - `min_hours_for_certificate` (`number` *(Optional)*)
- **Expected HTTP Status Codes**:
  - **`200`**: Event updated successfully
  - **`400`**: Invalid status, past deadline, or invalid fields
  - **`401`**: Unauthorized
  - **`403`**: Forbidden (Admin role required)
  - **`404`**: Event not found
  - **`500`**: Server error

---

### `DELETE /api/admin/events/{id}`

**Summary**: Soft-delete an event

**Description**: Flags an event as deleted and withdraws active volunteers.

- **Required Headers**:
  - `Authorization`: `Authorization: Bearer <token>` (Admin)
  - `Content-Type`: `application/json`
- **URL / Query Parameters**:
  - `id` (In: `path`, Type: `string` *(Required)*) — No description
- **Request Body**: None
- **Expected HTTP Status Codes**:
  - **`200`**: Event successfully removed
  - **`401`**: Unauthorized
  - **`403`**: Forbidden (Admin role required)
  - **`404`**: Event not found
  - **`500`**: Server error

---

### `GET /api/admin/events/{id}`

**Summary**: Get single event detailed summary

**Description**: Pulls comprehensive event data including full roster and timeline audit logs.

- **Required Headers**:
  - `Authorization`: `Authorization: Bearer <token>` (Admin)
  - `Content-Type`: `application/json`
- **URL / Query Parameters**:
  - `id` (In: `path`, Type: `string` *(Required)*) — No description
- **Request Body**: None
- **Expected HTTP Status Codes**:
  - **`200`**: Event details retrieved successfully
  - **`401`**: Unauthorized
  - **`403`**: Forbidden (Admin role required)
  - **`404`**: Event not found
  - **`500`**: Server error

---

### `POST /api/admin/events/{id}/complete`

**Summary**: Complete an event

**Description**: Marks a published event as completed after its end time and flags unregistered volunteers as absent.

- **Required Headers**:
  - `Authorization`: `Authorization: Bearer <token>` (Admin)
  - `Content-Type`: `application/json`
- **URL / Query Parameters**:
  - `id` (In: `path`, Type: `string` *(Required)*) — No description
- **Request Body**: None
- **Expected HTTP Status Codes**:
  - **`200`**: Event completed successfully
  - **`400`**: Event not finished yet or invalid status
  - **`401`**: Unauthorized
  - **`403`**: Forbidden (Admin role required)
  - **`404`**: Event not found
  - **`500`**: Server error

---

### `POST /api/admin/events/{id}/cancel`

**Summary**: Cancel an event

**Description**: Cancels a draft or published event and updates volunteer attendance to withdrawn.

- **Required Headers**:
  - `Authorization`: `Authorization: Bearer <token>` (Admin)
  - `Content-Type`: `application/json`
- **URL / Query Parameters**:
  - `id` (In: `path`, Type: `string` *(Required)*) — No description
- **Request Body**: None
- **Expected HTTP Status Codes**:
  - **`200`**: Event cancelled successfully
  - **`400`**: Invalid status
  - **`401`**: Unauthorized
  - **`403`**: Forbidden (Admin role required)
  - **`404`**: Event not found
  - **`500`**: Server error

---

### `POST /api/admin/events/{id}/archive`

**Summary**: Archive an event

**Description**: Archives a completed or cancelled event.

- **Required Headers**:
  - `Authorization`: `Authorization: Bearer <token>` (Admin)
  - `Content-Type`: `application/json`
- **URL / Query Parameters**:
  - `id` (In: `path`, Type: `string` *(Required)*) — No description
- **Request Body**: None
- **Expected HTTP Status Codes**:
  - **`200`**: Event archived successfully
  - **`400`**: Invalid status
  - **`401`**: Unauthorized
  - **`403`**: Forbidden (Admin role required)
  - **`404`**: Event not found
  - **`500`**: Server error

---

### `GET /api/admin/events/{eventId}/qr-token`

**Summary**: Generate dynamic QR token

**Description**: Generates a short-lived JWT for check-in or check-out scanning.

- **Required Headers**:
  - `Authorization`: `Authorization: Bearer <token>` (Admin)
  - `Content-Type`: `application/json`
- **URL / Query Parameters**:
  - `eventId` (In: `path`, Type: `string` *(Required)*) — No description
  - `type` (In: `query`, Type: `string` *(Optional)*) — No description
- **Request Body**: None
- **Expected HTTP Status Codes**:
  - **`200`**: QR token generated successfully
  - **`400`**: Invalid time window or status
  - **`401`**: Unauthorized
  - **`403`**: Forbidden (Admin role required)
  - **`500`**: Server error

---

### `PATCH /api/admin/events/{id}/attendance/{registrationId}`

**Summary**: Update attendance by event ID and registration ID

**Description**: Allows admins to adjust attendance check-in/check-out timestamps, logged hours, remarks, or status for a volunteer who registered for the event. Updating check_in_time and check_out_time triggers automated calculation and badge/master-certificate updates in other tables.

- **Required Headers**:
  - `Authorization`: `Authorization: Bearer <token>` (Admin)
  - `Content-Type`: `application/json`
- **URL / Query Parameters**:
  - `id` (In: `path`, Type: `string` *(Required)*) — The Event UUID
  - `registrationId` (In: `path`, Type: `string` *(Required)*) — The Attendance/Registration UUID (attendance_id)
- **JSON Request Body Parameters**:
  - `status` (`string` *(Optional)* [Allowed values: `registered`, `present`, `absent`, `withdrawn`, `waitlisted`])
  - `check_in_time` (`string` *(Optional)*)
  - `check_out_time` (`string` *(Optional)*)
  - `hours_logged` (`number` *(Optional)*) — Optional manual override. If check_in_time and check_out_time are provided, the DB trigger trigger_calculate_hours will compute hours automatically.
  - `admin_remarks` (`string` *(Optional)*)
- **Expected HTTP Status Codes**:
  - **`200`**: Attendance record updated successfully
  - **`400`**: Invalid UUID format, invalid status enum, or no update fields provided
  - **`401`**: Unauthorized
  - **`403`**: Forbidden (Admin privileges required)
  - **`404`**: Registration record not found for this event
  - **`500`**: Server error

---

### `PUT /api/admin/events/{id}/attendance`

**Summary**: Manual attendance override

**Description**: Allows admins to manually modify attendance statuses, override hours, or add remarks.

- **Required Headers**:
  - `Authorization`: `Authorization: Bearer <token>` (Admin)
  - `Content-Type`: `application/json`
- **URL / Query Parameters**:
  - `id` (In: `path`, Type: `string` *(Required)*) — Event UUID
- **JSON Request Body Parameters**:
  - `volunteer_id` (`string` *(Required)*)
  - `status` (`string` *(Optional)* [Allowed values: `registered`, `present`, `absent`, `withdrawn`])
  - `hours_logged` (`number` *(Optional)*)
  - `admin_remarks` (`string` *(Optional)*)
- **Expected HTTP Status Codes**:
  - **`200`**: Attendance updated successfully
  - **`400`**: Invalid attendance parameters
  - **`401`**: Unauthorized
  - **`403`**: Forbidden (Admin privileges required)
  - **`404`**: Attendance record not found
  - **`500`**: Server error

---

### `GET /api/admin/volunteers`

**Summary**: List all registered volunteers

**Description**: Retrieves a paginated list of all volunteers with search, sorting, and filtering capabilities.

- **Required Headers**:
  - `Authorization`: `Authorization: Bearer <token>` (Admin)
  - `Content-Type`: `application/json`
- **URL / Query Parameters**:
  - `search` (In: `query`, Type: `string` *(Optional)*) — Search by volunteer name, email, or phone number
  - `status` (In: `query`, Type: `string` *(Optional)*) — Filter by account status
  - `sortBy` (In: `query`, Type: `string` *(Optional)*) — Sort field (e.g. 'created', 'name', 'hours', 'activities')
  - `sortOrder` (In: `query`, Type: `string` *(Optional)*) — Sort ordering direction
  - `limit` (In: `query`, Type: `integer` *(Optional)*) — Number of volunteers per page
  - `offset` (In: `query`, Type: `integer` *(Optional)*) — Number of volunteers to skip
- **Request Body**: None
- **Expected HTTP Status Codes**:
  - **`200`**: Volunteers retrieved successfully
  - **`401`**: Unauthorized
  - **`403`**: Forbidden (Admin role required)
  - **`500`**: Server error

---

### `GET /api/admin/volunteers/{userId}`

**Summary**: Get single volunteer profile & history

**Description**: Retrieves a specific volunteer's full biographical information and past event attendance history.

- **Required Headers**:
  - `Authorization`: `Authorization: Bearer <token>` (Admin)
  - `Content-Type`: `application/json`
- **URL / Query Parameters**:
  - `userId` (In: `path`, Type: `string` *(Required)*) — No description
- **Request Body**: None
- **Expected HTTP Status Codes**:
  - **`200`**: Volunteer profile retrieved successfully
  - **`400`**: Invalid UUID format
  - **`401`**: Unauthorized
  - **`403`**: Forbidden (Admin role required)
  - **`404`**: Volunteer not found
  - **`500`**: Server error

---

### `DELETE /api/admin/volunteers/{id}`

**Summary**: Deactivate a volunteer account

**Description**: Soft-deletes a volunteer account and automatically withdraws them from future commitments.

- **Required Headers**:
  - `Authorization`: `Authorization: Bearer <token>` (Admin)
  - `Content-Type`: `application/json`
- **URL / Query Parameters**:
  - `id` (In: `path`, Type: `string` *(Required)*) — No description
- **Request Body**: None
- **Expected HTTP Status Codes**:
  - **`200`**: Volunteer successfully deactivated
  - **`401`**: Unauthorized
  - **`403`**: Forbidden (Admin role required)
  - **`404`**: Volunteer not found
  - **`500`**: Server error

---

### `POST /api/admin/tasks`

**Summary**: Create a new task

**Description**: Assigns a new task to a specific volunteer, optionally linking it to an event, deadline, and hours awarded.

- **Required Headers**:
  - `Authorization`: `Authorization: Bearer <token>` (Admin)
  - `Content-Type`: `application/json`
- **URL / Query Parameters**: None
- **JSON Request Body Parameters**:
  - `title` (`string` *(Required)*) — Task title
  - `assigned_to` (`string` *(Required)*) — Volunteer user UUID
  - `event_id` (`string` *(Optional)*) — Optional associated event UUID
  - `description` (`string` *(Optional)*) — Detailed task instructions
  - `deadline` (`string` *(Optional)*) — Task deadline (must be in future)
  - `hours_awarded` (`number` *(Optional)*) — Seva hours granted upon task completion
  - `is_public` (`boolean` *(Optional)*) — Whether other volunteers can view this task
- **Expected HTTP Status Codes**:
  - **`201`**: Task created successfully
  - **`400`**: Missing title/assignee, invalid deadline, or negative hours
  - **`401`**: Unauthorized
  - **`403`**: Forbidden (Admin role required)
  - **`500`**: Server error

---

### `GET /api/admin/tasks`

**Summary**: List all tasks

**Description**: Retrieves tasks with filtering by event, assignee, status, and pagination.

- **Required Headers**:
  - `Authorization`: `Authorization: Bearer <token>` (Admin)
  - `Content-Type`: `application/json`
- **URL / Query Parameters**:
  - `event_id` (In: `query`, Type: `string` *(Optional)*) — Filter tasks by event UUID
  - `assigned_to` (In: `query`, Type: `string` *(Optional)*) — Filter tasks by assigned volunteer UUID
  - `status` (In: `query`, Type: `string` *(Optional)*) — Filter tasks by current status
  - `limit` (In: `query`, Type: `integer` *(Optional)*) — Maximum number of tasks to return
  - `offset` (In: `query`, Type: `integer` *(Optional)*) — Number of tasks to skip
- **Request Body**: None
- **Expected HTTP Status Codes**:
  - **`200`**: Tasks listed successfully
  - **`401`**: Unauthorized
  - **`403`**: Forbidden (Admin role required)
  - **`500`**: Server error

---

### `GET /api/admin/tasks/{id}`

**Summary**: Get task details and timeline

**Description**: Retrieves details of a specific task along with its full timeline history.

- **Required Headers**:
  - `Authorization`: `Authorization: Bearer <token>` (Admin)
  - `Content-Type`: `application/json`
- **URL / Query Parameters**:
  - `id` (In: `path`, Type: `string` *(Required)*) — Task UUID
- **Request Body**: None
- **Expected HTTP Status Codes**:
  - **`200`**: Task details retrieved successfully
  - **`401`**: Unauthorized
  - **`403`**: Forbidden (Admin role required)
  - **`404`**: Task not found
  - **`500`**: Server error

---

### `PUT /api/admin/tasks/{id}`

**Summary**: Update task details

**Description**: Modifies details of a task (only allowed for task creator, before completion).

- **Required Headers**:
  - `Authorization`: `Authorization: Bearer <token>` (Admin)
  - `Content-Type`: `application/json`
- **URL / Query Parameters**:
  - `id` (In: `path`, Type: `string` *(Required)*) — Task UUID
- **JSON Request Body Parameters**:
  - `title` (`string` *(Optional)*)
  - `description` (`string` *(Optional)*)
  - `deadline` (`string` *(Optional)*)
  - `assigned_to` (`string` *(Optional)*)
  - `is_public` (`boolean` *(Optional)*)
- **Expected HTTP Status Codes**:
  - **`200`**: Task updated successfully
  - **`400`**: Invalid status or reassignment not allowed
  - **`401`**: Unauthorized
  - **`403`**: Forbidden / Unauthorized (only task creator can modify)
  - **`404`**: Task not found
  - **`500`**: Server error

---

### `DELETE /api/admin/tasks/{id}`

**Summary**: Soft-delete a task

**Description**: Marks a task as deleted (only allowed for task creator).

- **Required Headers**:
  - `Authorization`: `Authorization: Bearer <token>` (Admin)
  - `Content-Type`: `application/json`
- **URL / Query Parameters**:
  - `id` (In: `path`, Type: `string` *(Required)*) — Task UUID
- **Request Body**: None
- **Expected HTTP Status Codes**:
  - **`200`**: Task deleted successfully
  - **`401`**: Unauthorized
  - **`403`**: Forbidden / Unauthorized (only task creator can delete)
  - **`404`**: Task not found
  - **`500`**: Server error

---

### `PATCH /api/admin/tasks/{id}/status`

**Summary**: Update task status and award hours

**Description**: Allows the admin who created the task to update its status (assigned, in_progress, pending_verification, completed, cancelled), provide remarks, and award volunteer hours.

- **Required Headers**:
  - `Authorization`: `Authorization: Bearer <token>` (Admin)
  - `Content-Type`: `application/json`
- **URL / Query Parameters**:
  - `id` (In: `path`, Type: `string` *(Required)*) — Task UUID
- **JSON Request Body Parameters**:
  - `status` (`string` *(Required)* [Allowed values: `assigned`, `in_progress`, `pending_verification`, `completed`, `cancelled`])
  - `admin_remarks` (`string` *(Optional)*)
  - `hours_awarded` (`number` *(Optional)*) — Required if status is completed
- **Expected HTTP Status Codes**:
  - **`200`**: Task status updated successfully
  - **`400`**: Invalid status or invalid hours
  - **`401`**: Unauthorized
  - **`403`**: Forbidden / Unauthorized (only task creator can change status)
  - **`404`**: Task not found
  - **`500`**: Server error

---

### `PATCH /api/admin/tasks/{id}/progress`

**Summary**: Update assigned task progress (Admin assignee)

**Description**: Allows the assigned admin to mark a task as in_progress or pending_verification.

- **Required Headers**:
  - `Authorization`: `Authorization: Bearer <token>` (Admin)
  - `Content-Type`: `application/json`
- **URL / Query Parameters**:
  - `id` (In: `path`, Type: `string` *(Required)*) — Task UUID
- **JSON Request Body Parameters**:
  - `status` (`string` *(Required)* [Allowed values: `in_progress`, `pending_verification`])
  - `volunteer_remarks` (`string` *(Optional)*)
- **Expected HTTP Status Codes**:
  - **`200`**: Progress updated successfully
  - **`400`**: Invalid status
  - **`401`**: Unauthorized
  - **`403`**: Forbidden / Unauthorized (only assigned user can update progress)
  - **`404`**: Task not found
  - **`500`**: Server error

---

## 6. Response Codes & Standard Error Matrix

| HTTP Status Code | Meaning | Typical Trigger | Recommended Frontend Behavior |
| :--- | :--- | :--- | :--- |
| **`200 OK`** | Success | Request succeeded and returned requested data. | Render components or update state with `data`. |
| **`201 Created`** | Created | New record established (e.g., registration, event creation). | Save returned token/ID and navigate to the target screen. |
| **`400 Bad Request`** | Validation Failure | Missing required fields, invalid UUID, deadline passed, event at capacity, invalid status transition. | Display toast or form field validation message from `response.data.message`. |
| **`401 Unauthorized`** | Authentication Error | Missing token, invalid credentials, or expired JWT. | Clear stored token and redirect user to `/login`. |
| **`403 Forbidden`** | Authorization Error | Role mismatch (e.g. volunteer accessing admin route) or trying to modify an unassigned task. | Render "Access Denied" view or show error banner. |
| **`404 Not Found`** | Resource Missing | Event, volunteer, task, or certificate ID does not exist in the database. | Render 404 Empty State / "Resource Not Found" screen. |
| **`409 Conflict`** | Conflict / Duplicate | Email address or phone number is already registered. | Prompt user to log in or use alternate contact info. |
| **`500 Internal Error`**| Server Exception | Uncaught server or database error. | Show generic error alert: *"An unexpected error occurred. Please try again later."* |
