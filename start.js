import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Function to start the backend server
function startBackend() {
    console.log('Starting backend server...');
    const backendPath = join(__dirname, 'backend');
    
    // Use 'python' instead of venv path
    const backend = spawn('python', ['-m', 'uvicorn', 'main:app', '--reload', '--host', '0.0.0.0', '--port', '8000'], {
        cwd: backendPath,
        shell: true
    });

    backend.stdout.on('data', (data) => {
        console.log(`Backend: ${data}`);
    });

    backend.stderr.on('data', (data) => {
        console.error(`Backend Error: ${data}`);
    });

    backend.on('close', (code) => {
        console.log(`Backend process exited with code ${code}`);
    });
}

// Function to start the frontend server
function startFrontend() {
    console.log('Starting frontend server...');
    const frontend = spawn('npm', ['run', 'dev'], {
        shell: true,
        env: {
            ...process.env,
            NODE_ENV: 'development'
        }
    });

    frontend.stdout.on('data', (data) => {
        console.log(`Frontend: ${data}`);
    });

    frontend.stderr.on('data', (data) => {
        console.error(`Frontend Error: ${data}`);
    });

    frontend.on('close', (code) => {
        console.log(`Frontend process exited with code ${code}`);
    });
}

// Check if we're in production
const isProduction = process.env.NODE_ENV === 'production';

if (isProduction) {
    // In production, only start the backend
    startBackend();
} else {
    // In development, start both frontend and backend
    startBackend();
    startFrontend();
} 