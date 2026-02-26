# Pro Trading Terminal Backend Architecture

This directory contains the high-performance backend infrastructure modeled after professional trading systems (like Kite).

## 1. Quick Start

1.  **System Requirements (Linux/Host)**:
    Ensure `vm.max_map_count` is set to at least `262144` for Elasticsearch.
    ```bash
    sudo sysctl -w vm.max_map_count=262144
    ```

2.  **Add Data**:
    Place your NSE/BSE master CSV files in the `data/master_files/` directory.
    Expected columns: `token,symbol,name,expiry,strike,segment`

3.  **Start the Stack**:
    ```bash
    docker-compose up -d
    ```

4.  **Setup Index & Mapping**:
    Once Elasticsearch is running (check `localhost:9200`), run the setup script to apply the optimized mapping:
    ```bash
    chmod +x setup-elastic.sh
    ./setup-elastic.sh
    ```

## 2. Architecture Overview

-   **Elasticsearch (3-Node Cluster)**: Configured with `bootstrap.memory_lock=true` to prevent swapping.
-   **Logstash**: Ingests CSVs, normalizes symbols (`RELIANCE`), and enriches data with brand names (e.g., mapping `RELIANCE` -> `Jio`).
-   **Kibana**: Available at `http://localhost:5601` for visualization.

## 3. The "Kite" Query Pattern

To achieve low-latency "search-as-you-type", use this specific query structure in your API (Node.js/Go/Python):

```json
{
  "query": {
    "dis_max": {
      "queries": [
        { 
          "term": { 
            "symbol.keyword": { "value": "RELIANCE", "boost": 100 } 
          } 
        },
        { 
          "match_phrase_prefix": { 
            "symbol": "RELIANCE" 
          } 
        }
      ]
    }
  },
  "sort": [
    { "_score": "desc" },
    { "segment": { "order": "asc" } }, // EQ before NFO
    { "expiry": { "order": "asc" } }    // Near-month first
  ]
}
```

### Why this works:
1.  **Disjunction Max (`dis_max`)**: Returns the best match from sub-queries.
2.  **Term Boost (`symbol.keyword`)**: An exact match on the symbol is prioritized 100x over a partial match.
3.  **Prefix Match**: Handles partial typing ("REL...", "RELI...").
4.  **Sorting**: Ensures the Equity (EQ) segment appears before Futures/Options (NFO), and nearer expiries appear first.
