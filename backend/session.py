sessions = {}

def get_session(user_id):
    if user_id not in sessions:
        sessions[user_id] = {
            "last_results": [],
            "offset": 0
        }
    return sessions[user_id]