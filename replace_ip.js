const fs = require('fs');
const path = require('path');

const oldIp1 = "165.227.89.199";
const newIp1 = "165.227.89.199";

const oldIp2 = "165-227-89-199";
const newIp2 = "165-227-89-199";

function walkDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fullPath.includes('.git') || fullPath.includes('node_modules')) continue;
        
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            walkDir(fullPath);
        } else {
            if (fullPath.match(/\.(js|jsx|py|yml|yaml|conf|sh|ps1|md)$/)) {
                let content = fs.readFileSync(fullPath, 'utf8');
                if (content.includes(oldIp1) || content.includes(oldIp2)) {
                    content = content.split(oldIp1).join(newIp1);
                    content = content.split(oldIp2).join(newIp2);
                    fs.writeFileSync(fullPath, content, 'utf8');
                    console.log("Updated: " + fullPath);
                }
            }
        }
    }
}

walkDir("d:\\noor tela\\CloudRad");
