const fs = require('fs');
const path = require('path');

const archivePath = path.resolve('app.asar');
const destPath = path.resolve('app_unpacked');

const fd = fs.openSync(archivePath, 'r');
const buf = Buffer.alloc(16);
fs.readSync(fd, buf, 0, 16, 0);

const strLen = buf.readUInt32LE(12);
const jsonBuf = Buffer.alloc(strLen);
fs.readSync(fd, jsonBuf, 0, strLen, 16);

let jsonStr = jsonBuf.toString('utf8');
// remove trailing nulls padding
jsonStr = jsonStr.replace(/\0+$/, '');

const header = JSON.parse(jsonStr);

// Sometimes offset is relative to the end of the header
// The header size includes the 8 byte prefix usually.
// Wait, the standard electron ASAR offset is relative to sizeBuf.readUInt32LE(4) + 8.
const headerSize = buf.readUInt32LE(4);
const baseOffset = headerSize + 8;

function extract(dirNode, currentPath) {
    if (!fs.existsSync(currentPath)) {
        fs.mkdirSync(currentPath, { recursive: true });
    }
    
    if (!dirNode.files) return;

    for (const name in dirNode.files) {
        const fileNode = dirNode.files[name];
        const fullPath = path.join(currentPath, name);
        
        if (fileNode.files) {
            extract(fileNode, fullPath);
        } else if (fileNode.unpacked) {
            console.log(`Skipping unpacked file: ${fullPath}`);
        } else if (fileNode.size !== undefined && fileNode.offset !== undefined) {
            const offset = parseInt(fileNode.offset);
            const size = parseInt(fileNode.size);
            
            const fileBuf = Buffer.alloc(size);
            fs.readSync(fd, fileBuf, 0, size, baseOffset + offset);
            fs.writeFileSync(fullPath, fileBuf);
        }
    }
}

extract(header, destPath);
fs.closeSync(fd);
console.log('Done extracting!');
