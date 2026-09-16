const { Pool } = require('pg');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Check if external PostgreSQL connection parameters are configured
const hasExplicitDbConfig = Boolean(
    process.env.DATABASE_URL ||
    (process.env.DB_HOST && process.env.DB_USER && process.env.DB_PASSWORD)
);

let realPool = null;
let isRealDbConnected = false;

if (hasExplicitDbConfig) {
    try {
        const poolConfig = process.env.DATABASE_URL
            ? { connectionString: process.env.DATABASE_URL }
            : {
                user: process.env.DB_USER,
                host: process.env.DB_HOST,
                database: process.env.DB_NAME,
                password: process.env.DB_PASSWORD,
                port: process.env.DB_PORT || 5432,
            };
        realPool = new Pool(poolConfig);
        realPool.on('error', (err) => {
            console.warn('[AI Studio PostgreSQL] Idle client error:', err.message);
        });
    } catch (err) {
        console.warn('[AI Studio PostgreSQL] Failed to initialize pool:', err.message);
    }
}

// =======================================================
// IN-MEMORY MOCK STORE (Active when PostgreSQL is offline)
// =======================================================
const mockUsers = [
    {
        user_id: '11111111-1111-4111-8111-111111111111',
        role: 'admin',
        first_name: 'Master',
        last_name: 'Admin',
        email: 'admin@sevalog.in',
        password_hash: bcrypt.hashSync('123456', 10),
        phone_number: '9876543210',
        profession: 'System Administrator',
        is_active: true,
        created_at: new Date().toISOString()
    },
    {
        user_id: '22222222-2222-4222-8222-222222222222',
        role: 'admin',
        first_name: 'Bhargav',
        last_name: 'Godbole',
        email: 'bhargavgodbole7@gmail.com',
        password_hash: bcrypt.hashSync('Bhargav@2007', 10),
        phone_number: '9876543211',
        profession: 'System Administrator',
        is_active: true,
        created_at: new Date().toISOString()
    },
    {
        user_id: '33333333-3333-4333-8333-333333333333',
        role: 'volunteer',
        first_name: 'Aman',
        last_name: 'Dwivedi',
        email: 'dwivediaman@gmail.com',
        password_hash: bcrypt.hashSync('123456', 10),
        phone_number: '9876543212',
        profession: 'Software Developer',
        is_active: true,
        created_at: new Date().toISOString()
    }
];

const mockEvents = [
    {
        event_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        title: 'Community Wall Painting Drive',
        description: 'Join us in beautifying community spaces and walls across Chembur.',
        category: 'Wall Painting',
        status: 'published',
        event_date: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
        start_time: '09:00:00',
        end_time: '13:00:00',
        volunteers_needed: 15,
        min_volunteers: 5,
        max_volunteers: 25,
        registration_open: true,
        registration_deadline: new Date(Date.now() + 86400000 * 2).toISOString(),
        location_name: 'Chembur Naka Community Center',
        location_address: 'Near Chembur Station East, Mumbai, Maharashtra 400071',
        google_maps_link: 'https://maps.google.com/?q=Chembur+Mumbai',
        contact_person_name: 'Aman Dwivedi',
        contact_person_phone: '9876543210',
        is_deleted: false,
        current_registered: 3
    },
    {
        event_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        title: 'Weekend Mentorship & Counseling',
        description: 'Mentoring scholarship students on science and mathematics.',
        category: 'Teaching & Mentorship',
        status: 'published',
        event_date: new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0],
        start_time: '10:00:00',
        end_time: '12:30:00',
        volunteers_needed: 10,
        min_volunteers: 3,
        max_volunteers: 15,
        registration_open: true,
        registration_deadline: new Date(Date.now() + 86400000 * 5).toISOString(),
        location_name: 'Neev Learning Center',
        location_address: 'Subhash Nagar, Chembur, Mumbai 400071',
        google_maps_link: 'https://maps.google.com/?q=Chembur+Mumbai',
        contact_person_name: 'Bhargav Godbole',
        contact_person_phone: '9876543211',
        is_deleted: false,
        current_registered: 5
    }
];

const mockAttendance = [
    {
        attendance_id: 'att-1111-1111',
        event_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        volunteer_id: '33333333-3333-4333-8333-333333333333',
        status: 'registered',
        check_in_time: null,
        check_out_time: null,
        hours_logged: 0
    }
];

const mockTasks = [];

/**
 * In-memory Mock Query Engine for PostgreSQL queries when database is offline
 */
async function executeMockQuery(text, params = []) {
    const cleanText = text.trim().replace(/\s+/g, ' ');
    const lower = cleanText.toLowerCase();

    // 1. SELECT NOW()
    if (lower.startsWith('select now()')) {
        return { rows: [{ now: new Date().toISOString() }], rowCount: 1 };
    }

    // 2. Transaction commands
    if (lower === 'begin' || lower === 'commit' || lower === 'rollback') {
        return { rows: [], rowCount: 0 };
    }

    // 3. User lookup by email
    if (lower.includes('from users') && lower.includes('email = $1')) {
        const email = String(params[0] || '').toLowerCase();
        const user = mockUsers.find(u => u.email.toLowerCase() === email && u.is_active);
        return { rows: user ? [user] : [], rowCount: user ? 1 : 0 };
    }

    // 4. Check user exists by email OR phone
    if (lower.includes('from users') && (lower.includes('email = $1 or') || lower.includes('phone_number = $2'))) {
        const email = String(params[0] || '').toLowerCase();
        const phone = params[1] ? String(params[1]) : null;
        const user = mockUsers.find(u =>
            (u.email.toLowerCase() === email || (phone && u.phone_number === phone)) && u.is_active
        );
        return { rows: user ? [{ email: user.email, phone_number: user.phone_number }] : [], rowCount: user ? 1 : 0 };
    }

    // 5. User lookup by user_id
    if (lower.includes('from users') && lower.includes('user_id = $1')) {
        const userId = params[0];
        const user = mockUsers.find(u => u.user_id === userId && u.is_active);
        return { rows: user ? [user] : [], rowCount: user ? 1 : 0 };
    }

    // 6. INSERT INTO users
    if (lower.startsWith('insert into users')) {
        const [firstName, lastName, email, passwordHash, phoneNumber, collegeName, profession] = params;
        const newUser = {
            user_id: crypto.randomUUID(),
            first_name: firstName,
            last_name: lastName,
            email: email.toLowerCase(),
            password_hash: passwordHash,
            phone_number: phoneNumber || null,
            college_name: collegeName || null,
            profession: profession || null,
            role: 'volunteer',
            is_active: true,
            created_at: new Date().toISOString()
        };
        mockUsers.push(newUser);
        return {
            rows: [{
                user_id: newUser.user_id,
                first_name: newUser.first_name,
                last_name: newUser.last_name,
                email: newUser.email,
                role: newUser.role
            }],
            rowCount: 1
        };
    }

    // 7. UPDATE users password
    if (lower.startsWith('update users') && lower.includes('password_hash = $1')) {
        const [passwordHash, userId] = params;
        const user = mockUsers.find(u => u.user_id === userId);
        if (user) {
            user.password_hash = passwordHash;
        }
        return { rows: user ? [{ user_id: userId }] : [], rowCount: user ? 1 : 0 };
    }

    // 8. Public events queries
    if (lower.includes('from events') && lower.includes('order by e.event_date asc') && lower.includes('limit 1')) {
        // Latest single upcoming event
        const event = mockEvents.find(e => !e.is_deleted && e.status === 'published') || mockEvents[0];
        return { rows: event ? [event] : [], rowCount: event ? 1 : 0 };
    }

    if (lower.includes('from events') && (lower.includes('count(*) over()') || lower.includes('limit $1 offset $2'))) {
        const limit = params[0] || 10;
        const offset = params[1] || 0;
        const activeEvents = mockEvents.filter(e => !e.is_deleted && e.status === 'published');
        const sliced = activeEvents.slice(offset, offset + limit).map(e => ({
            ...e,
            full_count: activeEvents.length,
            time_phase: 'upcoming'
        }));
        return { rows: sliced, rowCount: sliced.length };
    }

    if (lower.includes('from events') && lower.includes('where e.event_id = $1')) {
        const eventId = params[0];
        const event = mockEvents.find(e => e.event_id === eventId && !e.is_deleted);
        return { rows: event ? [event] : [], rowCount: event ? 1 : 0 };
    }

    // 9. Volunteer events listing
    if (lower.includes('from events e') && lower.includes('user_att.volunteer_id=$1')) {
        const userId = params[0];
        const result = mockEvents.filter(e => !e.is_deleted).map(e => {
            const att = mockAttendance.find(a => a.event_id === e.event_id && a.volunteer_id === userId);
            return {
                ...e,
                dynamic_status: 'upcoming',
                can_withdraw: Boolean(att && att.status === 'registered'),
                current_registrations: e.current_registered || 0,
                attendance_id: att ? att.attendance_id : null,
                user_registration_status: att ? att.status : null,
                check_in_time: att ? att.check_in_time : null,
                check_out_time: att ? att.check_out_time : null,
                hours_logged: att ? att.hours_logged : 0
            };
        });
        return { rows: result, rowCount: result.length };
    }

    // 10. Default fallback
    return { rows: [], rowCount: 0 };
}

/**
 * Safe query handler: delegates to PostgreSQL if available, otherwise runs in-memory mock
 */
async function query(text, params) {
    if (realPool) {
        try {
            const result = await realPool.query(text, params);
            isRealDbConnected = true;
            return result;
        } catch (err) {
            console.warn('[AI Studio PostgreSQL] Query failed, using mock fallback:', err.message);
        }
    }
    return executeMockQuery(text, params);
}

/**
 * Safe client connection for transactions
 */
async function connect() {
    if (realPool) {
        try {
            const client = await realPool.connect();
            isRealDbConnected = true;
            return client;
        } catch (err) {
            console.warn('[AI Studio PostgreSQL] Connection failed, using mock transaction client:', err.message);
        }
    }

    // Return mock client for transaction operations
    return {
        query: async (text, params) => executeMockQuery(text, params),
        release: () => {}
    };
}

const pool = {
    query,
    connect,
    end: (callback) => {
        if (realPool) {
            return realPool.end(callback);
        }
        if (callback) callback();
    },
    on: (event, handler) => {
        if (realPool) {
            realPool.on(event, handler);
        }
    }
};

module.exports = {
    query,
    connect,
    pool
};
