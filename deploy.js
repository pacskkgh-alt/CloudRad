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
        console.log("Uploading cloudrad_deploy.tar.gz...");
        await sftp.fastPut("cloudrad_deploy.tar.gz", "/root/cloudrad_deploy.tar.gz");
        await sftp.end();
        console.log("Upload complete.");

        console.log("Connecting SSH to execute commands...");
        const conn = new Client();
        conn.on('ready', () => {
            console.log('SSH Client :: ready');
            const script = `
                mkdir -p /app
                tar -xzf /root/cloudrad_deploy.tar.gz -C /app
                sudo apt-get update
                sudo DEBIAN_FRONTEND=noninteractive apt-get install -y docker.io curl
                mkdir -p ~/.docker/cli-plugins/
                curl -SL https://github.com/docker/compose/releases/download/v2.24.5/docker-compose-linux-x86_64 -o ~/.docker/cli-plugins/docker-compose
                chmod +x ~/.docker/cli-plugins/docker-compose
                cd /app
                mv docker-compose.prod.yml docker-compose.yml
                docker compose down
                docker builder prune -a -f
                docker compose build --no-cache
                docker compose up -d --remove-orphans
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
