import json
import struct
import os

with open('app.asar', 'rb') as f:
    size_buf = f.read(8)
    header_size = struct.unpack('<I', size_buf[4:8])[0]
    header_json_raw = f.read(header_size)
    header_json = header_json_raw.decode('utf-8').strip('\x00')
    base_offset = 8 + header_size

header = json.loads(header_json)

def extract(dir_node, current_path):
    os.makedirs(current_path, exist_ok=True)
    if 'files' not in dir_node: return
    for name, node in dir_node['files'].items():
        full_path = os.path.join(current_path, name)
        if 'files' in node:
            extract(node, full_path)
        elif node.get('unpacked'):
            print(f"Skipping unpacked: {full_path}")
        else:
            size = int(node['size'])
            offset = int(node['offset'])
            with open('app.asar', 'rb') as f:
                f.seek(base_offset + offset)
                data = f.read(size)
            with open(full_path, 'wb') as out:
                out.write(data)

extract(header, 'app_unpacked')
print("Done!")
