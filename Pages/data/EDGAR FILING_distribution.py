import os
import requests
import re
import time  # for delay

# ======================================
# 🧩 CONFIGURATION — CHANGE THESE VALUES
# ======================================
TICKER = "ADD TICKER HERE"  # e.g., "NVDA"
FILE_TYPE = ""   # e.g. "10-Q" for quarterly, "10-K" for annual filings; leave blank for all
NUM_FILINGS = 1  # Number of most recent filings to retrieve
USER_AGENT = "UPDATE USER INFO & CONTACT"  # Contact info. REQUIRED by SEC
DOWNLOAD_FOLDER = r"COPY PATH OF FOLDER"  # destination folder for files

HEADERS = {"User-Agent": USER_AGENT}

# ======================================
# 🔍 Get the SEC's ticker-to-CIK mapping
# ======================================
def get_cik_from_ticker(ticker):
    ticker_lower = ticker.lower()
    url = "https://www.sec.gov/files/company_tickers.json"
    resp = requests.get(url, headers=HEADERS)
    resp.raise_for_status()
    data = resp.json()

    for entry in data.values():
        if entry["ticker"].lower() == ticker_lower:
            return str(entry["cik_str"]).zfill(10)

    raise ValueError(f"Ticker {ticker} not found in SEC mapping.")


# ======================================
# 📄 Get N most recent filing URLs for given CIK + form type
# ======================================
def get_recent_filing_urls(cik, form_type, n=1):
    cik = str(cik).zfill(10)
    url = f"https://data.sec.gov/submissions/CIK{cik}.json"
    resp = requests.get(url, headers=HEADERS)
    if resp.status_code == 404:
        raise ValueError(f"❌ Submissions JSON not found for CIK {cik}.")
    resp.raise_for_status()
    data = resp.json()

    forms = data["filings"]["recent"]["form"]
    accession_numbers = data["filings"]["recent"]["accessionNumber"]
    primary_docs = data["filings"]["recent"]["primaryDocument"]

    urls = []
    for form, acc_no, doc in zip(forms, accession_numbers, primary_docs):
        if not form_type or form == form_type:
            acc_no_nodash = acc_no.replace("-", "")
            filing_url = (
                f"https://www.sec.gov/Archives/edgar/data/"
                f"{int(cik)}/{acc_no_nodash}/{doc}"
            )
            urls.append((filing_url, form))
            if len(urls) >= n:
                break

    if not urls:
        raise ValueError(
            f"No filings found for CIK {cik} and form type '{form_type or 'ANY'}'."
        )

    return urls


# ======================================
# 📥 Download filing HTML only (no Excel)
# ======================================
def download_filing_html_only(
    ticker, form_type=FILE_TYPE, num_filings=NUM_FILINGS, folder=DOWNLOAD_FOLDER
):
    os.makedirs(folder, exist_ok=True)

    print(f"🔎 Fetching CIK for ticker {ticker}...")
    cik = get_cik_from_ticker(ticker)

    print(
        f"🔗 Looking up {num_filings} most recent {form_type or 'ANY'} filings for CIK {cik}..."
    )
    filings = get_recent_filing_urls(cik, form_type, n=num_filings)

    results = []

    for idx, (filing_url, actual_form) in enumerate(filings, start=1):
        base = filing_url.split("/")[-1]
        base_clean = re.sub(r"\b{}\b".format(ticker.lower()), "", base, flags=re.IGNORECASE)
        base_clean = re.sub(r"[_\-]+", "_", base_clean)
        match = re.search(r"(\d{8})", base_clean)
        filing_date = match.group(1) if match else f"unknown_date_{idx}"

        html_filename = f"{ticker}_{actual_form}_{filing_date}.html"
        html_path = os.path.join(folder, html_filename)

        print(f"⬇️  Downloading filing {idx}/{num_filings}: {filing_url} ({actual_form})")
        resp = requests.get(filing_url, headers=HEADERS)
        resp.raise_for_status()

        with open(html_path, "wb") as f:
            f.write(resp.content)

        print(f"✅ HTML filing saved to: {html_path}")

        results.append(html_path)
        time.sleep(0.5)  # ⏱ polite SEC delay

    return results


# ======================================
# 🚀 Run script
# ======================================
if __name__ == "__main__":
    download_filing_html_only(TICKER)
