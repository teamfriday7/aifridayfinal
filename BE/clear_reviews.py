import os
import sys

# Add the current directory to sys.path to allow importing from app
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app.models import CodeReview

def clear_reviews():
    db = SessionLocal()
    try:
        deleted_count = db.query(CodeReview).delete()
        db.commit()
        print(f"Successfully deleted {deleted_count} reviews from the database.")
    except Exception as e:
        print(f"Error clearing reviews: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    clear_reviews()
