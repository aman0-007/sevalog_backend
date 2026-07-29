// migrate.js
const fs = require('fs');
const path = require('path');
const util = require('util');
const exec = util.promisify(require('child_process').exec);
require('dotenv').config();

const runMigration = async () => {
    const direction = process.argv[2]; 

    if (!['up', 'down'].includes(direction)) {
        console.error('❌ Please specify "up" or "down". Example: node migrate.js up');
        process.exit(1);
    }

    const sqlDir = path.join(__dirname, '../sql'); // Adjust path if needed

    try {
        // 1. Find the correct SQL file
        const allFiles = fs.readdirSync(sqlDir);
        const matchingFiles = allFiles
            .filter(file => file.endsWith(`.${direction}.sql`))
            .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

        if (matchingFiles.length === 0) {
            console.error(`❌ No .${direction}.sql files found in directory: ${sqlDir}`);
            process.exit(1);
        }

        const targetFile = matchingFiles[matchingFiles.length - 1];
        const filePath = path.join(sqlDir, targetFile);

        console.log(`⏳ Preparing to execute ${targetFile}...`);

        // 2. Setup Database Credentials
        const dbUser = process.env.DB_USER || 'postgres';
        const dbHost = process.env.DB_HOST || 'localhost';
        const dbPort = process.env.DB_PORT || 5432;
        const dbPass = process.env.DB_PASSWORD || '';
        
        // Always connect to the default 'postgres' database initially. 
        // Your \c commands inside the SQL files will handle switching to your custom DB.
        const initialDb = 'postgres'; 

        // 3. Build the psql command
        // -v ON_ERROR_STOP=1 ensures the script stops if a fatal error occurs
        const command = `psql -U ${dbUser} -h ${dbHost} -p ${dbPort} -d ${initialDb} -v ON_ERROR_STOP=1 -f "${filePath}"`;

        console.log(`🚀 Executing ${direction} migration via native psql...`);
        
        // 4. Execute the command
        // We inject PGPASSWORD into the environment so psql doesn't prompt for it
        const { stdout, stderr } = await exec(command, {
            env: { ...process.env, PGPASSWORD: dbPass }
        });

        // Postgres often outputs non-error notices (like "DROP TABLE") to stderr
        if (stderr) {
            console.log(`ℹ️  PostgreSQL Notices:\n${stderr.trim()}`);
        }

        console.log(`✅ Output:\n${stdout.trim()}`);
        console.log(`🎉 ${direction.toUpperCase()} migration (${targetFile}) completed successfully.`);

    } catch (error) {
        console.error(`❌ Migration failed!`);
        // If psql throws a genuine error, it will be caught here
        if (error.stderr) {
            console.error(`Database Error: ${error.stderr.trim()}`);
        } else {
            console.error(error.message);
        }
        process.exit(1);
    }
};

runMigration();