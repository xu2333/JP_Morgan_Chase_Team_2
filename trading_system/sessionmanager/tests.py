from django.test import TestCase

from sessionmanager.sessionmanager import SessionManager, Session

# Create your tests here.
class StaticAnalysis(TestCase):
    pass

class ViewsTester(TestCase):

    def test_index_view(self):
        response = self.client.get('/dashboard/')
        self.assertEqual(response.status_code, 200)


class SessionManagerTester(TestCase):

    def setUp(self):
        self.sm = SessionManager()
        self.sm.start()

    def tearDown(self):
        self.sm.stop_trade_thread()

    def test_add_session(self):
        instrument_id = 0
        quantity = 100
        order_size = 10
        order_discount = 5

        s = Session(instrument_id, quantity, order_size, order_discount)
        
        self.sm.add_session(instrument_id, s)

        # Successfully insert a session
        self.assertEqual(len(self.sm.session_manager), 1)

        # Raise exception for repeated session
        with self.assertRaises(ValueError):
            self.sm.add_session(instrument_id, s)

    def test_remove_session(self):
        sid = 0

        self.removeSession(sid, 'canceled')
        
        self.assertEqual(len(self.sm.session_manager), 0)
        self.assertEqual(len(self.sm.removed_session), 1)

    def test_quote(self):
        quote_json, price = self.sm.quote()

        self.assertEqual(0, 0)

class SessionTester(TestCase):

    # def test_trade(self):
    #     instrument_id = 0
    #     quantity = 100
    #     order_size = 10
    #     order_discount = 5

    #     self.s = Session(instrument_id, quantity, order_size, order_discount)

    pass

