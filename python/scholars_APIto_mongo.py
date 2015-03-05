from pymongo import Connection
from dict_date import convert_embedded_dates

# Make a connection to Mongo.
try:
		db_conn = Connection()
		# db_conn = Connection("emo2.trinity.duke.edu", 27017)
except ConnectionFailure:
		print "couldn't connect: be sure that Mongo is running on localhost:27017"
		sys.exit(1)

db = db_conn['scholars_widgets']

def record_to_mongo(result):
	"""Dumps record to MongoDB 
	with date strings converted to python datetime object first
	"""

	if results.get('rows', []):		
		names = return_column_headers(results)
		
		# get ID from pagePath
		pgIdx = names.index('pagePath')
		total_count = len(results.get('rows'))

		for ii,row in enumerate(results.get('rows')):
			page_view = {}
			date_hour_str = date_str + row[names.index('hour')]
			timestamp = datetime.strptime(date_hour_str, '%Y-%m-%d%H')
			for jj in range(len(row)):
				if names[jj] == 'latitude' or names[jj] == 'longitude':
					if 'loc' not in page_view:
						# spherical geospatial search and GeoJSON assume [longitude,latitude] ordering
						# and two-element list is MongoDB's recommended format for 2d locations
						page_view['loc'] = [float(row[names.index('longitude')]), float(row[names.index('latitude')])]
				elif names[jj] == 'hour':
					page_view['timestamp'] = timestamp
				elif names[jj] == 'visitors':
					page_view[names[jj]] = int(row[jj])
				else:
					page_view[names[jj]] = row[jj]
			
			page_path = row[pgIdx]
			lcc = 'unknown'
			
			parsed_query = UP.parse_qs(UP.urlparse(page_path).query)
			
			# NOTE: Exclude any pages that were requested as xml format !!!
			if ('output-format' in parsed_query) and (parsed_query['output-format'] == 'xml'):
				continue
			if ('id' not in parsed_query):
				continue
			
			id_str = parsed_query['id'][0]
			page_view['uniqueid'] = id_str
			
			
			# First check if the item info is already in our own database
			item_obj = db.items.find_one({'uniqueid':id_str},{'call-number':True,'oclcnumber':True,'lcc':True})
			
			# If not in database, need to grab info from library item view xml
			if item_obj is None:
				item_obj = item_view_xml.get_xml_object(id_str)
				# Once in a while get back an empty object from library page
				if len(item_obj) == 0:
					# NOTE: Not counting page view event if can't find page item XML !!!
					continue
				else:
					# Store item object in database for future use
					db.items.save(item_obj)
			
			if 'lcc' in item_obj:
				# lcc gets added on later (not in originally returned xml)
				lcc = item_obj['lcc']
			else:
				if 'call-number' in item_obj:
					call_number = item_obj['call-number']
				
					# Multiple call-numbers separated by '|'
					first_call_number = call_number.split('|')[0]
					lcc = first_call_number.split(' ')[0]
				
					# If call number doesn't fit the right pattern
					#		then search the OCLC Classify service and pull the LCC category from there
					lcc_match = lcc_re.match(lcc)
					if lcc_match is None:
						if 'oclcnumber' in item_obj:
							oclc_str = item_obj['oclcnumber']
							lcc = oclc_classify_xml.get_lcc_class(oclc_str)
					
							# Test one more time and blank out if not right
							if lcc is None:
								lcc = 'unknown'
							else:
								lcc_match = lcc_re.match(lcc)
								if lcc_match is None:
									lcc = 'unknown'
						else:
							lcc = 'unknown'
				
				# no call number, either
				else:
					lcc = 'unknown'
			
				# Store in db for future use
				db.items.update({'uniqueid':id_str},{'$set':{'lcc':lcc}})
			
			print date_str, ' : ', ii, '/', total_count, lcc
			page_view['lcc'] = lcc
			lcc_match = lcc_re.match(lcc)
			if lcc_match is not None:
				page_view['lcc_category'] = lcc_match.group(1)
				page_view['lcc_first_letter'] = lcc_match.group(1)[:1]
			
			# Not creating own unique _id field, so check for date + hour & page match before saving
			pv_obj = db.pageviews.find_one({'uniqueid':id_str,'timestamp':timestamp},{'_id':True})
			if pv_obj is None:
				db.pageviews.save(page_view, safe=True)
	else:
		print 'No Rows Found'


