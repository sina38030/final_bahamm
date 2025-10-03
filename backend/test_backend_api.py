#!/usr/bin/env python3

import requests
import json

def test_backend_api():
    try:
        # Test the backend admin API
        response = requests.get('http://127.0.0.1:8001/api/admin/group-buys/121')
        print('Backend API Status:', response.status_code)
        
        if response.ok:
            data = response.json()
            print('Group ID:', data.get('id'))
            print('Leader ID:', data.get('leader_id'))
            print('Status:', data.get('status'))
            print('Participants:', len(data.get('participants', [])))
            
            for i, p in enumerate(data.get('participants', [])):
                user_id = p.get('user_id')
                paid_at = p.get('paid_at')
                status = p.get('status')
                print(f'  Participant {i}: user_id={user_id}, paid_at={paid_at}, status={status}')
        else:
            print('Error:', response.text)
            
    except Exception as e:
        print('Connection error:', e)

if __name__ == '__main__':
    test_backend_api()
