# CGCC Knowledge Graph — Neo4j with pre-loaded data
# 2,867 nodes + 53,864 edges (Coral Gables business intelligence)
#
# Usage:
#   docker pull ghcr.io/counderscore/cgcc-neo4j:latest
#   docker run -d --name cgcc-neo4j \
#     -p 7474:7474 -p 7687:7687 \
#     ghcr.io/counderscore/cgcc-neo4j:latest
#
# Neo4j Browser:  http://localhost:7474
# Bolt endpoint:  bolt://localhost:7687
# Credentials:    neo4j / cgcc2024graph

FROM neo4j:5-community

ENV NEO4J_AUTH=neo4j/cgcc2024graph
ENV NEO4J_PLUGINS='["graph-data-science"]'
ENV NEO4J_server_memory_heap_initial__size=512m
ENV NEO4J_server_memory_heap_max__size=1G
ENV NEO4J_server_memory_pagecache_size=512m

# Copy pre-loaded database files (databases + transactions)
COPY neo4j-dump/data/databases/neo4j    /data/databases/neo4j
COPY neo4j-dump/data/databases/system   /data/databases/system
COPY neo4j-dump/data/transactions/neo4j /data/transactions/neo4j
COPY neo4j-dump/data/transactions/system /data/transactions/system
COPY neo4j-dump/data/dbms               /data/dbms

# Fix permissions (neo4j runs as uid 7474)
RUN chown -R 7474:7474 /data
