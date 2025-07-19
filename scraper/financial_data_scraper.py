import json
from selenium import webdriver
from selenium.webdriver.chrome.service import Service as ChromeService
from webdriver_manager.chrome import ChromeDriverManager
from bs4 import BeautifulSoup
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app) # Enable CORS for all routes

def get_soup(url):
    options = webdriver.ChromeOptions()
    options.add_argument('--headless')
    options.add_argument('--no-sandbox') # Required for running in some environments
    options.add_argument('--disable-dev-shm-usage') # Required for running in some environments
    driver = webdriver.Chrome(service=ChromeService(ChromeDriverManager().install()), options=options)
    driver.get(url)
    html = driver.page_source
    driver.quit()
    return BeautifulSoup(html, 'html.parser')

def parse_table(soup, section_id):
    sec = soup.find('section', id=section_id)
    if not sec:
        return None
    table = sec.find('table')
    if not table:
        return None
    headers = [th.get_text(strip=True) for th in table.find_all('th')]
    rows = []
    for tr in table.find_all('tr'):
        cols = [td.get_text(strip=True) for td in tr.find_all('td')]
        if cols:
            rows.append(cols)
    return {"headers": headers, "rows": rows}

def scrape_company(ticker):
    url = f"https://www.screener.in/company/{ticker}/"
    soup = get_soup(url)
    data = {}
    mapping = {
        "peers": "peers",
        "quarters": "quarters",
        "profit-loss": "profit-loss",
        "balance-sheet": "balance-sheet",
        "cashflow": "cashflow",
        "ratios": "ratios",
        "shareholding": "shareholding",
    }
    for key, sec_id in mapping.items():
        data[key] = parse_table(soup, sec_id)
    return data

@app.route('/api/financial_data/<ticker>', methods=['GET'])
def get_financial_data(ticker):
    if not ticker:
        return jsonify({"error": "Ticker is required"}), 400
    
    result = scrape_company(ticker.upper())
    if result:
        return jsonify(result), 200
    else:
        return jsonify({"error": "Could not retrieve data for the given ticker"}), 404

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=5001)