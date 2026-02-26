#!/bin/bash

# Wait for Elasticsearch to start
echo "Waiting for Elasticsearch..."
# In a real script, loop curl until 200 OK

# Define the index mapping template
curl -X PUT "http://localhost:9200/_index_template/trading_template" -H 'Content-Type: application/json' -d'
{
  "index_patterns": ["trading_symbols*"],
  "template": {
    "settings": {
      "number_of_shards": 1,
      "number_of_replicas": 1,
      "analysis": {
        "analyzer": {
          "symbol_analyzer": {
            "type": "custom",
            "tokenizer": "standard",
            "filter": ["lowercase", "edge_ngram_filter"]
          }
        },
        "filter": {
          "edge_ngram_filter": {
            "type": "edge_ngram",
            "min_gram": 2,
            "max_gram": 10
          }
        }
      }
    },
    "mappings": {
      "properties": {
        "symbol": {
          "type": "text",
          "analyzer": "symbol_analyzer",
          "fields": {
            "keyword": {
              "type": "keyword",
              "ignore_above": 256
            }
          }
        },
        "name": {
          "type": "text",
          "analyzer": "standard"
        },
        "brand_name": {
          "type": "text",
          "analyzer": "standard"
        },
        "expiry": {
          "type": "date"
        },
        "segment": {
          "type": "keyword"
        },
        "strike": {
          "type": "float"
        },
        "token": {
          "type": "integer"
        }
      }
    }
  }
}
'

echo "Index template created."
