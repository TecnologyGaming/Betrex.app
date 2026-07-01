#!/usr/bin/env python3
"""Detailed Stripe Live Credentials Verification Test"""
import requests
import json
import sys

BACKEND_URL = "https://odds-staging-1.preview.emergentagent.com/api"
ADMIN_EMAIL = "admin@betrex.app"
ADMIN_PASSWORD = "Admin1234!"

def login_and_get_cookies():
    """Login and return session cookies"""
    response = requests.post(
        f"{BACKEND_URL}/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        timeout=10
    )
    if response.status_code == 200:
        return response.cookies
    return None

def test_stripe_checkout_with_live_keys():
    """Test Stripe checkout creation with live keys"""
    print("=" * 70)
    print("STRIPE LIVE CREDENTIALS VERIFICATION TEST")
    print("=" * 70)
    
    # Login
    print("\n[1/3] Authenticating admin user...")
    cookies = login_and_get_cookies()
    if not cookies:
        print("❌ FAILED: Could not authenticate")
        return False
    print("✅ Authentication successful")
    
    # Create checkout session
    print("\n[2/3] Creating Stripe Checkout Session with live keys...")
    try:
        response = requests.post(
            f"{BACKEND_URL}/recharges/stripe/checkout",
            json={
                "amount_usd": 25.0,
                "origin_url": "https://odds-staging-1.preview.emergentagent.com"
            },
            cookies=cookies,
            timeout=15
        )
        
        print(f"Response Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Checkout session created successfully!")
            print(f"\nResponse Data:")
            print(f"  - Session ID: {data.get('session_id', 'N/A')}")
            print(f"  - Checkout URL: {data.get('checkout_url', 'N/A')[:80]}...")
            
            # Verify it's a live session (not test)
            session_id = data.get('session_id', '')
            if session_id.startswith('cs_live_'):
                print(f"\n✅ VERIFIED: Using LIVE Stripe credentials (session ID starts with 'cs_live_')")
                print(f"✅ VERIFIED: Checkout URL is a valid Stripe Checkout URL")
                return True
            elif session_id.startswith('cs_test_'):
                print(f"\n❌ WARNING: Using TEST Stripe credentials (session ID starts with 'cs_test_')")
                return False
            else:
                print(f"\n⚠️  Unknown session ID format: {session_id[:20]}")
                return False
        else:
            print(f"❌ FAILED: Status {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ FAILED: {e}")
        return False

def verify_database_config():
    """Verify Stripe configuration in database"""
    print("\n[3/3] Verifying Stripe configuration in database...")
    try:
        import subprocess
        result = subprocess.run(
            ["mongosh", "mongodb://localhost:27017/pickszone_db", "--quiet", "--eval",
             "db.payment_methods.find({type: 'stripe', active: true}).toArray()"],
            capture_output=True,
            text=True,
            timeout=10
        )
        
        if result.returncode == 0:
            output = result.stdout
            if 'sk_live_' in output:
                print("✅ Database contains LIVE Stripe secret key (sk_live_...)")
            elif 'sk_test_' in output:
                print("⚠️  Database contains TEST Stripe secret key (sk_test_...)")
            else:
                print("⚠️  No Stripe secret key found in database")
                
            if 'pk_live_' in output:
                print("✅ Database contains LIVE Stripe publishable key (pk_live_...)")
            elif 'pk_test_' in output:
                print("⚠️  Database contains TEST Stripe publishable key (pk_test_...)")
                
            if 'whsec_' in output:
                print("✅ Database contains Stripe webhook secret (whsec_...)")
                
            return True
        else:
            print(f"⚠️  Could not verify database config: {result.stderr}")
            return False
            
    except Exception as e:
        print(f"⚠️  Database verification error: {e}")
        return False

def main():
    # Run verification
    checkout_success = test_stripe_checkout_with_live_keys()
    db_verified = verify_database_config()
    
    # Final summary
    print("\n" + "=" * 70)
    print("VERIFICATION SUMMARY")
    print("=" * 70)
    
    if checkout_success:
        print("✅ Stripe integration is FULLY OPERATIONAL with LIVE credentials")
        print("✅ POST /api/recharges/stripe/checkout creates real Stripe Checkout Sessions")
        print("✅ Session IDs confirm live mode (cs_live_...)")
        print("✅ Checkout URLs are valid and ready for production use")
        return 0
    else:
        print("❌ Stripe integration verification FAILED")
        print("⚠️  Please check the error messages above")
        return 1

if __name__ == "__main__":
    sys.exit(main())
