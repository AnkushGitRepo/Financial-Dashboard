from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from bs4 import BeautifulSoup
from pymongo import MongoClient, UpdateOne
from dotenv import load_dotenv
import os
import time
from datetime import datetime
import sys

# Load environment variables from .env file
load_dotenv()

# Setup Chrome in headless mode
options = Options()
options.add_argument('--headless')
options.add_argument('--no-sandbox')
options.add_argument('--disable-gpu')

# Get the MongoDB URI from environment variables
mongo_uri = os.getenv("MONGO_URI")
if not mongo_uri:
    print("Error: MONGO_URI not found in environment variables.", file=sys.stderr)
    sys.exit(1)

# Initialize driver and MongoDB client outside try-except for broader scope
driver = None
client = None

try:
    # Connect to MongoDB
    client = MongoClient(mongo_uri)
    db = client.get_database("financial-dashboard")  # You can change this to your preferred db name
    collection = db.ipo_data

    driver = webdriver.Chrome(options=options)
    driver.get("https://ipopremium.in/")

    # Wait for table to load
    time.sleep(7)  # Adjust if your network is slow

    # Parse the page source with BeautifulSoup
    soup = BeautifulSoup(driver.page_source, "html.parser")
    table = soup.find("table", {"id": "table_ajax"})

    if not table:
        print("Error: Could not find the IPO data table on the page.", file=sys.stderr)
        sys.exit(1)

    rows = table.find("tbody").find_all("tr")
    
    # Limit to 50 rows as per original script, but ensure we don't go out of bounds
    rows_to_process = rows[:50] if len(rows) > 50 else rows

    operations = []
    for row in rows_to_process:
        cols = row.find_all("td")
        if len(cols) < 8:
            print(f"Warning: Skipping row due to insufficient columns: {row.get_text(strip=True)}", file=sys.stderr)
            continue

        company_name = cols[0].get_text(strip=True)
        
        # Convert date strings to datetime objects for proper sorting
        try:
            open_date = datetime.strptime(cols[2].get_text(strip=True), '%b %d, %Y')
            close_date = datetime.strptime(cols[3].get_text(strip=True), '%b %d, %Y')
            allotment_date = datetime.strptime(cols[6].get_text(strip=True), '%b %d, %Y')
            listing_date = datetime.strptime(cols[7].get_text(strip=True), '%b %d, %Y')
        except ValueError as e:
            print(f"Warning: Skipping row for '{company_name}' due to date parsing error: {e}", file=sys.stderr)
            continue
        except IndexError as e:
            print(f"Warning: Skipping row for '{company_name}' due to missing date column: {e}", file=sys.stderr)
            continue

        ipo_data = {
            "Company Name": company_name,
            "Premium": cols[1].get_text(strip=True),
            "Open": open_date,
            "Close": close_date,
            "Price": cols[4].get_text(strip=True),
            "Lot Size": cols[5].get_text(strip=True),
            "Allotment Date": allotment_date,
            "Listing Date": listing_date
        }

        # Use "Company Name" as the unique identifier for the upsert operation
        operations.append(
            UpdateOne({"Company Name": company_name}, {"$set": ipo_data}, upsert=True)
        )

    # Bulk write the operations to the database
    if operations:
        collection.bulk_write(operations)
        print(f"Successfully upserted {len(operations)} IPO records.")
    else:
        print("No IPO records to upsert.", file=sys.stderr)

except Exception as e:
    print(f"An unexpected error occurred during scraping: {e}", file=sys.stderr)
    sys.exit(1)
finally:
    if driver:
        driver.quit()
    if client:
        client.close()
