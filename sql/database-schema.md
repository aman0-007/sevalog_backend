# Chembur Samithi Seva - Database Schema Documentation

This document outlines the PostgreSQL database architecture for the Chembur Samithi Seva Management System. The database is highly automated using PL/pgSQL triggers to handle hours logging, certificate generation, and volunteer gamification seamlessly.

## 1. Custom ENUM Types

To maintain data integrity, the system uses the following custom types:

| ENUM Name | Values |
| :--- | :--- |
| **`user_role`** | `admin`, `volunteer` |
| **`attendance_status`** | `registered`, `withdrawn`, `present`, `absent` |
| **`event_lifecycle_status`** | `draft`, `published`, `completed`, `cancelled`, `archived` |
| **`task_status`** | `assigned`, `in_progress`, `pending_verification`, `completed`, `cancelled` |
| **`badge_metric`** | `hours`, `events_count` |
| **`certificate_type`** | `event`, `master` |
| **`blood_group_type`** | `A+`, `A-`, `B+`, `B-`, `AB+`, `AB-`, `O+`, `O-` |
| **`event_category`** | `Cleanliness`, `Food Drive`, `Teaching`, `Medical Camp`, `Animal Welfare`, `Other` |

---

## 2. Core Entity Tables

### `users`
Stores all admins and volunteers.
*   **Primary Key:** `user_id` (UUID)
*   **Key Fields:** `role`, `first_name`, `last_name`, `email`, `password_hash`, `phone_number`
*   **Demographics:** `date_of_birth`, `gender`, `blood_group`, `residential_address`
*   **Details:** `education_level`, `college_name`, `profession` (with constraints to ensure at least one is filled).
*   **Arrays:** `skills`, `languages_spoken`, `interested_activities`

### `events`
Stores physical and virtual events/activities.
*   **Primary Key:** `event_id` (UUID)
*   **Foreign Keys:** `created_by` -> `users(user_id)`
*   **Key Fields:** `title`, `category` (**event_category**), `status`, `event_date`, `start_time`, `end_time`
*   **Logistics:** `location_name`, `google_maps_link`, `volunteers_needed`, `max_volunteers`

### `attendance`
Links volunteers to events they registered for.
*   **Primary Key:** `attendance_id` (UUID)
*   **Foreign Keys:** `event_id`, `volunteer_id`, `marked_by`
*   **Key Fields:** `status` (attendance_status), `check_in_time`, `check_out_time`, `hours_logged`

### `event_timeline`
A global audit log for system actions.
*   **Primary Key:** `log_id` (UUID)
*   **Key Fields:** `event_id` (Nullable for global logs), `user_id`, `action`, `timestamp`

---

## 3. Task Management System

### `tasks`
Tracks operational and remote work assigned to specific users.
*   **Primary Key:** `task_id` (UUID)
*   **Foreign Keys:** `event_id` (Optional), `created_by`, `assigned_to` -> `users(user_id)`
*   **Key Fields:** `title`, `description`, `status` (task_status), `deadline`, `hours_awarded`
*   **Communication:** `volunteer_remarks`, `admin_remarks`

### `task_timeline`
Audit log specifically for task updates (progress changes, verifications).

---

## 4. Gamification & Certificates

### `ranks`
Defines seniority levels based on total hours.
*   **Fields:** `rank_id`, `name` (e.g., Bronze Leader), `min_hours`, `icon_name`, `color_hex`

### `badges`
Defines activity-specific achievements (The Rules Engine).
*   **Fields:** `badge_id`, `name` (e.g., Eco Warrior), `target_category` (**event_category**), `criteria_metric` (hours or events_count), `criteria_value`

### `user_badges`
Junction table tracking which volunteer earned which badge.
*   **Primary Key:** Composite `(user_id, badge_id)`
*   **Fields:** `awarded_at`

### `certificates`
Stores verified, downloadable credentials for volunteers.
*   **Primary Key:** `certificate_id` (UUID)
*   **Foreign Keys:** `user_id`, `event_id`
*   **Key Fields:** `type`, `hours_credited`, `issued_at`

---

## 5. Automated Triggers (PL/pgSQL)

The database handles complex logic automatically via triggers:

1.  **`trigger_calculate_hours`**: Fires on `attendance` updates. Automatically calculates `hours_logged` by doing math on `check_in_time` and `check_out_time`.
2.  **`trigger_auto_certificates`**: Fires when an `event` is updated to `completed`. Instantly generates unique UUID `certificates` for every volunteer marked `present`.
3.  **`trigger_evaluate_badges` / `trigger_evaluate_task_badges`**: Fires when attendance is marked `present` OR a task is marked `completed`. It calculates combined hours/events, awards new `user_badges` if thresholds are met, and posts an announcement to the `event_timeline`.
4.  **`set_timestamp_*`**: Automatically updates `updated_at` rows across Users, Events, and Tasks tables on modification.

---

## 6. Views (API Optimization)

1.  **`active_events_view`**
    *   Returns all events NOT in draft/cancelled/archived state.
    *   *Virtual Column:* `current_registered_count` (Calculates live capacity).
2.  **`volunteer_dashboard_stats`**
    *   The ultimate unified dashboard view.
    *   Aggregates total events and tasks completed.
    *   Mathematically adds `attendance.hours_logged` + `tasks.hours_awarded`.
    *   Calculates real-time `current_rank`, `current_rank_icon`, and `next_rank_hours`.
    *   Packages earned badges into a clean JSON array (`earned_badges`) for instant API delivery.

---
*Generated for the SevaLog System Architecture.*