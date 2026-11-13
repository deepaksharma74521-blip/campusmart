import json
import uuid
import re
from datetime import datetime

# Helper to normalize item names for matching
def norm_name(name):
    n = re.sub(r'[^a-zA-Z0-9]', '', name.lower())
    # replace common words
    for w in ['special', 'spl', 'veg', 'veggie', 'plain', 'fresh', 'plate', 'pcs', 'pc']:
        n = n.replace(w, '')
    return n

print("Helper ready")
