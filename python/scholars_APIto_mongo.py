from pymongo import MongoClient
from dict_date import convert_embedded_dates_remove_citations
import requests
import json
import time

ids_file = '../data/scholarsIDs_20150205.csv'
base_url = 'https://scholars.duke.edu/widgets/api/v0.9/people/complete/all.json?uri=https://scholars.duke.edu/individual/'
db_name = 'scholars_widgets'
collection_name = 'people'

overwrite_records = False
recreate_collection = False

def record_to_mongo(record):
    """Dumps record to MongoDB 
    with date strings converted to python datetime object first
    """
    # 
    # # First check if the item info is already in our own database
    # item_obj = db.items.find_one({'uniqueid':id_str},{'call-number':True,'oclcnumber':True,'lcc':True})
    # 
    # # Store item object in database for future use
    # db.items.save(item_obj)
    # 
    # # Store in db for future use
    # db.items.update({'uniqueid':id_str},{'$set':{'lcc':lcc}})
    # 
    # # Not creating own unique _id field, so check for date + hour & page match before saving
    # pv_obj = db.pageviews.find_one({'uniqueid':id_str,'timestamp':timestamp},{'_id':True})
    # if pv_obj is None:
    # db.pageviews.save(page_view, safe=True)
    # 

    # First check if the item info is already in our own database
    exists = collection.find_one({'scholars_id':record['scholars_id']},{'scholars_id':True})

    if overwrite_records or (not exists):
        collection.save(record)



# Make a connection to Mongo.
try:
        db_client = MongoClient()
        # db_conn = Connection("emo2.trinity.duke.edu", 27017)
except ConnectionFailure:
        print "couldn't connect: be sure that Mongo is running on localhost:27017"
        sys.exit(1)

db = db_client[db_name]

# DANGER
if recreate_collection:
    db.drop_collection(collection_name)
    
collection = db[collection_name]

with open(ids_file, 'r') as scholars_ids_file:
    for scholar_idx, line in enumerate(scholars_ids_file):
        
        scholars_id = line.strip()
        
        # DEBUG
#         if scholar_idx == 10:
#             break
            
        print scholar_idx, scholars_id
        
        # First check if the item info is already in our own database
        exists = collection.find_one({'scholars_id':scholars_id},{'scholars_id':True})

        if overwrite_records or (not exists):

            try:
                r = requests.get(base_url + scholars_id, timeout=5)
            except requests.exceptions.Timeout:
                print 'TIMEOUT PROBLEM -- skipping!!', scholars_id
                doc = {}
                doc['scholars_id'] = scholars_id
                doc['problem'] = 'request_timeout'
                collection.save(doc)
                continue
            except:
                print 'PROBLEM -- skipping!!', scholars_id
                doc = {}
                doc['scholars_id'] = scholars_id
                doc['problem'] = 'request'
                collection.save(doc)
                continue
                
            if r.status_code == 200:
                c_orig = json.loads(r.content)
                c_orig['scholars_id'] = scholars_id
                c_dated = convert_embedded_dates_remove_citations(c_orig)
            
                collection.save(c_dated)
            
                # Be nice to the API
                time.sleep(0.1)
            else:
                doc = {}
                doc['scholars_id'] = scholars_id
                doc['problem'] = 'http_response_' + str(r.status_code)
                collection.save(doc)
                print 'HTTP reponse probem!! Status code =', r.status_code
