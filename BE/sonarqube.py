import os
import json
import requests
import urllib3
from requests.auth import HTTPBasicAuth

# Suppress SSL verification warnings
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# ==========================
# CONFIGURATION
# ==========================

SONAR_HOST = "https://sonarcloud.io"
SONAR_TOKEN = "51c9835e01b91eb9c5834b762aaa51a93f8e33b9"
PROJECT_KEY = "teamfriday7_aifridayfinal"

# Local path to your Git repository
REPO_PATH = r"C:\repo\sonarqube_report"

auth = HTTPBasicAuth(SONAR_TOKEN, "")


# ==========================
# FETCH ALL ISSUES
# ==========================

def fetch_all_issues():
    issues = []
    page = 1
    page_size = 500

    while True:

        url = (
            f"{SONAR_HOST}/api/issues/search"
            f"?componentKeys={PROJECT_KEY}"
            f"&p={page}"
            f"&ps={page_size}"
        )

        response = requests.get(url, auth=auth, verify=False)

        if response.status_code != 200:
            raise Exception(response.text)

        data = response.json()

        issues.extend(data["issues"])

        total = data["paging"]["total"]

        if page * page_size >= total:
            break

        page += 1

    return issues


# ==========================
# FETCH RULE DETAILS
# ==========================

def fetch_rule(rule_key):

    url = f"{SONAR_HOST}/api/rules/show?key={rule_key}"

    response = requests.get(url, auth=auth, verify=False)

    if response.status_code != 200:
        return None

    return response.json()


# ==========================
# READ SOURCE CODE
# ==========================

def read_source(component, line_number):

    """
    Example component:

    my-org_project:src/utils/helper.py
    """

    try:

        relative_path = component.split(":")[-1]

        file_path = os.path.join(REPO_PATH, relative_path)

        if not os.path.exists(file_path):
            return None

        with open(file_path, encoding="utf-8") as f:
            lines = f.readlines()

        start = max(0, line_number - 10)
        end = min(len(lines), line_number + 10)

        snippet = "".join(lines[start:end])

        return snippet

    except Exception:
        return None


# ==========================
# MAIN
# ==========================

def main():

    print("Fetching issues...")

    issues = fetch_all_issues()

    print(f"Found {len(issues)} issues")

    unique_rules = set(issue["rule"] for issue in issues)

    print(f"Unique Rules: {len(unique_rules)}")

    print("Fetching rule details...")

    rule_details = {}

    for rule in unique_rules:
        rule_details[rule] = fetch_rule(rule)

    print("Building report...")

    report = []

    for issue in issues:

        line = issue.get("line", 1)

        snippet = read_source(
            issue["component"],
            line
        )

        report.append(
            {
                "issue_key": issue["key"],
                "severity": issue["severity"],
                "type": issue["type"],
                "message": issue["message"],
                "rule": issue["rule"],
                "file": issue["component"],
                "line": line,
                "status": issue["status"],
                "snippet": snippet,
                "rule_details": rule_details.get(issue["rule"])
            }
        )

    with open("sonar_complete_report.json", "w", encoding="utf-8") as f:
        json.dump(report, f, indent=4, ensure_ascii=False)

    print("Report saved as sonar_complete_report.json")


if __name__ == "__main__":
    main()