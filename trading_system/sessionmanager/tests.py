from django.test import TestCase

# Create your tests here.
class StaticAnalysis(TestCase):
	pass

class ViewsTester(TestCase):

    def test_index_view(self):
        response = self.client.get('/dashboard')
        self.assertEqual(response.status_code, 200)