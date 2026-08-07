from zapv2 import ZAPv2
import time
import json


API_KEY = "12345"

TARGET = "http://localhost:3000"


zap = ZAPv2(
    apikey=API_KEY,
    proxies={
        "http": "http://localhost:8080",
        "https": "http://localhost:8080"
    }
)


# ----------------------
# Spider
# ----------------------

print("Starting Spider")

spider = zap.spider.scan(TARGET)

while int(zap.spider.status(spider)) < 100:
    print(
        "Spider:",
        zap.spider.status(spider)
    )
    time.sleep(5)


print("Spider Completed")


# ----------------------
# Ajax Spider
# ----------------------

print("Starting Ajax Spider")

zap.ajaxSpider.scan(TARGET)

while zap.ajaxSpider.status != "stopped":
    print("Ajax Spider running")
    time.sleep(5)


print("Ajax Completed")


# ----------------------
# Active Scan
# ----------------------

print("Starting Active Scan")

scan = zap.ascan.scan(TARGET)


while int(zap.ascan.status(scan)) < 100:
    print(
        "Active Scan:",
        zap.ascan.status(scan)
    )
    time.sleep(10)


print("Active Scan Completed")


# ----------------------
# Results
# ----------------------

alerts = zap.core.alerts()

print(
    "Issues Found:",
    len(alerts)
)


with open(
    "zap-results.json",
    "w"
) as f:
    json.dump(
        alerts,
        f,
        indent=4
    )


# HTML Report

html = zap.core.htmlreport()

with open(
    "zap-report.html",
    "w",
    encoding="utf-8"
) as f:
    f.write(html)


print("Reports Generated")