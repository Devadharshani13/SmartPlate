import requests
import sys
import json
from datetime import datetime, timedelta

class SmartPlateAPITester:
    def __init__(self, base_url=None):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tokens = {}  # Store tokens for different user types
        self.users = {}   # Store user data for different roles
        self.test_data = {}  # Store test data like request IDs
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def log_test(self, name, success, details=""):
        """Log test results"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
        else:
            print(f"❌ {name} - FAILED: {details}")
            self.failed_tests.append(f"{name}: {details}")

    def make_request(self, method, endpoint, data=None, token=None, expected_status=200):
        """Make HTTP request with proper error handling"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if token:
            headers['Authorization'] = f'Bearer {token}'

        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=10)

            success = response.status_code == expected_status
            return success, response.json() if response.content else {}, response.status_code

        except requests.exceptions.RequestException as e:
            return False, {"error": str(e)}, 0
        except json.JSONDecodeError:
            return False, {"error": "Invalid JSON response"}, response.status_code

    def test_user_registration(self):
        """Test user registration for all roles"""
        print("\n🔍 Testing User Registration...")
        
        # Test NGO registration
        ngo_data = {
            "email": f"ngo_test_{datetime.now().strftime('%H%M%S')}@test.com",
            "password": "TestPass123!",
            "name": "Test NGO",
            "role": "ngo",
            "location": "Test City",
            "phone": "1234567890",
            "organization": "Test NGO Organization"
        }
        
        success, response, status = self.make_request('POST', 'auth/register', ngo_data, expected_status=200)
        if success and 'token' in response:
            self.tokens['ngo'] = response['token']
            self.users['ngo'] = response['user']
            self.log_test("NGO Registration", True)
        else:
            self.log_test("NGO Registration", False, f"Status: {status}, Response: {response}")

        # Test Donor registration
        donor_data = {
            "email": f"donor_test_{datetime.now().strftime('%H%M%S')}@test.com",
            "password": "TestPass123!",
            "name": "Test Donor",
            "role": "donor",
            "location": "Test City",
            "phone": "1234567891",
            "donor_type": "restaurant"
        }
        
        success, response, status = self.make_request('POST', 'auth/register', donor_data, expected_status=200)
        if success and 'token' in response:
            self.tokens['donor'] = response['token']
            self.users['donor'] = response['user']
            self.log_test("Donor Registration", True)
        else:
            self.log_test("Donor Registration", False, f"Status: {status}, Response: {response}")

        # Test Volunteer registration
        volunteer_data = {
            "email": f"volunteer_test_{datetime.now().strftime('%H%M%S')}@test.com",
            "password": "TestPass123!",
            "name": "Test Volunteer",
            "role": "volunteer",
            "location": "Test City",
            "phone": "1234567892",
            "transport_mode": "bicycle"
        }
        
        success, response, status = self.make_request('POST', 'auth/register', volunteer_data, expected_status=200)
        if success and 'token' in response:
            self.tokens['volunteer'] = response['token']
            self.users['volunteer'] = response['user']
            self.log_test("Volunteer Registration", True)
        else:
            self.log_test("Volunteer Registration", False, f"Status: {status}, Response: {response}")

    def test_user_login(self):
        """Test user login functionality"""
        print("\n🔍 Testing User Login...")
        
        for role in ['ngo', 'donor', 'volunteer']:
            if role in self.users:
                login_data = {
                    "email": self.users[role]['email'],
                    "password": "TestPass123!"
                }
                
                success, response, status = self.make_request('POST', 'auth/login', login_data, expected_status=200)
                if success and 'token' in response:
                    self.log_test(f"{role.upper()} Login", True)
                else:
                    self.log_test(f"{role.upper()} Login", False, f"Status: {status}, Response: {response}")

    def test_auth_me_endpoint(self):
        """Test the /auth/me endpoint"""
        print("\n🔍 Testing Auth Me Endpoint...")
        
        for role in ['ngo', 'donor', 'volunteer']:
            if role in self.tokens:
                success, response, status = self.make_request('GET', 'auth/me', token=self.tokens[role], expected_status=200)
                if success and 'user_id' in response:
                    self.log_test(f"{role.upper()} Auth Me", True)
                else:
                    self.log_test(f"{role.upper()} Auth Me", False, f"Status: {status}, Response: {response}")

    def test_ngo_food_request_creation(self):
        """Test NGO food request creation"""
        print("\n🔍 Testing NGO Food Request Creation...")
        
        if 'ngo' not in self.tokens:
            self.log_test("NGO Food Request Creation", False, "No NGO token available")
            return

        # Create a food request
        tomorrow = (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d')
        request_data = {
            "food_type": "vegetarian",
            "food_category": "cooked",
            "quantity": 50,
            "quantity_unit": "people",
            "required_date": tomorrow,
            "required_time": "12:00",
            "pickup_location": "Test NGO Location",
            "special_instructions": "Handle with care",
            "people_count": 50
        }
        
        success, response, status = self.make_request('POST', 'ngo/requests', request_data, token=self.tokens['ngo'], expected_status=200)
        if success and 'request_id' in response:
            self.test_data['request_id'] = response['request_id']
            self.log_test("NGO Food Request Creation", True)
        else:
            self.log_test("NGO Food Request Creation", False, f"Status: {status}, Response: {response}")

    def test_ngo_get_requests(self):
        """Test NGO get requests endpoint"""
        print("\n🔍 Testing NGO Get Requests...")
        
        if 'ngo' not in self.tokens:
            self.log_test("NGO Get Requests", False, "No NGO token available")
            return

        success, response, status = self.make_request('GET', 'ngo/requests', token=self.tokens['ngo'], expected_status=200)
        if success and isinstance(response, list):
            self.log_test("NGO Get Requests", True)
        else:
            self.log_test("NGO Get Requests", False, f"Status: {status}, Response: {response}")

    def test_donor_get_available_requests(self):
        """Test donor get available requests"""
        print("\n🔍 Testing Donor Get Available Requests...")
        
        if 'donor' not in self.tokens:
            self.log_test("Donor Get Available Requests", False, "No donor token available")
            return

        success, response, status = self.make_request('GET', 'donor/requests', token=self.tokens['donor'], expected_status=200)
        if success and isinstance(response, list):
            self.log_test("Donor Get Available Requests", True)
        else:
            self.log_test("Donor Get Available Requests", False, f"Status: {status}, Response: {response}")

    def test_donor_accept_request(self):
        """Test donor accepting a food request"""
        print("\n🔍 Testing Donor Accept Request...")
        
        if 'donor' not in self.tokens or 'request_id' not in self.test_data:
            self.log_test("Donor Accept Request", False, "No donor token or request ID available")
            return

        accept_data = {
            "request_id": self.test_data['request_id'],
            "availability_time": (datetime.now() + timedelta(hours=2)).isoformat(),
            "food_condition": "excellent"
        }
        
        success, response, status = self.make_request('POST', 'donor/accept', accept_data, token=self.tokens['donor'], expected_status=200)
        if success:
            self.log_test("Donor Accept Request", True)
        else:
            self.log_test("Donor Accept Request", False, f"Status: {status}, Response: {response}")

    def test_donor_get_my_donations(self):
        """Test donor get my donations"""
        print("\n🔍 Testing Donor Get My Donations...")
        
        if 'donor' not in self.tokens:
            self.log_test("Donor Get My Donations", False, "No donor token available")
            return

        success, response, status = self.make_request('GET', 'donor/my-donations', token=self.tokens['donor'], expected_status=200)
        if success and isinstance(response, list):
            self.log_test("Donor Get My Donations", True)
        else:
            self.log_test("Donor Get My Donations", False, f"Status: {status}, Response: {response}")

    def test_volunteer_get_tasks(self):
        """Test volunteer get tasks"""
        print("\n🔍 Testing Volunteer Get Tasks...")
        
        if 'volunteer' not in self.tokens:
            self.log_test("Volunteer Get Tasks", False, "No volunteer token available")
            return

        success, response, status = self.make_request('GET', 'volunteer/tasks', token=self.tokens['volunteer'], expected_status=200)
        if success and isinstance(response, list):
            self.log_test("Volunteer Get Tasks", True)
        else:
            self.log_test("Volunteer Get Tasks", False, f"Status: {status}, Response: {response}")

    def test_volunteer_update_status(self):
        """Test volunteer status update"""
        print("\n🔍 Testing Volunteer Update Status...")
        
        if 'volunteer' not in self.tokens or 'request_id' not in self.test_data:
            self.log_test("Volunteer Update Status", False, "No volunteer token or request ID available")
            return

        status_data = {
            "request_id": self.test_data['request_id'],
            "status": "picked_up"
        }
        
        success, response, status = self.make_request('POST', 'volunteer/update-status', status_data, token=self.tokens['volunteer'], expected_status=200)
        if success:
            self.log_test("Volunteer Update Status", True)
        else:
            self.log_test("Volunteer Update Status", False, f"Status: {status}, Response: {response}")

    def test_analytics_dashboard(self):
        """Test analytics dashboard endpoint"""
        print("\n🔍 Testing Analytics Dashboard...")
        
        # Test with any available token
        token = self.tokens.get('ngo') or self.tokens.get('donor') or self.tokens.get('volunteer')
        if not token:
            self.log_test("Analytics Dashboard", False, "No token available")
            return

        success, response, status = self.make_request('GET', 'analytics/dashboard', token=token, expected_status=200)
        if success and 'total_requests' in response:
            self.log_test("Analytics Dashboard", True)
        else:
            self.log_test("Analytics Dashboard", False, f"Status: {status}, Response: {response}")

    def test_analytics_trends(self):
        """Test analytics trends endpoint"""
        print("\n🔍 Testing Analytics Trends...")
        
        # Test with any available token
        token = self.tokens.get('ngo') or self.tokens.get('donor') or self.tokens.get('volunteer')
        if not token:
            self.log_test("Analytics Trends", False, "No token available")
            return

        success, response, status = self.make_request('GET', 'analytics/trends', token=token, expected_status=200)
        if success and 'trends' in response:
            self.log_test("Analytics Trends", True)
        else:
            self.log_test("Analytics Trends", False, f"Status: {status}, Response: {response}")

    def test_ngo_confirm_receipt(self):
        """Test NGO confirm receipt"""
        print("\n🔍 Testing NGO Confirm Receipt...")
        
        if 'ngo' not in self.tokens or 'request_id' not in self.test_data:
            self.log_test("NGO Confirm Receipt", False, "No NGO token or request ID available")
            return

        # First update status to delivered
        if 'volunteer' in self.tokens:
            status_data = {
                "request_id": self.test_data['request_id'],
                "status": "delivered"
            }
            self.make_request('POST', 'volunteer/update-status', status_data, token=self.tokens['volunteer'])

        # Then confirm receipt
        confirm_data = {
            "request_id": self.test_data['request_id']
        }
        
        success, response, status = self.make_request('POST', 'ngo/confirm-receipt', confirm_data, token=self.tokens['ngo'], expected_status=200)
        if success:
            self.log_test("NGO Confirm Receipt", True)
        else:
            self.log_test("NGO Confirm Receipt", False, f"Status: {status}, Response: {response}")

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting SmartPlate API Testing...")
        print(f"📍 Testing against: {self.base_url}")
        
        # Test authentication and user management
        self.test_user_registration()
        self.test_user_login()
        self.test_auth_me_endpoint()
        
        # Test NGO functionality
        self.test_ngo_food_request_creation()
        self.test_ngo_get_requests()
        
        # Test Donor functionality
        self.test_donor_get_available_requests()
        self.test_donor_accept_request()
        self.test_donor_get_my_donations()
        
        # Test Volunteer functionality
        self.test_volunteer_get_tasks()
        self.test_volunteer_update_status()
        
        # Test Analytics
        self.test_analytics_dashboard()
        self.test_analytics_trends()
        
        # Test end-to-end flow
        self.test_ngo_confirm_receipt()
        
        # Print summary
        print(f"\n📊 Test Summary:")
        print(f"✅ Tests Passed: {self.tests_passed}/{self.tests_run}")
        print(f"❌ Tests Failed: {len(self.failed_tests)}")
        
        if self.failed_tests:
            print(f"\n🔍 Failed Tests:")
            for failure in self.failed_tests:
                print(f"  - {failure}")
        
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        print(f"\n🎯 Success Rate: {success_rate:.1f}%")
        
        return self.tests_passed == self.tests_run

def main():
    tester = SmartPlateAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())