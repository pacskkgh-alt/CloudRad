const Client = require('ssh2').Client;
const SftpClient = require('ssh2-sftp-client');
const fs = require('fs');

const host = "165.227.89.199";
const user = "root";
const password = "hKmMgFjxWJW9H4d9KVvL";

async function deploy() {
    const sftp = new SftpClient();
    try {
        console.log("Connecting SFTP...");
        await sftp.connect({ host, username: user, password, port: 22 });
        
        console.log("Uploading pacs_location.conf...");
        await sftp.fastPut("pacs_location.conf", "/app/pacs_location.conf");
        
        console.log("Uploading api_upload.py...");
        await sftp.fastPut("backend/api_upload.py", "/app/backend/api_upload.py");
        
        await sftp.end();
        console.log("Upload complete.");

        console.log("Connecting SSH to execute commands...");
        const conn = new Client();
        conn.on('ready', () => {
            console.log('SSH Client :: ready');
            const script = `
                cd /app
                docker restart nginx-proxy
                docker restart cloudrad-backend-1 || docker restart backend
                echo "Deployment applied dynamically!"
            `;
            conn.exec(script, (err, stream) => {
                if (err) throw err;
                stream.on('close', (code, signal) => {
                    console.log('Stream :: close :: code: ' + code + ', signal: ' + signal);
                    conn.end();
                }).on('data', (data) => {
                    process.stdout.write(data.toString());
                }).stderr.on('data', (data) => {
                    process.stderr.write(data.toString());
                });
            });
        }).connect({ host, username: user, password, port: 22, readyTimeout: 60000 });
    } catch (err) {
        console.error(err);
    }
}

deploy();
