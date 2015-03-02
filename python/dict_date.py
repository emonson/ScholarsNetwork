# all values are strings or lists of dictionaries
# want to travel down and convert any values with keys ending in date or year
# into real datetime objects

from dateutil import parser
import re

re_yr = re.compile('^[0-9]{4}$')

def convert_embedded_dates(obj, convert=False):

    if convert and isinstance(obj, basestring):
        # Just years by themselves are parsing out as Feb 1 of that year, so forcing Jan 1
        if re_yr.match(obj):
            return parser.parse(obj + '-01-01T00:00:00')
        else:
            return parser.parse(obj)
            
    elif isinstance(obj, dict):
        return dict((k, convert_embedded_dates(v, (k.lower().endswith('date') or k.lower().endswith('year')))) for k, v in obj.items())
        
    elif isinstance(obj, (list, tuple)):
        return map(convert_embedded_dates, obj)
        
    return obj


# --------------------
if __name__ == "__main__":
	
    import requests
    import json
    
    r = requests.get('https://scholars.duke.edu/widgets/api/v0.9/people/complete/all.json?uri=https://scholars.duke.edu/individual/per0040282')
    c = json.loads(r.content)
    c_new = convert_embedded_dates(c)

    print c_new
