from django.test import TestCase

from sessionmanager import SessionManager, Session

# Create your tests here.
class StaticAnalysis(TestCase):
    pass

class ViewsTester(TestCase):

    def test_index_view(self):
        response = self.client.get('/dashboard/')
        self.assertEqual(response.status_code, 200)


class SessionManagerTester(TestCase):

    def setup(self):
        self.sm = SessionManager()

    def test_add_session(self):
        instrument_id = 0
        quantity = 100
        order_size = 10
        order_discount = 5

        s = Session(instrument_id, quantity, order_size, order_discount)
        
        self.sm.add_session(instrument_id, s)

        self.assertEqual(len(self.sm.session_manager), 1)
        self.assertEqual(len(self.sm.session_manager), 1)

    def test_remove_session(self):
        pass

    def test_quote(self):
        pass

class SessionTester(TestCase):

    def test_trade(self):
        instrument_id = 0
        quantity = 100
        order_size = 10
        order_discount = 5

        self.s = Session(instrument_id, quantity, order_size, order_discount)