## Strategy: Incremental Gap-Fill Scrape

**Approach:**
1. Load the existing 1,366 as a **deduplication filter**
2. Run **Google Maps searches** (via Outscraper or similar) for Coral Gables ZIPs
3. For each result, check against the 1,366 using fuzzy name matching
4. **Only add businesses that aren't already captured**
5. Output a **new incremental CSV** (e.g., `cg_gap_fill_v5.csv`)

This way:
- We don't waste credits re-scraping businesses we already have
- We focus on the **professional services offices, small retail, and cafes** that OSM missed
- Final merge gives us **1,366 + [new gap-fill] = 2,000-2,500+**

***

## What I Need From You

**Before I run the scrape, I need to know your preferred tool:**

### **Option A: Google Maps via Web Search (Free, Manual)**
I can search Google Maps for:
- `"law firms coral gables 33134"`
- `"accounting firms coral gables 33146"`
- `"real estate offices coral gables 33133"`
- etc.

**Pros:** Free, no API limits  
**Cons:** Manual, time-intensive, limited scale (~50-100 businesses per session)

***

### **Option B: Outscraper API (Paid, Scalable)**
You mentioned **Outscraper Runs 1-2** in your production notes. If you have API credits:
- I can generate the **query config** for you to run
- You paste results back, I merge with deduplication

**Pros:** Gets 500-1,000+ businesses in one run  
**Cons:** Requires your Outscraper account/credits

***

### **Option C: SerpApi Google Maps (Paid, Flexible)**
Similar to Outscraper but more flexible query construction.

**Pros:** Good for targeted category searches  
**Cons:** Requires API key

***

### **Option D: Manual List + Web Enrichment**
I search for **"coral gables business directory"** sources (Chamber, YellowPages, Yelp, local directories), scrape names, then enrich with phone/website/category via individual lookups.

**Pros:** Free  
**Cons:** Labor-intensive, slower

***

## My Recommendation

**If you have Outscraper credits:** Let's do **Option B** — I'll generate the query parameters, you run it (or give me temp API access), and I'll merge the results with smart deduplication.

**If no API access:** I'll do **Option A** (manual Google Maps searches) focusing on the **highest-value gaps**:
1. Law firms (biggest gap)
2. Real estate offices
3. Cafes (the ones OSM rate-limited)
4. Accounting/consulting firms
5. Insurance agencies

***

## What Should I Do?

**Pick your path:**
- **"Run manual Google Maps gap-fill"** → I'll search 5-10 high-value categories and extract ~100-200 businesses this session
- **"Generate Outscraper config"** → I'll give you the exact query JSON to run
- **"You have API access, go"** → Give me credentials (temp read/write), I'll execute the full scrape

Which route works for you?

Sources
