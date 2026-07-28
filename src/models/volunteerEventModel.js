const db = require('../config/db');

const VolunteerEventModel = {
    /**
     * Fetch all upcoming and ongoing events, along with the user's personal registration status
     */
    getEvents: async (userId) => {
        const query = `
            SELECT
                e.event_id,
                e.title,
                e.description,
                e.category,

                TO_CHAR(e.event_date,'YYYY-MM-DD') AS event_date,

                e.start_time,
                e.end_time,

                e.location_name,
                e.location_address,
                e.google_maps_link,

                e.contact_person_name,
                e.contact_person_phone,

                e.volunteers_needed,
                e.max_volunteers,

                e.registration_deadline,

                e.status,

                CASE
                    WHEN e.status = 'cancelled'
                        THEN 'cancelled'

                    WHEN e.status = 'completed'
                        THEN 'completed'

                    WHEN CURRENT_DATE < e.event_date
                        THEN 'upcoming'

                    WHEN CURRENT_DATE = e.event_date
                        AND CURRENT_TIME < e.start_time
                        THEN 'upcoming'

                    WHEN CURRENT_DATE = e.event_date
                        AND CURRENT_TIME BETWEEN e.start_time AND e.end_time
                        THEN 'ongoing'

                    WHEN CURRENT_DATE > e.event_date
                        THEN 'completed'

                    WHEN CURRENT_DATE = e.event_date
                        AND CURRENT_TIME > e.end_time
                        THEN 'completed'
                END AS dynamic_status,
                
                CASE
                    WHEN e.status <> 'published'
                        THEN FALSE

                    WHEN e.registration_deadline IS NOT NULL
                        AND CURRENT_TIMESTAMP > e.registration_deadline
                        THEN FALSE

                    WHEN e.max_volunteers IS NOT NULL
                        AND COALESCE(att.reg_count,0) >= e.max_volunteers
                        THEN FALSE

                    ELSE TRUE
                END AS registration_open,

                CASE
                    WHEN user_att.status='registered'
                        AND CURRENT_TIMESTAMP <
                            (e.event_date + e.start_time)
                    THEN TRUE
                    ELSE FALSE
                END AS can_withdraw,

                COALESCE(att.reg_count,0)::INTEGER
                    AS current_registrations,

                user_att.attendance_id,

                user_att.status
                    AS user_registration_status,

                user_att.check_in_time,
                user_att.check_out_time,
                user_att.hours_logged
            FROM events e
            LEFT JOIN (
                SELECT
                    event_id,
                    COUNT(*) FILTER
                    (
                        WHERE status IN ('registered','present')
                    ) AS reg_count
                FROM attendance
                GROUP BY event_id
            ) att
            ON att.event_id=e.event_id
            LEFT JOIN attendance user_att
                ON user_att.event_id=e.event_id
                AND user_att.volunteer_id=$1
            WHERE
                e.is_deleted=FALSE
                AND e.status<>'draft'
                AND e.status<>'archived'
            ORDER BY
                e.event_date ASC,
                e.start_time ASC;
        `;

        const { rows } = await db.query(query,[userId]);

        return rows;

    },

    /**
     * Handle Volunteer Registration safely with capacity awareness
     */
    registerForEvent: async (eventId, userId) => {
        const client = await db.connect();
        try {
            await client.query('BEGIN');

            // 1. Lock the event row to prevent race conditions during capacity check
            const eventQuery = `SELECT * FROM events WHERE event_id = $1 AND is_deleted = FALSE FOR UPDATE;`;
            const { rows: eventRows } = await client.query(eventQuery, [eventId]);
            
            if (eventRows.length === 0) throw new Error('Event not found.');
            const event = eventRows[0];

            if (event.status !== "published") {
                throw new Error("Registration is not available for this event.");
            }

            if (event.registration_deadline && new Date() > new Date(event.registration_deadline)) {
                throw new Error('The registration deadline for this event has passed.');
            }

            const eventStart = new Date(
                `${event.event_date.toISOString().split("T")[0]}T${event.start_time}`
            );

            if (new Date() >= eventStart) {
                throw new Error("Registration has closed. The event has already started.");
            }

            const existing = await client.query(
                `
                SELECT status
                FROM attendance
                WHERE event_id=$1
                AND volunteer_id=$2
                `,
                [eventId,userId]
            );

            if(existing.rows.length){
                const status = existing.rows[0].status;
                if(status==="registered"){
                    throw new Error("You have already registered.");
                }
                if(status==="present"){
                    throw new Error("Attendance has already been marked.");
                }
            }

            // 2. Check current capacity
            const countQuery = `SELECT COUNT(*)::INTEGER AS total FROM attendance WHERE event_id = $1 AND status IN ('registered', 'present');`;
            const { rows: countRows } = await client.query(countQuery, [eventId]);
            const currentCount = countRows[0].total;

            // 3. Capacity & Waitlist Routing
            if (event.max_volunteers && currentCount >= event.max_volunteers) {
                throw new Error('Event is at maximum capacity.');
            }

            // 4. Insert or Update (Upsert to handle previous withdrawals)
            const upsertQuery = `
                INSERT INTO attendance (event_id, volunteer_id, status)
                VALUES ($1, $2, 'registered')
                RETURNING *;
            `;
            const { rows: attRows } = await client.query(upsertQuery, [eventId, userId]);

            await client.query(
                `
                INSERT INTO event_timeline
                (
                    event_id,
                    user_id,
                    action
                )
                VALUES
                (
                    $1,
                    $2,
                    $3
                )
                `,
                [
                    eventId,
                    userId,
                    "Volunteer registration completed"
                ]
            );

            await client.query('COMMIT');
            return { success: true, attendance: attRows[0] };
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    },

    /**
     * Allow user to withdraw from an event
     */
    withdrawFromEvent: async (eventId, userId) => {
        const client = await db.connect();
        try {
            await client.query("BEGIN");
            const eventResult = await client.query(
                `
                SELECT *
                FROM events
                WHERE event_id=$1
                AND is_deleted=FALSE
                FOR UPDATE
                `,
                [eventId]
            );

            if (!eventResult.rows.length) {
                throw new Error("Event not found.");
            }

            const event = eventResult.rows[0];

            if (event.status !== "published") {
                throw new Error("Withdrawal is not allowed for this event.");
            }

            const eventStart = new Date(
                `${event.event_date.toISOString().split("T")[0]}T${event.start_time}`
            );

            if (new Date() >= eventStart) {
                throw new Error("Cannot withdraw after the event has started.");
            }

            const attendanceResult = await client.query(
                `
                SELECT *
                FROM attendance
                WHERE event_id=$1
                AND volunteer_id=$2
                `,
                [eventId, userId]
            );

            if (!attendanceResult.rows.length) {
                throw new Error("You are not registered for this event.");
            }

            const attendance = attendanceResult.rows[0];

            if (attendance.status === "withdrawn") {
                throw new Error("You have already withdrawn from this event.");
            }

            if (attendance.status === "present") {
                throw new Error("Attendance has already been marked.");
            }

            const updateResult = await client.query(
                `
                UPDATE attendance
                SET status='withdrawn'
                WHERE attendance_id=$1
                RETURNING *
                `,
                [attendance.attendance_id]
            );

            await client.query(
                `
                INSERT INTO event_timeline
                (
                    event_id,
                    user_id,
                    action
                )
                VALUES
                (
                    $1,
                    $2,
                    $3
                )
                `,
                [
                    eventId,
                    userId,
                    "Volunteer withdrew from event"
                ]
            );

            await client.query("COMMIT");
            return updateResult.rows[0];
        }
        catch(error){
            await client.query("ROLLBACK");
            throw error;
        }
        finally{
            client.release();
        }
    },

    /**
     * Volunteer Check-In
     */
    checkInVolunteer: async (eventId, userId) => {
        const client = await db.connect();
        try {
            await client.query("BEGIN");

            const attendanceResult = await client.query(
                `
                SELECT
                    attendance_id,
                    status
                FROM attendance
                WHERE event_id = $1
                AND volunteer_id = $2
                FOR UPDATE
                `,
                [eventId, userId]
            );

            if (attendanceResult.rows.length === 0) {
                throw new Error("You are not registered for this event.");
            }

            const attendance = attendanceResult.rows[0];

            const eventResult = await client.query(
                `
                SELECT
                    event_date,
                    start_time,
                    end_time,
                    status
                FROM events
                WHERE event_id = $1
                FOR UPDATE
                `,
                [eventId]
            );

            if (eventResult.rows.length === 0) {
                throw new Error("Event not found.");
            }

            const event = eventResult.rows[0];

            if (event.status !== "published") {
                throw new Error("Check-in is unavailable.");
            }

            const eventEnd = new Date(
                `${event.event_date.toISOString().split("T")[0]}T${event.end_time}`
            );
            if (new Date() > eventEnd) {
                throw new Error("Event has already ended.");
            }
            if (attendance.status === "present") {
                throw new Error("Already checked in.");
            }
            if (attendance.status !== "registered") {
                throw new Error(
                    `Cannot check in. Current status is '${attendance.status}'.`
                );
            }
            const updateResult = await client.query(
                `
                UPDATE attendance
                SET
                    status='present',
                    check_in_time=NOW()
                WHERE attendance_id=$1
                RETURNING *
                `,
                [attendance.attendance_id]
            );
            await client.query(
                `
                INSERT INTO event_timeline
                (
                    event_id,
                    user_id,
                    action
                )
                VALUES
                (
                    $1,
                    $2,
                    $3
                )
                `,
                [
                    eventId,
                    userId,
                    "Volunteer checked in"
                ]
            );
            await client.query("COMMIT");
            return updateResult.rows[0];
        }
        catch (error) {
            await client.query("ROLLBACK");
            throw error;
        }
        finally {
            client.release();
        }
    },

    /**
     * Volunteer Checkout
     */
    checkoutFromEvent: async (eventId, userId) => {
        const client = await db.connect();

        try {
            await client.query("BEGIN");
            // Lock attendance record
            const attendanceResult = await client.query(
                `
                SELECT
                    attendance_id,
                    status,
                    check_in_time,
                    check_out_time
                FROM attendance
                WHERE event_id = $1
                AND volunteer_id = $2
                FOR UPDATE
                `,
                [eventId, userId]
            );
            if (attendanceResult.rows.length === 0) {
                throw new Error("You are not registered for this event.");
            }
            const attendance = attendanceResult.rows[0];
            if (attendance.status !== "present") {
                throw new Error("You are not currently checked in.");
            }
            if (attendance.check_out_time) {
                throw new Error("You have already checked out.");
            }
            // Lock event row
            const eventResult = await client.query(
                `
                SELECT
                    status,
                    event_date,
                    start_time,
                    end_time
                FROM events
                WHERE event_id = $1
                FOR UPDATE
                `,
                [eventId]
            );
            if (eventResult.rows.length === 0) {
                throw new Error("Event not found.");
            }
            const event = eventResult.rows[0];
            if (event.status !== "published") {
                throw new Error("Checkout is unavailable for this event.");
            }
            const now = new Date();
            const eventStart = new Date(
                `${event.event_date.toISOString().split("T")[0]}T${event.start_time}`
            );
            const eventEnd = new Date(
                `${event.event_date.toISOString().split("T")[0]}T${event.end_time}`
            );
            // Optional: prevent checkout before event starts
            if (now < eventStart) {
                throw new Error("Checkout is not available yet.");
            }
            const checkIn = new Date(attendance.check_in_time);
            const hoursLogged =
                Math.round(((now - checkIn) / (1000 * 60 * 60)) * 100) / 100;
            const updateResult = await client.query(
                `
                UPDATE attendance
                SET
                    check_out_time = NOW(),
                    hours_logged = $1
                WHERE attendance_id = $2
                RETURNING *
                `,
                [
                    hoursLogged,
                    attendance.attendance_id
                ]
            );
            await client.query(
                `
                INSERT INTO event_timeline
                (
                    event_id,
                    user_id,
                    action
                )
                VALUES
                (
                    $1,
                    $2,
                    $3
                )
                `,
                [
                    eventId,
                    userId,
                    "Volunteer checked out"
                ]
            );
            await client.query("COMMIT");
            return updateResult.rows[0];
        } catch (error) {
            await client.query("ROLLBACK");
            throw error;
        } finally {
            client.release();
        }
    }
};

module.exports = VolunteerEventModel;