from playwright.sync_api import sync_playwright
import re, json, os
from datetime import datetime
from supabase import create_client, Client
from dotenv import load_dotenv
load_dotenv()

# Initialize Supabase client with minimal options
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("Missing Supabase credentials. Please set SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env or .env.local file")

supabase: Client = create_client(
    supabase_url=SUPABASE_URL,
    supabase_key=SUPABASE_KEY
)

def get_team_info(team_name):
    # Simple function to normalize team names
    return {
        "name": team_name.strip()
    }

def extract_live_update_info(text):
    print(f"Processing text: {text}")  # Debug log
    # Matches: "67 mins: Kilkenny 2-20 Galway 1-18" or "70+2 mins: ..."
    full_time_keywords = ["FT:", "Full-time:", "Full time:", "Full-time", "FT"]
    halftime_keywords = ["Half-time", "Half time", "HT:", "HT"]

    # First check if it signals end of match
    is_final = any(keyword.lower() in text.lower() for keyword in full_time_keywords)
    is_halftime = any(keyword.lower() in text.lower() for keyword in halftime_keywords)

    # Multiple patterns to match different score formats
    patterns = [
        # Pattern 1: "67 mins: Kilkenny 2-20 Galway 1-18" or "70+2 mins: ..."
        r"(\d+)(?:\+(\d+))?\s+mins:\s+(.+?)\s+(\d+-\d+)\s+(.+?)\s+(\d+-\d+)",
        # Pattern 2: "Kerry 1-03 Cavan 0-02" (simple score format)
        r"(.+?)\s+(\d+-\d+)\s+(.+?)\s+(\d+-\d+)",
        # Pattern 3: "Team1 1-2 Team2 0-1" (without mins)
        r"(.+?)\s+(\d+-\d+)\s+(.+?)\s+(\d+-\d+)",
    ]

    for pattern in patterns:
        match = re.search(pattern, text)
        if match:
            if pattern == patterns[0]:  # First pattern with minutes
                base_minute = int(match.group(1))
                extra_minute = int(match.group(2)) if match.group(2) else 0
                minute = base_minute + extra_minute
                home_team_name = match.group(3).strip()
                home_score = match.group(4)
                away_team_name = match.group(5).strip()
                away_score = match.group(6)
            else:  # Other patterns without minutes
                minute = None
                home_team_name = match.group(1).strip()
                home_score = match.group(2)
                away_team_name = match.group(3).strip()
                away_score = match.group(4)

            # Clean up team names (remove extra whitespace and common prefixes)
            home_team_name = re.sub(r'^\s*', '', home_team_name)
            away_team_name = re.sub(r'^\s*', '', away_team_name)

            home = get_team_info(home_team_name)
            away = get_team_info(away_team_name)

            return {
                "minute": minute,
                "home_team": home["name"],
                "home_score": home_score,
                "away_team": away["name"],
                "away_score": away_score,
                "is_final": is_final,
                "timestamp": datetime.now().isoformat()
            }

    return None

def generate_match_key(home, away):
    return f"{home} vs {away}"

def scrape_rte_live_articles():
    urls = [
        "https://www.rte.ie/sport/football/",
        "https://www.rte.ie/sport/hurling/"
    ]

    updates_by_match = {}
    last_minute_by_match = {}
    print("\n=== Starting RTE Live Scraper ===")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        for url in urls:
            print(f"\n📰 Scraping URL: {url}")
            page.goto(url, timeout=30000)
            page.wait_for_selector("span[title]", timeout=5000)

            titles = page.locator("span[title]")
            count = titles.count()
            print(f"🔍 Found {count} titles on page")

            live_articles_found = 0
            for i in range(count):
                try:
                    title_text = titles.nth(i).get_attribute("title", timeout=5000)
                except Exception as e:
                    print(f"❌ Error getting title {i}: {e}")
                    continue

                if title_text and any(keyword in title_text.lower() for keyword in ["live", "recap", "updates", "minute", "score"]):
                    live_articles_found += 1
                    print(f"\n📌 Found live article: {title_text}")
                    
                    article_element = titles.nth(i).locator("xpath=ancestor::a")
                    article_url = article_element.get_attribute("href")
                    if article_url and article_url.startswith("/"):
                        article_url = "https://www.rte.ie" + article_url

                    print(f"🔗 Article URL: {article_url}")
                    page.goto(article_url)
                    try:
                        page.wait_for_selector(".tracker-post-body", timeout=1000)
                        while True:
                            try:
                                show_more_button = page.locator("text=Show More")
                                if show_more_button.count() > 0:
                                    show_more_button.click()
                                    page.wait_for_timeout(500)
                                else:
                                    break
                            except Exception as e:
                                print(f"ℹ️ No more 'Show More' buttons or error: {e}")
                                break

                        updates = page.locator(".tracker-post-body, .live-update, .match-update")
                        update_count = updates.count()
                        print(f"📊 Found {update_count} updates in article")

                        valid_updates = 0
                        for j in range(update_count):
                            update_text = updates.nth(j).inner_text()
                            info = extract_live_update_info(update_text)
                            if info:
                                valid_updates += 1
                                match_key = None
                                if info["home_team"] and info["away_team"]:
                                    match_key = generate_match_key(info["home_team"], info["away_team"])
                                    print(f"🏆 Found match update: {match_key} - Minute {info.get('minute')} - Score: {info.get('home_score')} vs {info.get('away_score')}")
                                elif info["is_halftime"]:
                                    if updates_by_match:
                                        match_key = list(updates_by_match.keys())[-1]
                                    else:
                                        continue

                                if match_key:
                                    if match_key not in updates_by_match:
                                        updates_by_match[match_key] = []
                                        last_minute_by_match[match_key] = -1
                                    if info["minute"] is None or info["minute"] >= last_minute_by_match[match_key]:
                                        updates_by_match[match_key].append(info)
                                        if info["minute"] is not None:
                                            last_minute_by_match[match_key] = info["minute"]

                        print(f"✅ Processed {valid_updates} valid updates from article")
                    except Exception as e:
                        print(f"❌ Error processing article: {str(e)}")
                        continue

            print(f"\n📈 Summary for {url}:")
            print(f"- Found {live_articles_found} live articles")
            print(f"- Total matches found: {len(updates_by_match)}")

        browser.close()

        print("\n=== Final Results ===")
        print(f"Total matches found: {len(updates_by_match)}")
        for match_key, updates in updates_by_match.items():
            print(f"\nMatch: {match_key}")
            print(f"Number of updates: {len(updates)}")
            if updates:
                latest = sorted(updates, key=lambda u: (u.get('minute') or 0, u.get('timestamp')))[-1]
                print(f"Latest update: Minute {latest.get('minute')} - Score: {latest.get('home_score')} vs {latest.get('away_score')}")

        try:
            save_live_scores_to_supabase(updates_by_match)
            print("\n✅ Successfully saved latest live scores to Supabase")
        except Exception as e:
            print(f"\n❌ Error saving live scores to Supabase: {e}")

def save_live_scores_to_supabase(updates_by_match):
    print("\n=== Saving to Supabase ===")
    total_updates = 0
    total_matches = 0

    # First, save all updates to live_updates table
    for match_key, updates in updates_by_match.items():
        if not updates:
            continue
            
        total_matches += 1
        print(f"\nSaving updates for match: {match_key}")
        # Insert all updates
        for update in updates:
            try:
                supabase.table('live_updates').insert({
                    'match_key': match_key,
                    'minute': update.get('minute'),
                    'home_team': update['home_team'],
                    'away_team': update['away_team'],
                    'home_score': update.get('home_score'),
                    'away_score': update.get('away_score'),
                    'is_final': update.get('is_final', False),
                    'timestamp': update.get('timestamp', datetime.now().isoformat())
                }).execute()
                total_updates += 1
            except Exception as e:
                print(f"❌ Error inserting update for {match_key}: {e}")

    print(f"\nSaved {total_updates} updates for {total_matches} matches to live_updates table")

    # Then, update the latest scores in live_scores table
    print("\nUpdating latest scores in live_scores table...")
    for match_key, updates in updates_by_match.items():
        if not updates:
            continue
            
        latest = sorted(updates, key=lambda u: (u.get('minute') or 0, u.get('timestamp')))[-1]
        try:
            # Use upsert with proper conflict resolution
            result = supabase.table('live_scores').upsert({
                'match_key': match_key,
                'home_team': latest['home_team'],
                'away_team': latest['away_team'],
                'home_score': latest.get('home_score'),
                'away_score': latest.get('away_score'),
                'minute': latest.get('minute'),
                'is_final': latest.get('is_final', False),
                'updated_at': latest.get('timestamp', datetime.now().isoformat())
            }, {
                'onConflict': 'match_key'
            }).execute()
            print(f"✅ Updated latest score for {match_key}: {latest.get('home_score')} vs {latest.get('away_score')}")
        except Exception as e:
            print(f"❌ Error upserting latest score for {match_key}: {e}")
            # Try alternative approach - delete and insert
            try:
                print(f"🔄 Trying delete and insert for {match_key}")
                # Delete existing record
                supabase.table('live_scores').delete().eq('match_key', match_key).execute()
                # Insert new record
                supabase.table('live_scores').insert({
                    'match_key': match_key,
                    'home_team': latest['home_team'],
                    'away_team': latest['away_team'],
                    'home_score': latest.get('home_score'),
                    'away_score': latest.get('away_score'),
                    'minute': latest.get('minute'),
                    'is_final': latest.get('is_final', False),
                    'updated_at': latest.get('timestamp', datetime.now().isoformat())
                }).execute()
                print(f"✅ Successfully updated score for {match_key} using delete/insert")
            except Exception as e2:
                print(f"❌ Failed to update score for {match_key} even with delete/insert: {e2}")

if __name__ == "__main__":
    scrape_rte_live_articles()

