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
                    WHEN e.status IN ('cancelled', 'archived', 'draft', 'completed') THEN e.status::text
                    WHEN (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date < e.event_date THEN 'upcoming'
                    WHEN (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date = e.event_date AND (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::time < e.start_time THEN 'upcoming'                    
                    WHEN e.status = 'published' THEN 'ongoing'
                    ELSE e.status::text
                END AS dynamic_status,
                
                CASE
                    WHEN e.status <> 'published' THEN FALSE
                    WHEN e.registration_deadline IS NOT NULL AND (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata') > (e.registration_deadline AT TIME ZONE 'Asia/Kolkata') THEN FALSE
                    WHEN e.max_volunteers IS NOT NULL AND COALESCE(att.reg_count,0) >= e.max_volunteers THEN FALSE
                    ELSE TRUE
                END AS registration_open,

                CASE
                    WHEN user_att.status='registered' AND (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata') < (e.event_date + e.start_time) THEN TRUE
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

            const yyyy = event.event_date.getFullYear();
            const mm = String(event.event_date.getMonth() + 1).padStart(2, '0');
            const dd = String(event.event_date.getDate()).padStart(2, '0');
            const eventStart = new Date(`${yyyy}-${mm}-${dd}T${event.start_time}+05:30`);

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
            let assignedStatus = 'registered';
            if (event.max_volunteers && currentCount >= event.max_volunteers) {
                assignedStatus = 'waitlisted';
            }

            // 4. Insert Attendance Record
            const upsertQuery = `
                INSERT INTO attendance (event_id, volunteer_id, status)
                VALUES ($1, $2, $3)
                RETURNING *;
            `;
            const { rows: attRows } = await client.query(upsertQuery, [eventId, userId, assignedStatus]);

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

            const yyyy = event.event_date.getFullYear();
            const mm = String(event.event_date.getMonth() + 1).padStart(2, '0');
            const dd = String(event.event_date.getDate()).padStart(2, '0');
            const eventStart = new Date(`${yyyy}-${mm}-${dd}T${event.start_time}+05:30`);

            const cutoffTime = new Date(eventStart.getTime() - (30 * 60000));
            if (new Date() >= cutoffTime) {
                throw new Error("Cannot withdraw within 30 minutes of the event start time.");
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

            // ARCHITECTURE FIX: Lock events FIRST to prevent deadlocks with Admin APIs
            const eventResult = await client.query(
                `SELECT event_date, start_time, end_time, status 
                 FROM events WHERE event_id = $1 FOR UPDATE`,
                [eventId]
            );

            if (eventResult.rows.length === 0) throw new Error("Event not found.");
            
            const event = eventResult.rows[0];
            if (event.status !== "published") throw new Error("Check-in is unavailable for this event status.");

            // FIX: Safely extract local YYYY-MM-DD without UTC shifting
            const evDate = event.event_date;
            const yyyy = evDate.getFullYear();
            const mm = String(evDate.getMonth() + 1).padStart(2, '0');
            const dd = String(evDate.getDate()).padStart(2, '0');
            const localDateStr = `${yyyy}-${mm}-${dd}`;

            // Date processing boundary check
            const eventEnd = new Date(`${localDateStr}T${event.end_time}+05:30`);
            if (new Date() > eventEnd) throw new Error("Event has already ended.");

            // Now lock attendance
            const attendanceResult = await client.query(
                `SELECT attendance_id, status 
                 FROM attendance 
                 WHERE event_id = $1 AND volunteer_id = $2 FOR UPDATE`,
                [eventId, userId]
            );

            if (attendanceResult.rows.length === 0) throw new Error("You are not registered for this event.");
            
            const attendance = attendanceResult.rows[0];
            if (attendance.status === "present") throw new Error("Already checked in.");
            if (attendance.status !== "registered") throw new Error(`Cannot check in. Current status is '${attendance.status}'.`);

            // Execute Updates
            const updateResult = await client.query(
                `UPDATE attendance 
                 SET status='present', check_in_time=CURRENT_TIMESTAMP 
                 WHERE attendance_id=$1 RETURNING *`,
                [attendance.attendance_id]
            );

            await client.query(
                `INSERT INTO event_timeline (event_id, user_id, action) 
                 VALUES ($1, $2, 'Volunteer checked in via QR')`,
                [eventId, userId]
            );

            await client.query("COMMIT");
            return updateResult.rows[0];
        } catch (error) {
            await client.query("ROLLBACK");
            throw error;
        } finally {
            client.release();
        }
    },

    /**
     * Volunteer Checkout
     */
    checkOutVolunteer: async (eventId, userId) => {
        const client = await db.connect();
        try {
            await client.query("BEGIN");
            
            // ARCHITECTURE FIX: Lock events FIRST to prevent deadlocks
            const eventResult = await client.query(
                `SELECT status, event_date, start_time, end_time 
                 FROM events WHERE event_id = $1 FOR UPDATE`,
                [eventId]
            );

            if (eventResult.rows.length === 0) throw new Error("Event not found.");
            const event = eventResult.rows[0];
            
            if (event.status !== "published") throw new Error("Checkout is unavailable for this event.");

            // FIX: Safely extract local YYYY-MM-DD without UTC shifting
            const evDate = event.event_date;
            const yyyy = evDate.getFullYear();
            const mm = String(evDate.getMonth() + 1).padStart(2, '0');
            const dd = String(evDate.getDate()).padStart(2, '0');
            const localDateStr = `${yyyy}-${mm}-${dd}`;

            const now = new Date();
            const eventStart = new Date(`${localDateStr}T${event.start_time}+05:30`);
            const eventEnd = new Date(`${localDateStr}T${event.end_time}+05:30`);

            if (now < eventStart) throw new Error("Checkout is not available before the event starts.");
            
            // Apply the same 2-hour limit from the QR Generator for absolute security
            const checkoutDeadline = new Date(eventEnd.getTime() + (2 * 60 * 60 * 1000));
            if (now > checkoutDeadline) {
                throw new Error("Checkout window has closed. It is only available up to 2 hours after the event ends.");
            }

            // Now lock attendance
            const attendanceResult = await client.query(
                `SELECT attendance_id, status, check_in_time, check_out_time 
                 FROM attendance 
                 WHERE event_id = $1 AND volunteer_id = $2 FOR UPDATE`,
                [eventId, userId]
            );

            if (attendanceResult.rows.length === 0) throw new Error("You are not registered for this event.");
            
            const attendance = attendanceResult.rows[0];
            if (attendance.status !== "present") throw new Error("You must check in before checking out.");
            if (attendance.check_out_time) throw new Error("You have already checked out.");

            // ARCHITECTURE FIX: Removed manual hours math. 
            // The Postgres trigger `calculate_attendance_hours` will automatically calculate it when check_out_time is set.
            const updateResult = await client.query(
                `UPDATE attendance 
                 SET check_out_time = CURRENT_TIMESTAMP 
                 WHERE attendance_id = $1 RETURNING *`,
                [attendance.attendance_id]
            );

            await client.query(
                `INSERT INTO event_timeline (event_id, user_id, action) 
                 VALUES ($1, $2, 'Volunteer checked out via QR')`,
                [eventId, userId]
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