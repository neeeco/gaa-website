#!/usr/bin/env python3
"""
Script to run the RTE live scraper and test the integration
"""

import sys
import os

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from rte_live_scraper import scrape_rte_live_articles

if __name__ == "__main__":
    print("Starting RTE Live Scraper...")
    try:
        scrape_rte_live_articles()
        print("RTE Live Scraper completed successfully!")
    except Exception as e:
        print(f"Error running RTE Live Scraper: {e}")
        sys.exit(1) 