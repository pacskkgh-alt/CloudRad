import os

old_ip1 = "165.227.89.199"
new_ip1 = "165.227.89.199"

old_ip2 = "165-227-89-199"
new_ip2 = "165-227-89-199"

folder = r"d:\noor tela\CloudRad"

updated_count = 0

for root, dirs, files in os.walk(folder):
    if ".git" in root or "node_modules" in root or "__pycache__" in root:
        continue
    for file in files:
        if file.endswith((".js", ".jsx", ".py", ".yml", ".yaml", ".conf", ".sh", ".ps1", ".md")):
            file_path = os.path.join(root, file)
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    content = f.read()
                
                if old_ip1 in content or old_ip2 in content:
                    content = content.replace(old_ip1, new_ip1)
                    content = content.replace(old_ip2, new_ip2)
                    
                    with open(file_path, "w", encoding="utf-8", newline='') as f:
                        f.write(content)
                    print(f"Updated: {file_path}")
                    updated_count += 1
            except Exception as e:
                pass

print(f"Done! Updated {updated_count} files.")
