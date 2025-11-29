#!/usr/bin/env python3
"""
Script to add staging CORS origins to backend main.py
This ensures the backend accepts requests from staging frontend
"""

import sys
import re
from pathlib import Path

def update_cors_origins(main_py_path):
    """Add staging CORS origins to the main.py file"""
    
    print(f"Reading {main_py_path}...")
    
    with open(main_py_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Staging origins to add
    staging_origins = [
        '        "http://localhost:3001",  # Staging frontend local',
        '        "http://127.0.0.1:3001",',
        '        "https://staging.bahamm.ir",  # Staging frontend',
        '        "http://staging.bahamm.ir",',
        '        "https://staging-api.bahamm.ir",  # Staging backend',
        '        "http://staging-api.bahamm.ir",',
    ]
    
    # Find the first allow_origins list
    pattern = r'(allow_origins=\[)([\s\S]*?)(\])'
    matches = list(re.finditer(pattern, content))
    
    if not matches:
        print("Error: Could not find allow_origins in main.py")
        return False
    
    # Get the first match
    match = matches[0]
    current_origins = match.group(2)
    
    # Check if staging origins already exist
    if 'staging.bahamm.ir' in current_origins:
        print("✓ Staging origins already present in CORS configuration")
        return True
    
    # Add staging origins after localhost entries
    localhost_pattern = r'("http://127\.0\.0\.1:3000",)'
    
    if re.search(localhost_pattern, current_origins):
        new_origins = re.sub(
            localhost_pattern,
            r'\1\n' + '\n'.join(staging_origins),
            current_origins
        )
    else:
        # If localhost pattern not found, just prepend
        new_origins = '\n'.join(staging_origins) + '\n' + current_origins
    
    # Replace in content
    new_content = content[:match.start(2)] + new_origins + content[match.end(2):]
    
    # Create backup
    backup_path = main_py_path.with_suffix('.py.backup')
    print(f"Creating backup at {backup_path}...")
    with open(backup_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    # Write updated content
    print(f"Updating {main_py_path}...")
    with open(main_py_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    
    print("✓ CORS origins updated successfully!")
    print("\nAdded origins:")
    for origin in staging_origins:
        print(f"  {origin.strip()}")
    
    return True

def main():
    # Find backend main.py
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    main_py_path = project_root / 'backend' / 'main.py'
    
    if not main_py_path.exists():
        print(f"Error: Could not find {main_py_path}")
        print("Please run this script from the deploy directory")
        sys.exit(1)
    
    if update_cors_origins(main_py_path):
        print("\n" + "="*50)
        print("CORS configuration updated!")
        print("="*50)
        print("\nNext steps:")
        print("1. Review the changes in backend/main.py")
        print("2. Commit the changes if you're happy with them")
        print("3. Deploy to server")
        print("\nBackup saved at: backend/main.py.backup")
    else:
        print("\nFailed to update CORS configuration")
        sys.exit(1)

if __name__ == '__main__':
    main()


