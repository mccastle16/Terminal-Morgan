2025-12-23T02:44:24.099514567Z [inf]  scheduling build on Metal builder "builder-fsjlwt"
2025-12-23T02:44:26.922623786Z [inf]  [snapshot] received sha256:2907466dd26a4f5b1d95ae915e6d5487fd70ea91ec3eb5c08541189a44c07b30 md5:44a5801839811127e4a4ba32f118db4a
2025-12-23T02:44:26.922721983Z [inf]  receiving snapshot
2025-12-23T02:44:26.932573604Z [dbg]  root directory set as 'systems/agents'
2025-12-23T02:44:26.932576708Z [dbg]  found 'railway.toml' at 'systems/agents/railway.toml'
2025-12-23T02:44:26.932579332Z [inf]  root directory sanitized to 'systems/agents'
2025-12-23T02:44:26.932653504Z [inf]  analyzing snapshot
2025-12-23T02:44:26.954052981Z [inf]  uploading snapshot
2025-12-23T02:44:28.677212266Z [inf]  scheduling build on Metal builder "builder-fsjlwt"
2025-12-23T02:44:31.257085981Z [inf]  fetched snapshot sha256:2907466dd26a4f5b1d95ae915e6d5487fd70ea91ec3eb5c08541189a44c07b30 (200 kB bytes)
2025-12-23T02:44:31.257245911Z [inf]  fetching snapshot
2025-12-23T02:44:31.505918681Z [inf]  unpacking archive
2025-12-23T02:44:31.726766756Z [inf]  using build driver nixpacks-v1.41.0
2025-12-23T02:44:31.951334306Z [inf]  
2025-12-23T02:44:31.951357872Z [inf]  ╔══════════════════════════════ Nixpacks v1.41.0 ══════════════════════════════╗
2025-12-23T02:44:31.951361127Z [inf]  ║ setup      │ python311, postgresql_16.dev, gcc                               ║
2025-12-23T02:44:31.951364872Z [inf]  ║──────────────────────────────────────────────────────────────────────────────║
2025-12-23T02:44:31.951365443Z [inf]  ║ install    │ python -m venv --copies /opt/venv && . /opt/venv/bin/activate   ║
2025-12-23T02:44:31.951365904Z [inf]  ║            │ && pip install -r requirements.txt                              ║
2025-12-23T02:44:31.951366485Z [inf]  ║──────────────────────────────────────────────────────────────────────────────║
2025-12-23T02:44:31.951367026Z [inf]  ║ build      │ pip install -r requirements.txt                                 ║
2025-12-23T02:44:31.951367506Z [inf]  ║──────────────────────────────────────────────────────────────────────────────║
2025-12-23T02:44:31.951368067Z [inf]  ║ start      │ python weekly_refresh.py                                        ║
2025-12-23T02:44:31.951368538Z [inf]  ╚══════════════════════════════════════════════════════════════════════════════╝
2025-12-23T02:44:31.951369009Z [inf]  
2025-12-23T02:44:31.952303201Z [inf]  
2025-12-23T02:44:31.952314668Z [inf]  Saved output to:
2025-12-23T02:44:31.952316211Z [inf]    snapshot-target-unpack/systems/agents
2025-12-23T02:44:32.140813227Z [inf]  [internal] load build definition from Dockerfile
2025-12-23T02:44:32.140834108Z [inf]  [internal] load build definition from Dockerfile
2025-12-23T02:44:32.141060448Z [inf]  [internal] load build definition from Dockerfile
2025-12-23T02:44:32.317199941Z [inf]  [internal] load build definition from Dockerfile
2025-12-23T02:44:32.367020929Z [inf]  [internal] load metadata for ghcr.io/railwayapp/nixpacks:ubuntu-1745885067
2025-12-23T02:44:32.753241253Z [inf]  [internal] load metadata for ghcr.io/railwayapp/nixpacks:ubuntu-1745885067
2025-12-23T02:44:32.753837007Z [inf]  [internal] load .dockerignore
2025-12-23T02:44:32.753846472Z [inf]  [internal] load .dockerignore
2025-12-23T02:44:32.754046692Z [inf]  [internal] load .dockerignore
2025-12-23T02:44:32.947331316Z [inf]  [internal] load .dockerignore
2025-12-23T02:44:33.017360863Z [wrn]  SecretsUsedInArgOrEnv: Do not use ARG or ENV instructions for sensitive data (ARG "ANTHROPIC_API_KEY") (line 11)(https://docs.docker.com/go/dockerfile/rule/secrets-used-in-arg-or-env/)
 details: Sensitive data should not be used in the ARG or ENV commands

2025-12-23T02:44:33.017381755Z [wrn]  SecretsUsedInArgOrEnv: Do not use ARG or ENV instructions for sensitive data (ARG "GOOGLE_PLACES_API_KEY") (line 11)(https://docs.docker.com/go/dockerfile/rule/secrets-used-in-arg-or-env/)
 details: Sensitive data should not be used in the ARG or ENV commands

2025-12-23T02:44:33.017382806Z [wrn]  SecretsUsedInArgOrEnv: Do not use ARG or ENV instructions for sensitive data (ARG "YELP_API_KEY") (line 11)(https://docs.docker.com/go/dockerfile/rule/secrets-used-in-arg-or-env/)
 details: Sensitive data should not be used in the ARG or ENV commands

2025-12-23T02:44:33.017435205Z [wrn]  SecretsUsedInArgOrEnv: Do not use ARG or ENV instructions for sensitive data (ENV "ANTHROPIC_API_KEY") (line 12)(https://docs.docker.com/go/dockerfile/rule/secrets-used-in-arg-or-env/)
 details: Sensitive data should not be used in the ARG or ENV commands

2025-12-23T02:44:33.017435736Z [wrn]  SecretsUsedInArgOrEnv: Do not use ARG or ENV instructions for sensitive data (ENV "GOOGLE_PLACES_API_KEY") (line 12)(https://docs.docker.com/go/dockerfile/rule/secrets-used-in-arg-or-env/)
 details: Sensitive data should not be used in the ARG or ENV commands

2025-12-23T02:44:33.017546132Z [wrn]  SecretsUsedInArgOrEnv: Do not use ARG or ENV instructions for sensitive data (ENV "YELP_API_KEY") (line 12)(https://docs.docker.com/go/dockerfile/rule/secrets-used-in-arg-or-env/)
 details: Sensitive data should not be used in the ARG or ENV commands

2025-12-23T02:44:33.017550127Z [wrn]  UndefinedVar: Usage of undefined variable '$NIXPACKS_PATH' (line 18)(https://docs.docker.com/go/dockerfile/rule/undefined-var/)
 details: Variables should be defined before their use

2025-12-23T02:44:33.021472436Z [inf]  [stage-0 10/10] COPY . /app
2025-12-23T02:44:33.021477033Z [inf]  [stage-0  9/10] RUN printf '\nPATH=/opt/venv/bin:$PATH' >> /root/.profile
2025-12-23T02:44:33.021477924Z [inf]  [stage-0  8/10] RUN  pip install -r requirements.txt
2025-12-23T02:44:33.021478375Z [inf]  [stage-0  7/10] COPY . /app/.
2025-12-23T02:44:33.021479286Z [inf]  [stage-0  6/10] RUN --mount=type=cache,id=s/c14db582-4bcc-4e74-9bbe-c08a3a713830-/root/cache/pip,target=/root/.cache/pip python -m venv --copies /opt/venv && . /opt/venv/bin/activate && pip install -r requirements.txt
2025-12-23T02:44:33.021479667Z [inf]  [stage-0  5/10] COPY . /app/.
2025-12-23T02:44:33.021480018Z [inf]  [stage-0  4/10] RUN nix-env -if .nixpacks/nixpkgs-bc8f8d1be58e8c8383e683a06e1e1e57893fff87.nix && nix-collect-garbage -d
2025-12-23T02:44:33.021480338Z [inf]  [stage-0  3/10] COPY .nixpacks/nixpkgs-bc8f8d1be58e8c8383e683a06e1e1e57893fff87.nix .nixpacks/nixpkgs-bc8f8d1be58e8c8383e683a06e1e1e57893fff87.nix
2025-12-23T02:44:33.021480648Z [inf]  [internal] load build context
2025-12-23T02:44:33.021481009Z [inf]  [stage-0  2/10] WORKDIR /app/
2025-12-23T02:44:33.021481329Z [inf]  [stage-0  1/10] FROM ghcr.io/railwayapp/nixpacks:ubuntu-1745885067@sha256:d45c89d80e13d7ad0fd555b5130f22a866d9dd10e861f589932303ef2314c7de
2025-12-23T02:44:33.021569021Z [inf]  [stage-0  1/10] FROM ghcr.io/railwayapp/nixpacks:ubuntu-1745885067@sha256:d45c89d80e13d7ad0fd555b5130f22a866d9dd10e861f589932303ef2314c7de
2025-12-23T02:44:33.021669212Z [inf]  [internal] load build context
2025-12-23T02:44:33.022108802Z [inf]  [internal] load build context
2025-12-23T02:44:33.046277677Z [inf]  [stage-0  1/10] FROM ghcr.io/railwayapp/nixpacks:ubuntu-1745885067@sha256:d45c89d80e13d7ad0fd555b5130f22a866d9dd10e861f589932303ef2314c7de
2025-12-23T02:44:33.269922111Z [inf]  [internal] load build context
2025-12-23T02:44:33.326681175Z [inf]  [stage-0  2/10] WORKDIR /app/
2025-12-23T02:44:33.326683088Z [inf]  [stage-0  3/10] COPY .nixpacks/nixpkgs-bc8f8d1be58e8c8383e683a06e1e1e57893fff87.nix .nixpacks/nixpkgs-bc8f8d1be58e8c8383e683a06e1e1e57893fff87.nix
2025-12-23T02:44:33.326686022Z [inf]  [stage-0  4/10] RUN nix-env -if .nixpacks/nixpkgs-bc8f8d1be58e8c8383e683a06e1e1e57893fff87.nix && nix-collect-garbage -d
2025-12-23T02:44:33.326690018Z [inf]  [stage-0  5/10] COPY . /app/.
2025-12-23T02:44:33.713892056Z [inf]  [stage-0  5/10] COPY . /app/.
2025-12-23T02:44:33.753873571Z [inf]  [stage-0  6/10] RUN --mount=type=cache,id=s/c14db582-4bcc-4e74-9bbe-c08a3a713830-/root/cache/pip,target=/root/.cache/pip python -m venv --copies /opt/venv && . /opt/venv/bin/activate && pip install -r requirements.txt
2025-12-23T02:44:38.165764643Z [inf]  Collecting fastapi>=0.104.0 (from -r requirements.txt (line 4))

2025-12-23T02:44:38.182723474Z [inf]    Downloading fastapi-0.127.0-py3-none-any.whl.metadata (30 kB)

2025-12-23T02:44:38.215748876Z [inf]  Collecting uvicorn>=0.24.0 (from -r requirements.txt (line 5))

2025-12-23T02:44:38.218472635Z [inf]    Downloading uvicorn-0.40.0-py3-none-any.whl.metadata (6.7 kB)

2025-12-23T02:44:38.695748033Z [inf]  Collecting aiohttp>=3.9.0 (from -r requirements.txt (line 8))

2025-12-23T02:44:38.699120727Z [inf]    Downloading aiohttp-3.13.2-cp311-cp311-manylinux2014_x86_64.manylinux_2_17_x86_64.manylinux_2_28_x86_64.whl.metadata (8.1 kB)

2025-12-23T02:44:38.724665427Z [inf]  Collecting httpx>=0.25.0 (from -r requirements.txt (line 9))

2025-12-23T02:44:38.7274512Z [inf]    Downloading httpx-0.28.1-py3-none-any.whl.metadata (7.1 kB)

2025-12-23T02:44:38.768517033Z [inf]  Collecting asyncpg>=0.29.0 (from -r requirements.txt (line 12))

2025-12-23T02:44:38.773083509Z [inf]    Downloading asyncpg-0.31.0-cp311-cp311-manylinux2014_x86_64.manylinux_2_17_x86_64.manylinux_2_28_x86_64.whl.metadata (4.4 kB)

2025-12-23T02:44:39.068610272Z [inf]  Collecting sqlalchemy>=2.0.0 (from -r requirements.txt (line 13))

2025-12-23T02:44:39.072106851Z [inf]    Downloading sqlalchemy-2.0.45-cp311-cp311-manylinux2014_x86_64.manylinux_2_17_x86_64.manylinux_2_28_x86_64.whl.metadata (9.5 kB)

2025-12-23T02:44:39.132434013Z [inf]  Collecting psycopg2-binary>=2.9.9 (from -r requirements.txt (line 14))

2025-12-23T02:44:39.135537412Z [inf]    Downloading psycopg2_binary-2.9.11-cp311-cp311-manylinux2014_x86_64.manylinux_2_17_x86_64.whl.metadata (4.9 kB)

2025-12-23T02:44:39.253841665Z [inf]  Collecting pydantic>=2.5.0 (from -r requirements.txt (line 17))

2025-12-23T02:44:39.256607187Z [inf]    Downloading pydantic-2.12.5-py3-none-any.whl.metadata (90 kB)

2025-12-23T02:44:39.259325118Z [inf]       ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 90.6/90.6 kB 307.1 MB/s eta 0:00:00
2025-12-23T02:44:39.259492049Z [inf]  
2025-12-23T02:44:39.279789482Z [inf]  Collecting python-dotenv>=1.0.0 (from -r requirements.txt (line 20))

2025-12-23T02:44:39.28281922Z [inf]    Downloading python_dotenv-1.2.1-py3-none-any.whl.metadata (25 kB)

2025-12-23T02:44:39.302308029Z [inf]  Collecting beautifulsoup4>=4.12.0 (from -r requirements.txt (line 23))

2025-12-23T02:44:39.30524591Z [inf]    Downloading beautifulsoup4-4.14.3-py3-none-any.whl.metadata (3.8 kB)

2025-12-23T02:44:39.53805303Z [inf]  Collecting lxml>=5.0.0 (from -r requirements.txt (line 24))

2025-12-23T02:44:39.541005743Z [inf]    Downloading lxml-6.0.2-cp311-cp311-manylinux_2_26_x86_64.manylinux_2_28_x86_64.whl.metadata (3.6 kB)

2025-12-23T02:44:39.585356338Z [inf]  Collecting anthropic>=0.7.0 (from -r requirements.txt (line 27))

2025-12-23T02:44:39.588197444Z [inf]    Downloading anthropic-0.75.0-py3-none-any.whl.metadata (28 kB)

2025-12-23T02:44:39.642761022Z [inf]  Collecting starlette<0.51.0,>=0.40.0 (from fastapi>=0.104.0->-r requirements.txt (line 4))

2025-12-23T02:44:39.645449207Z [inf]    Downloading starlette-0.50.0-py3-none-any.whl.metadata (6.3 kB)

2025-12-23T02:44:39.675694736Z [inf]  Collecting typing-extensions>=4.8.0 (from fastapi>=0.104.0->-r requirements.txt (line 4))

2025-12-23T02:44:39.678483683Z [inf]    Downloading typing_extensions-4.15.0-py3-none-any.whl.metadata (3.3 kB)

2025-12-23T02:44:39.690895958Z [inf]  Collecting annotated-doc>=0.0.2 (from fastapi>=0.104.0->-r requirements.txt (line 4))

2025-12-23T02:44:39.693739617Z [inf]    Downloading annotated_doc-0.0.4-py3-none-any.whl.metadata (6.6 kB)

2025-12-23T02:44:39.720821095Z [inf]  Collecting click>=7.0 (from uvicorn>=0.24.0->-r requirements.txt (line 5))

2025-12-23T02:44:39.723331194Z [inf]    Downloading click-8.3.1-py3-none-any.whl.metadata (2.6 kB)

2025-12-23T02:44:39.737487838Z [inf]  Collecting h11>=0.8 (from uvicorn>=0.24.0->-r requirements.txt (line 5))

2025-12-23T02:44:39.740177786Z [inf]    Downloading h11-0.16.0-py3-none-any.whl.metadata (8.3 kB)

2025-12-23T02:44:39.768473377Z [inf]  Collecting aiohappyeyeballs>=2.5.0 (from aiohttp>=3.9.0->-r requirements.txt (line 8))

2025-12-23T02:44:39.77123329Z [inf]    Downloading aiohappyeyeballs-2.6.1-py3-none-any.whl.metadata (5.9 kB)

2025-12-23T02:44:39.783593527Z [inf]  Collecting aiosignal>=1.4.0 (from aiohttp>=3.9.0->-r requirements.txt (line 8))

2025-12-23T02:44:39.786082043Z [inf]    Downloading aiosignal-1.4.0-py3-none-any.whl.metadata (3.7 kB)

2025-12-23T02:44:39.803753174Z [inf]  Collecting attrs>=17.3.0 (from aiohttp>=3.9.0->-r requirements.txt (line 8))

2025-12-23T02:44:39.806456152Z [inf]    Downloading attrs-25.4.0-py3-none-any.whl.metadata (10 kB)

2025-12-23T02:44:39.86952564Z [inf]  Collecting frozenlist>=1.1.1 (from aiohttp>=3.9.0->-r requirements.txt (line 8))

2025-12-23T02:44:39.872365774Z [inf]    Downloading frozenlist-1.8.0-cp311-cp311-manylinux1_x86_64.manylinux_2_28_x86_64.manylinux_2_5_x86_64.whl.metadata (20 kB)

2025-12-23T02:44:40.154760752Z [inf]  Collecting multidict<7.0,>=4.5 (from aiohttp>=3.9.0->-r requirements.txt (line 8))

2025-12-23T02:44:40.158037311Z [inf]    Downloading multidict-6.7.0-cp311-cp311-manylinux2014_x86_64.manylinux_2_17_x86_64.manylinux_2_28_x86_64.whl.metadata (5.3 kB)

2025-12-23T02:44:40.209639533Z [inf]  Collecting propcache>=0.2.0 (from aiohttp>=3.9.0->-r requirements.txt (line 8))

2025-12-23T02:44:40.212543813Z [inf]    Downloading propcache-0.4.1-cp311-cp311-manylinux2014_x86_64.manylinux_2_17_x86_64.manylinux_2_28_x86_64.whl.metadata (13 kB)

2025-12-23T02:44:40.446577935Z [inf]  Collecting yarl<2.0,>=1.17.0 (from aiohttp>=3.9.0->-r requirements.txt (line 8))

2025-12-23T02:44:40.449420002Z [inf]    Downloading yarl-1.22.0-cp311-cp311-manylinux2014_x86_64.manylinux_2_17_x86_64.manylinux_2_28_x86_64.whl.metadata (75 kB)

2025-12-23T02:44:40.451697522Z [inf]       ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 75.1/75.1 kB 378.3 MB/s eta 0:00:00
2025-12-23T02:44:40.451868208Z [inf]  
2025-12-23T02:44:40.484777856Z [inf]  Collecting anyio (from httpx>=0.25.0->-r requirements.txt (line 9))

2025-12-23T02:44:40.487324509Z [inf]    Downloading anyio-4.12.0-py3-none-any.whl.metadata (4.3 kB)

2025-12-23T02:44:40.506806158Z [inf]  Collecting certifi (from httpx>=0.25.0->-r requirements.txt (line 9))

2025-12-23T02:44:40.509209446Z [inf]    Downloading certifi-2025.11.12-py3-none-any.whl.metadata (2.5 kB)

2025-12-23T02:44:40.532796258Z [inf]  Collecting httpcore==1.* (from httpx>=0.25.0->-r requirements.txt (line 9))

2025-12-23T02:44:40.536203002Z [inf]    Downloading httpcore-1.0.9-py3-none-any.whl.metadata (21 kB)

2025-12-23T02:44:40.551836353Z [inf]  Collecting idna (from httpx>=0.25.0->-r requirements.txt (line 9))

2025-12-23T02:44:40.554536557Z [inf]    Downloading idna-3.11-py3-none-any.whl.metadata (8.4 kB)

2025-12-23T02:44:40.784086427Z [inf]  Collecting greenlet>=1 (from sqlalchemy>=2.0.0->-r requirements.txt (line 13))

2025-12-23T02:44:40.788004319Z [inf]    Downloading greenlet-3.3.0-cp311-cp311-manylinux_2_24_x86_64.manylinux_2_28_x86_64.whl.metadata (4.1 kB)

2025-12-23T02:44:40.809629285Z [inf]  Collecting annotated-types>=0.6.0 (from pydantic>=2.5.0->-r requirements.txt (line 17))

2025-12-23T02:44:40.812951863Z [inf]    Downloading annotated_types-0.7.0-py3-none-any.whl.metadata (15 kB)

2025-12-23T02:44:41.522636644Z [inf]  Collecting pydantic-core==2.41.5 (from pydantic>=2.5.0->-r requirements.txt (line 17))

2025-12-23T02:44:41.526289859Z [inf]    Downloading pydantic_core-2.41.5-cp311-cp311-manylinux_2_17_x86_64.manylinux2014_x86_64.whl.metadata (7.3 kB)

2025-12-23T02:44:41.54101764Z [inf]  Collecting typing-inspection>=0.4.2 (from pydantic>=2.5.0->-r requirements.txt (line 17))

2025-12-23T02:44:41.543877694Z [inf]    Downloading typing_inspection-0.4.2-py3-none-any.whl.metadata (2.6 kB)

2025-12-23T02:44:41.571085281Z [inf]  Collecting soupsieve>=1.6.1 (from beautifulsoup4>=4.12.0->-r requirements.txt (line 23))

2025-12-23T02:44:41.573611394Z [inf]    Downloading soupsieve-2.8.1-py3-none-any.whl.metadata (4.6 kB)

2025-12-23T02:44:41.605099868Z [inf]  Collecting distro<2,>=1.7.0 (from anthropic>=0.7.0->-r requirements.txt (line 27))

2025-12-23T02:44:41.608635787Z [inf]    Downloading distro-1.9.0-py3-none-any.whl.metadata (6.8 kB)

2025-12-23T02:44:41.622380092Z [inf]  Collecting docstring-parser<1,>=0.15 (from anthropic>=0.7.0->-r requirements.txt (line 27))

2025-12-23T02:44:41.625459164Z [inf]    Downloading docstring_parser-0.17.0-py3-none-any.whl.metadata (3.5 kB)

2025-12-23T02:44:41.696972599Z [inf]  Collecting jiter<1,>=0.4.0 (from anthropic>=0.7.0->-r requirements.txt (line 27))

2025-12-23T02:44:41.700003901Z [inf]    Downloading jiter-0.12.0-cp311-cp311-manylinux_2_17_x86_64.manylinux2014_x86_64.whl.metadata (5.2 kB)

2025-12-23T02:44:41.729613374Z [inf]  Collecting sniffio (from anthropic>=0.7.0->-r requirements.txt (line 27))

2025-12-23T02:44:41.73242789Z [inf]    Downloading sniffio-1.3.1-py3-none-any.whl.metadata (3.9 kB)

2025-12-23T02:44:41.858184522Z [inf]  Downloading fastapi-0.127.0-py3-none-any.whl (112 kB)

2025-12-23T02:44:41.86020825Z [inf]     ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 112.1/112.1 kB 405.8 MB/s eta 0:00:00

2025-12-23T02:44:41.863171469Z [inf]  Downloading uvicorn-0.40.0-py3-none-any.whl (68 kB)

2025-12-23T02:44:41.86493773Z [inf]     ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 68.5/68.5 kB 380.6 MB/s eta 0:00:00
2025-12-23T02:44:41.865113404Z [inf]  
2025-12-23T02:44:41.867936703Z [inf]  Downloading aiohttp-3.13.2-cp311-cp311-manylinux2014_x86_64.manylinux_2_17_x86_64.manylinux_2_28_x86_64.whl (1.7 MB)

2025-12-23T02:44:41.877095774Z [inf]     ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 1.7/1.7 MB 301.2 MB/s eta 0:00:00
2025-12-23T02:44:41.877263926Z [inf]  
2025-12-23T02:44:41.880564261Z [inf]  Downloading httpx-0.28.1-py3-none-any.whl (73 kB)

2025-12-23T02:44:41.882330002Z [inf]     ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 73.5/73.5 kB 396.5 MB/s eta 0:00:00
2025-12-23T02:44:41.882572637Z [inf]  
2025-12-23T02:44:41.885229385Z [inf]  Downloading httpcore-1.0.9-py3-none-any.whl (78 kB)

2025-12-23T02:44:41.886872752Z [inf]     ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 78.8/78.8 kB 314.8 MB/s eta 0:00:00
2025-12-23T02:44:41.886929588Z [inf]  
2025-12-23T02:44:41.891643384Z [inf]  Downloading asyncpg-0.31.0-cp311-cp311-manylinux2014_x86_64.manylinux_2_17_x86_64.manylinux_2_28_x86_64.whl (3.0 MB)

2025-12-23T02:44:41.902786464Z [inf]     ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 3.0/3.0 MB 311.7 MB/s eta 0:00:00

2025-12-23T02:44:41.905506898Z [inf]  Downloading sqlalchemy-2.0.45-cp311-cp311-manylinux2014_x86_64.manylinux_2_17_x86_64.manylinux_2_28_x86_64.whl (3.3 MB)

2025-12-23T02:44:41.920203052Z [inf]     ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 3.3/3.3 MB 313.2 MB/s eta 0:00:00

2025-12-23T02:44:41.923117578Z [inf]  Downloading psycopg2_binary-2.9.11-cp311-cp311-manylinux2014_x86_64.manylinux_2_17_x86_64.whl (4.2 MB)

2025-12-23T02:44:41.948138232Z [inf]     ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 4.2/4.2 MB 199.4 MB/s eta 0:00:00

2025-12-23T02:44:41.951208952Z [inf]  Downloading pydantic-2.12.5-py3-none-any.whl (463 kB)

2025-12-23T02:44:41.953753182Z [inf]     ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 463.6/463.6 kB 453.8 MB/s eta 0:00:00
2025-12-23T02:44:41.953816918Z [inf]  
2025-12-23T02:44:41.956692144Z [inf]  Downloading pydantic_core-2.41.5-cp311-cp311-manylinux_2_17_x86_64.manylinux2014_x86_64.whl (2.1 MB)

2025-12-23T02:44:41.965550463Z [inf]     ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 2.1/2.1 MB 279.7 MB/s eta 0:00:00
2025-12-23T02:44:41.965669372Z [inf]  
2025-12-23T02:44:41.968257588Z [inf]  Downloading python_dotenv-1.2.1-py3-none-any.whl (21 kB)

2025-12-23T02:44:41.971009219Z [inf]  Downloading beautifulsoup4-4.14.3-py3-none-any.whl (107 kB)

2025-12-23T02:44:41.972707569Z [inf]     ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 107.7/107.7 kB 431.6 MB/s eta 0:00:00
2025-12-23T02:44:41.972810944Z [inf]  
2025-12-23T02:44:41.975338699Z [inf]  Downloading lxml-6.0.2-cp311-cp311-manylinux_2_26_x86_64.manylinux_2_28_x86_64.whl (5.2 MB)

2025-12-23T02:44:41.988343143Z [inf]     ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 5.2/5.2 MB 454.5 MB/s eta 0:00:00

2025-12-23T02:44:41.990922565Z [inf]  Downloading anthropic-0.75.0-py3-none-any.whl (388 kB)

2025-12-23T02:44:41.993260395Z [inf]     ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 388.2/388.2 kB 456.6 MB/s eta 0:00:00
2025-12-23T02:44:41.993373916Z [inf]  
2025-12-23T02:44:41.995769873Z [inf]  Downloading aiohappyeyeballs-2.6.1-py3-none-any.whl (15 kB)

2025-12-23T02:44:41.998652671Z [inf]  Downloading aiosignal-1.4.0-py3-none-any.whl (7.5 kB)

2025-12-23T02:44:42.001235719Z [inf]  Downloading annotated_doc-0.0.4-py3-none-any.whl (5.3 kB)

2025-12-23T02:44:42.003802843Z [inf]  Downloading annotated_types-0.7.0-py3-none-any.whl (13 kB)

2025-12-23T02:44:42.006347864Z [inf]  Downloading anyio-4.12.0-py3-none-any.whl (113 kB)

2025-12-23T02:44:42.008188127Z [inf]     ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 113.4/113.4 kB 424.2 MB/s eta 0:00:00
2025-12-23T02:44:42.008311922Z [inf]  
2025-12-23T02:44:42.010705015Z [inf]  Downloading attrs-25.4.0-py3-none-any.whl (67 kB)

2025-12-23T02:44:42.012290386Z [inf]     ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 67.6/67.6 kB 391.6 MB/s eta 0:00:00
2025-12-23T02:44:42.012472078Z [inf]  
2025-12-23T02:44:42.015035507Z [inf]  Downloading click-8.3.1-py3-none-any.whl (108 kB)

2025-12-23T02:44:42.016780106Z [inf]     ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 108.3/108.3 kB 423.5 MB/s eta 0:00:00
2025-12-23T02:44:42.016999115Z [inf]  
2025-12-23T02:44:42.019619369Z [inf]  Downloading distro-1.9.0-py3-none-any.whl (20 kB)

2025-12-23T02:44:42.022327805Z [inf]  Downloading docstring_parser-0.17.0-py3-none-any.whl (36 kB)

2025-12-23T02:44:42.025044684Z [inf]  Downloading frozenlist-1.8.0-cp311-cp311-manylinux1_x86_64.manylinux_2_28_x86_64.manylinux_2_5_x86_64.whl (231 kB)

2025-12-23T02:44:42.027231006Z [inf]     ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 231.1/231.1 kB 392.9 MB/s eta 0:00:00

2025-12-23T02:44:42.030677531Z [inf]  Downloading greenlet-3.3.0-cp311-cp311-manylinux_2_24_x86_64.manylinux_2_28_x86_64.whl (590 kB)

2025-12-23T02:44:42.034661782Z [inf]     ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 590.2/590.2 kB 395.3 MB/s eta 0:00:00
2025-12-23T02:44:42.034833099Z [inf]  
2025-12-23T02:44:42.037377439Z [inf]  Downloading h11-0.16.0-py3-none-any.whl (37 kB)

2025-12-23T02:44:42.040380318Z [inf]  Downloading idna-3.11-py3-none-any.whl (71 kB)

2025-12-23T02:44:42.041859268Z [inf]     ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 71.0/71.0 kB 406.8 MB/s eta 0:00:00
2025-12-23T02:44:42.042077626Z [inf]  
2025-12-23T02:44:42.044998231Z [inf]  Downloading jiter-0.12.0-cp311-cp311-manylinux_2_17_x86_64.manylinux2014_x86_64.whl (364 kB)

2025-12-23T02:44:42.047988109Z [inf]     ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 364.6/364.6 kB 454.6 MB/s eta 0:00:00
2025-12-23T02:44:42.048058535Z [inf]  
2025-12-23T02:44:42.050554272Z [inf]  Downloading multidict-6.7.0-cp311-cp311-manylinux2014_x86_64.manylinux_2_17_x86_64.manylinux_2_28_x86_64.whl (246 kB)

2025-12-23T02:44:42.052579443Z [inf]     ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 246.7/246.7 kB 422.4 MB/s eta 0:00:00
2025-12-23T02:44:42.05267781Z [inf]  
2025-12-23T02:44:42.055662852Z [inf]  Downloading propcache-0.4.1-cp311-cp311-manylinux2014_x86_64.manylinux_2_17_x86_64.manylinux_2_28_x86_64.whl (210 kB)

2025-12-23T02:44:42.061514176Z [inf]     ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 210.0/210.0 kB 423.5 MB/s eta 0:00:00

2025-12-23T02:44:42.064483184Z [inf]  Downloading soupsieve-2.8.1-py3-none-any.whl (36 kB)

2025-12-23T02:44:42.067400354Z [inf]  Downloading starlette-0.50.0-py3-none-any.whl (74 kB)

2025-12-23T02:44:42.068899324Z [inf]     ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 74.0/74.0 kB 385.4 MB/s eta 0:00:00

2025-12-23T02:44:42.071864326Z [inf]  Downloading typing_extensions-4.15.0-py3-none-any.whl (44 kB)

2025-12-23T02:44:42.073251388Z [inf]     ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 44.6/44.6 kB 362.7 MB/s eta 0:00:00

2025-12-23T02:44:42.075875898Z [inf]  Downloading typing_inspection-0.4.2-py3-none-any.whl (14 kB)

2025-12-23T02:44:42.078640439Z [inf]  Downloading yarl-1.22.0-cp311-cp311-manylinux2014_x86_64.manylinux_2_17_x86_64.manylinux_2_28_x86_64.whl (365 kB)

2025-12-23T02:44:42.081131989Z [inf]     ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 365.8/365.8 kB 376.9 MB/s eta 0:00:00
2025-12-23T02:44:42.081350878Z [inf]  
2025-12-23T02:44:42.083931102Z [inf]  Downloading certifi-2025.11.12-py3-none-any.whl (159 kB)

2025-12-23T02:44:42.08606133Z [inf]     ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 159.4/159.4 kB 445.0 MB/s eta 0:00:00
2025-12-23T02:44:42.086145587Z [inf]  
2025-12-23T02:44:42.088799751Z [inf]  Downloading sniffio-1.3.1-py3-none-any.whl (10 kB)

2025-12-23T02:44:42.276027191Z [inf]  Installing collected packages: typing-extensions, soupsieve, sniffio, python-dotenv, psycopg2-binary, propcache, multidict, lxml, jiter, idna, h11, greenlet, frozenlist, docstring-parser, distro, click, certifi, attrs, asyncpg, annotated-types, annotated-doc, aiohappyeyeballs, yarl, uvicorn, typing-inspection, sqlalchemy, pydantic-core, httpcore, beautifulsoup4, anyio, aiosignal, starlette, pydantic, httpx, aiohttp, fastapi, anthropic

2025-12-23T02:44:45.443551959Z [inf]  Successfully installed aiohappyeyeballs-2.6.1 aiohttp-3.13.2 aiosignal-1.4.0 annotated-doc-0.0.4 annotated-types-0.7.0 anthropic-0.75.0 anyio-4.12.0 asyncpg-0.31.0 attrs-25.4.0 beautifulsoup4-4.14.3 certifi-2025.11.12 click-8.3.1 distro-1.9.0 docstring-parser-0.17.0 fastapi-0.127.0 frozenlist-1.8.0 greenlet-3.3.0 h11-0.16.0 httpcore-1.0.9 httpx-0.28.1 idna-3.11 jiter-0.12.0 lxml-6.0.2 multidict-6.7.0 propcache-0.4.1 psycopg2-binary-2.9.11 pydantic-2.12.5 pydantic-core-2.41.5 python-dotenv-1.2.1 sniffio-1.3.1 soupsieve-2.8.1 sqlalchemy-2.0.45 starlette-0.50.0 typing-extensions-4.15.0 typing-inspection-0.4.2 uvicorn-0.40.0 yarl-1.22.0

2025-12-23T02:44:46.809967189Z [inf]  [stage-0  6/10] RUN --mount=type=cache,id=s/c14db582-4bcc-4e74-9bbe-c08a3a713830-/root/cache/pip,target=/root/.cache/pip python -m venv --copies /opt/venv && . /opt/venv/bin/activate && pip install -r requirements.txt
2025-12-23T02:44:46.878226608Z [inf]  [stage-0  7/10] COPY . /app/.
2025-12-23T02:44:47.286333672Z [inf]  [stage-0  7/10] COPY . /app/.
2025-12-23T02:44:47.348659303Z [inf]  [stage-0  8/10] RUN  pip install -r requirements.txt
2025-12-23T02:44:48.136031638Z [inf]  Requirement already satisfied: fastapi>=0.104.0 in /opt/venv/lib/python3.11/site-packages (from -r requirements.txt (line 4)) (0.127.0)

2025-12-23T02:44:48.13751134Z [inf]  Requirement already satisfied: uvicorn>=0.24.0 in /opt/venv/lib/python3.11/site-packages (from -r requirements.txt (line 5)) (0.40.0)

2025-12-23T02:44:48.138954406Z [inf]  Requirement already satisfied: aiohttp>=3.9.0 in /opt/venv/lib/python3.11/site-packages (from -r requirements.txt (line 8)) (3.13.2)

2025-12-23T02:44:48.14026233Z [inf]  Requirement already satisfied: httpx>=0.25.0 in /opt/venv/lib/python3.11/site-packages (from -r requirements.txt (line 9)) (0.28.1)

2025-12-23T02:44:48.141527179Z [inf]  Requirement already satisfied: asyncpg>=0.29.0 in /opt/venv/lib/python3.11/site-packages (from -r requirements.txt (line 12)) (0.31.0)

2025-12-23T02:44:48.143102464Z [inf]  Requirement already satisfied: sqlalchemy>=2.0.0 in /opt/venv/lib/python3.11/site-packages (from -r requirements.txt (line 13)) (2.0.45)

2025-12-23T02:44:48.14433225Z [inf]  Requirement already satisfied: psycopg2-binary>=2.9.9 in /opt/venv/lib/python3.11/site-packages (from -r requirements.txt (line 14)) (2.9.11)

2025-12-23T02:44:48.146882148Z [inf]  Requirement already satisfied: pydantic>=2.5.0 in /opt/venv/lib/python3.11/site-packages (from -r requirements.txt (line 17)) (2.12.5)

2025-12-23T02:44:48.148686177Z [inf]  Requirement already satisfied: python-dotenv>=1.0.0 in /opt/venv/lib/python3.11/site-packages (from -r requirements.txt (line 20)) (1.2.1)

2025-12-23T02:44:48.149768391Z [inf]  Requirement already satisfied: beautifulsoup4>=4.12.0 in /opt/venv/lib/python3.11/site-packages (from -r requirements.txt (line 23)) (4.14.3)

2025-12-23T02:44:48.151927002Z [inf]  Requirement already satisfied: lxml>=5.0.0 in /opt/venv/lib/python3.11/site-packages (from -r requirements.txt (line 24)) (6.0.2)

2025-12-23T02:44:48.154359003Z [inf]  Requirement already satisfied: anthropic>=0.7.0 in /opt/venv/lib/python3.11/site-packages (from -r requirements.txt (line 27)) (0.75.0)

2025-12-23T02:44:48.174667313Z [inf]  Requirement already satisfied: starlette<0.51.0,>=0.40.0 in /opt/venv/lib/python3.11/site-packages (from fastapi>=0.104.0->-r requirements.txt (line 4)) (0.50.0)

2025-12-23T02:44:48.17623092Z [inf]  Requirement already satisfied: typing-extensions>=4.8.0 in /opt/venv/lib/python3.11/site-packages (from fastapi>=0.104.0->-r requirements.txt (line 4)) (4.15.0)

2025-12-23T02:44:48.177020316Z [inf]  Requirement already satisfied: annotated-doc>=0.0.2 in /opt/venv/lib/python3.11/site-packages (from fastapi>=0.104.0->-r requirements.txt (line 4)) (0.0.4)

2025-12-23T02:44:48.184804692Z [inf]  Requirement already satisfied: click>=7.0 in /opt/venv/lib/python3.11/site-packages (from uvicorn>=0.24.0->-r requirements.txt (line 5)) (8.3.1)

2025-12-23T02:44:48.185640027Z [inf]  Requirement already satisfied: h11>=0.8 in /opt/venv/lib/python3.11/site-packages (from uvicorn>=0.24.0->-r requirements.txt (line 5)) (0.16.0)

2025-12-23T02:44:48.193445195Z [inf]  Requirement already satisfied: aiohappyeyeballs>=2.5.0 in /opt/venv/lib/python3.11/site-packages (from aiohttp>=3.9.0->-r requirements.txt (line 8)) (2.6.1)

2025-12-23T02:44:48.194392237Z [inf]  Requirement already satisfied: aiosignal>=1.4.0 in /opt/venv/lib/python3.11/site-packages (from aiohttp>=3.9.0->-r requirements.txt (line 8)) (1.4.0)

2025-12-23T02:44:48.195207921Z [inf]  Requirement already satisfied: attrs>=17.3.0 in /opt/venv/lib/python3.11/site-packages (from aiohttp>=3.9.0->-r requirements.txt (line 8)) (25.4.0)

2025-12-23T02:44:48.19641275Z [inf]  Requirement already satisfied: frozenlist>=1.1.1 in /opt/venv/lib/python3.11/site-packages (from aiohttp>=3.9.0->-r requirements.txt (line 8)) (1.8.0)

2025-12-23T02:44:48.197380273Z [inf]  Requirement already satisfied: multidict<7.0,>=4.5 in /opt/venv/lib/python3.11/site-packages (from aiohttp>=3.9.0->-r requirements.txt (line 8)) (6.7.0)

2025-12-23T02:44:48.198466994Z [inf]  Requirement already satisfied: propcache>=0.2.0 in /opt/venv/lib/python3.11/site-packages (from aiohttp>=3.9.0->-r requirements.txt (line 8)) (0.4.1)

2025-12-23T02:44:48.201039076Z [inf]  Requirement already satisfied: yarl<2.0,>=1.17.0 in /opt/venv/lib/python3.11/site-packages (from aiohttp>=3.9.0->-r requirements.txt (line 8)) (1.22.0)

2025-12-23T02:44:48.207979786Z [inf]  Requirement already satisfied: anyio in /opt/venv/lib/python3.11/site-packages (from httpx>=0.25.0->-r requirements.txt (line 9)) (4.12.0)

2025-12-23T02:44:48.208518725Z [inf]  Requirement already satisfied: certifi in /opt/venv/lib/python3.11/site-packages (from httpx>=0.25.0->-r requirements.txt (line 9)) (2025.11.12)

2025-12-23T02:44:48.209883394Z [inf]  Requirement already satisfied: httpcore==1.* in /opt/venv/lib/python3.11/site-packages (from httpx>=0.25.0->-r requirements.txt (line 9)) (1.0.9)

2025-12-23T02:44:48.210574452Z [inf]  Requirement already satisfied: idna in /opt/venv/lib/python3.11/site-packages (from httpx>=0.25.0->-r requirements.txt (line 9)) (3.11)

2025-12-23T02:44:48.240445528Z [inf]  Requirement already satisfied: greenlet>=1 in /opt/venv/lib/python3.11/site-packages (from sqlalchemy>=2.0.0->-r requirements.txt (line 13)) (3.3.0)

2025-12-23T02:44:48.247442683Z [inf]  Requirement already satisfied: annotated-types>=0.6.0 in /opt/venv/lib/python3.11/site-packages (from pydantic>=2.5.0->-r requirements.txt (line 17)) (0.7.0)

2025-12-23T02:44:48.248393931Z [inf]  Requirement already satisfied: pydantic-core==2.41.5 in /opt/venv/lib/python3.11/site-packages (from pydantic>=2.5.0->-r requirements.txt (line 17)) (2.41.5)

2025-12-23T02:44:48.24935248Z [inf]  Requirement already satisfied: typing-inspection>=0.4.2 in /opt/venv/lib/python3.11/site-packages (from pydantic>=2.5.0->-r requirements.txt (line 17)) (0.4.2)

2025-12-23T02:44:48.258416158Z [inf]  Requirement already satisfied: soupsieve>=1.6.1 in /opt/venv/lib/python3.11/site-packages (from beautifulsoup4>=4.12.0->-r requirements.txt (line 23)) (2.8.1)

2025-12-23T02:44:48.270370285Z [inf]  Requirement already satisfied: distro<2,>=1.7.0 in /opt/venv/lib/python3.11/site-packages (from anthropic>=0.7.0->-r requirements.txt (line 27)) (1.9.0)

2025-12-23T02:44:48.271201653Z [inf]  Requirement already satisfied: docstring-parser<1,>=0.15 in /opt/venv/lib/python3.11/site-packages (from anthropic>=0.7.0->-r requirements.txt (line 27)) (0.17.0)

2025-12-23T02:44:48.272477949Z [inf]  Requirement already satisfied: jiter<1,>=0.4.0 in /opt/venv/lib/python3.11/site-packages (from anthropic>=0.7.0->-r requirements.txt (line 27)) (0.12.0)

2025-12-23T02:44:48.273711962Z [inf]  Requirement already satisfied: sniffio in /opt/venv/lib/python3.11/site-packages (from anthropic>=0.7.0->-r requirements.txt (line 27)) (1.3.1)

2025-12-23T02:44:48.706341291Z [inf]  [stage-0  8/10] RUN  pip install -r requirements.txt
2025-12-23T02:44:48.767832289Z [inf]  [stage-0  9/10] RUN printf '\nPATH=/opt/venv/bin:$PATH' >> /root/.profile
2025-12-23T02:44:49.256228623Z [inf]  [stage-0  9/10] RUN printf '\nPATH=/opt/venv/bin:$PATH' >> /root/.profile
2025-12-23T02:44:49.318322827Z [inf]  [stage-0 10/10] COPY . /app
2025-12-23T02:44:49.721095251Z [inf]  [stage-0 10/10] COPY . /app
2025-12-23T02:44:49.789947531Z [inf]  exporting to docker image format
2025-12-23T02:44:54.327678129Z [inf]  exporting to docker image format
2025-12-23T02:44:54.379012679Z [inf]  containerimage.descriptor: eyJtZWRpYVR5cGUiOiJhcHBsaWNhdGlvbi92bmQub2NpLmltYWdlLm1hbmlmZXN0LnYxK2pzb24iLCJkaWdlc3QiOiJzaGEyNTY6NDRmMjZlNDkwNDBkYmM1Y2Y5MzU5NjlmMTZjNTAxOWRlM2JjZjM3NDc0Y2Y2YTBlNzM4ZWZlOWM4NTQ2NWQ0OSIsInNpemUiOjI3NTksImFubm90YXRpb25zIjp7Im9yZy5vcGVuY29udGFpbmVycy5pbWFnZS5jcmVhdGVkIjoiMjAyNS0xMi0yM1QwMjo0NDo1MVoifSwicGxhdGZvcm0iOnsiYXJjaGl0ZWN0dXJlIjoiYW1kNjQiLCJvcyI6ImxpbnV4In19
2025-12-23T02:44:54.379033020Z [inf]  containerimage.config.digest: sha256:900be297452c84537fc9c0f100f0c2acfb2ca02b138660b8aa850292f7f62294
2025-12-23T02:44:54.379035233Z [inf]  containerimage.digest: sha256:44f26e49040dbc5cf935969f16c5019de3bcf37474cf6a0e738efe9c85465d49
2025-12-23T02:45:11.539992663Z [inf]  image push
2025-12-23T02:45:11.540058231Z [inf]  image push
