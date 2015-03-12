from pymongo import MongoClient
from pymongo.errors import ConnectionFailure
import sys

db_name = 'scholars_widgets'
collection_name = 'people'

# These are the scholars fields with relevant text to gather
text_fields = [
        'scholars_id',
        'artisticWorks.attributes.abstract',
        'artisticWorks.label',
        'awards.label',
        'courses.label',
        'geographicalFocus.label',
        'grants.label',
        'professionalActivities.label',
        'publications.attributes.abstract',
        'publications.label',
        'researchAreas.label'
        ]

def concat_text_fields(obj):
    if obj:
        if isinstance(obj, basestring):
            return obj
        elif isinstance(obj, dict):
            return " ".join([concat_text_fields(v) for k,v in obj.iteritems() if v])
        elif isinstance(obj, (list, tuple)):
            return " ".join([concat_text_fields(v) for v in obj if v])
        else:
            return str(obj)
            
# Make a connection to Mongo.
try:
    db_client = MongoClient()
    # db_conn = Connection("emo2.trinity.duke.edu", 27017)
except ConnectionFailure:
    print "couldn't connect: be sure that Mongo is running on localhost:27017"
    sys.exit(1)

db = db_client[db_name]
collection = db[collection_name]

## -------------
# Taking routines from 
# http://www.cs.duke.edu/courses/spring14/compsci290/assignments/lab02.html

import nltk
import string
import os

from sklearn.feature_extraction.text import TfidfVectorizer
from nltk.stem.porter import PorterStemmer
from nltk.tokenize import RegexpTokenizer

text_list = []
scholars_list = []
stemmer = PorterStemmer()
re_tokenizer = RegexpTokenizer(r'\w+')

def stem_tokens(tokens, stemmer):
    stemmed = []
    for item in tokens:
        stemmed.append(stemmer.stem(item))
    return stemmed

def tokenize_and_stem(text):
    # tokens = nltk.word_tokenize(text)
    tokens = re_tokenizer.tokenize(text)
    stems = stem_tokens(tokens, stemmer)
    return stems

print 'starting reading'
# Note: Not sure why this won't work with named parameters...
for doc in collection.find({}, text_fields):
    scholars_id = doc['scholars_id']
    del doc['scholars_id']
    del doc['_id']
    text = concat_text_fields(doc)
    if text:
        text = text.strip()
        if len(text) > 0:
            scholars_list.append(scholars_id)
            text_list.append(text.lower())
            # no_punctuation = lowers.translate(string.punctuation)
            # token_dict[id] = no_punctuation

# this can take some time
print 'done reading - defining vectorizer'
tfidf = TfidfVectorizer(tokenizer=tokenize_and_stem, stop_words='english')
print 'tfidf calc'
tfs = tfidf.fit_transform(text_list)
print 'done'

# Calculate author-author simiarity
aa = tfs * tfs.transpose()
(r,c) = aa.nonzero()
v = aa.data

similarity_threshold = 0.0001
for ii in range(len(v)):
    if v[ii] > similarity_threshold:
        pass
        # Write out CSV
        # write r[ii], c[ii], v[ii]

        # Write out scholars ids
        # write scholars_ids[ii]


